/**
 * A small engine for ICU transform rules (https://unicode.org/reports/tr35/tr35-general.html),
 * enough to run CLDR's Zawgyi rules unchanged: variables, sets, groups, quantifiers, `^` and `$`,
 * the cursor `|` and `::Null;` between phases. It keeps ICU's semantics where they matter:
 *
 * - rules are tried in order at each position, and the first match wins;
 * - after a replacement the cursor moves past it, unless the output has a `|`;
 * - quantifiers are greedy and never give anything back, unlike a regular expression, so
 *   `[ab]* b` can't match.
 *
 * Text lives in a gap buffer (what is done, and the rest reversed), so a long document costs one
 * pass per phase rather than a copy per replacement.
 */

type Range = readonly [low: number, high: number];

interface CharSet {
  ranges: Range[];
  negated: boolean;
}

interface Item {
  set: CharSet;
  min: number;
  max: number;
}

interface Rule {
  atStart: boolean;
  atEnd: boolean;
  items: Item[];
  /** Capture groups, as [first item, end item). */
  groups: (readonly [number, number])[];
  /** Literal code units, or the number of a capture group as a string. */
  output: (number | string)[];
  /** Where `|` leaves the cursor, as an index into output; output.length if there is none. */
  cursor: number;
}

interface Phase {
  /** The rules to try for a first code unit, in order. */
  byFirst: Map<number, Rule[]>;
  /** The rules to try for any other code unit. */
  any: Rule[];
}

const has = (set: CharSet, ch: number) =>
  set.ranges.some(([low, high]) => ch >= low && ch <= high) !== set.negated;

class Parser {
  i = 0;
  readonly s: string;

  constructor(s: string) {
    this.s = s;
  }

  more() {
    while (/\s/.test(this.s[this.i] ?? "")) this.i++;
    return this.i < this.s.length;
  }

  char(): number {
    if (this.s[this.i] === "\\") {
      const hex = /^\\u([0-9a-fA-F]{4})/.exec(this.s.slice(this.i, this.i + 6));
      if (!hex) throw new Error(`Bad escape in ${this.s}`);
      this.i += 6;
      return parseInt(hex[1]!, 16);
    }
    return this.s.charCodeAt(this.i++);
  }

  set(): CharSet {
    this.i++; // [
    const negated = this.s[this.i] === "^";
    if (negated) this.i++;
    const ranges: Range[] = [];
    while (this.s[this.i] !== "]") {
      if (this.i >= this.s.length) throw new Error(`Unclosed set in ${this.s}`);
      if (/\s/.test(this.s[this.i]!)) {
        this.i++;
      } else if (this.s[this.i] === "[") {
        ranges.push(...this.set().ranges);
      } else {
        const low = this.char();
        if (this.s[this.i] === "-" && this.s[this.i + 1] !== "]") {
          this.i++;
          ranges.push([low, this.char()]);
        } else {
          ranges.push([low, low]);
        }
      }
    }
    this.i++; // ]
    return { ranges, negated };
  }
}

function parseSide(text: string): Omit<Rule, "output" | "cursor"> {
  const p = new Parser(text);
  const items: Item[] = [];
  const groups: (readonly [number, number])[] = [];
  let atStart = false;
  let atEnd = false;
  let open = -1;
  while (p.more()) {
    const c = p.s[p.i]!;
    if (c === "^") {
      atStart = true;
      p.i++;
    } else if (c === "$") {
      atEnd = true;
      p.i++;
    } else if (c === "(") {
      open = items.length;
      p.i++;
    } else if (c === ")") {
      groups.push([open, items.length]);
      p.i++;
    } else if ("+*?".includes(c)) {
      const last = items.at(-1)!;
      last.min = c === "+" ? 1 : 0;
      last.max = c === "?" ? 1 : Infinity;
      p.i++;
    } else if (c === "[") {
      items.push({ set: p.set(), min: 1, max: 1 });
    } else {
      const ch = p.char();
      items.push({ set: { ranges: [[ch, ch]], negated: false }, min: 1, max: 1 });
    }
  }
  return { atStart, atEnd, items, groups };
}

function parseRule(left: string, right: string): Rule {
  const rule: Rule = { ...parseSide(left), output: [], cursor: -1 };
  const p = new Parser(right);
  while (p.more()) {
    const c = p.s[p.i]!;
    if (c === "|") {
      rule.cursor = rule.output.length;
      p.i++;
    } else if (c === "$") {
      rule.output.push(p.s[p.i + 1]!);
      p.i += 2;
    } else {
      rule.output.push(p.char());
    }
  }
  if (rule.cursor < 0) rule.cursor = rule.output.length;
  return rule;
}

/** Every code unit a rule can start with, or null if it can start with any. */
function firstUnits(rule: Rule): number[] | null {
  const first = rule.items[0]!;
  if (first.min === 0 || first.set.negated) return null;
  return first.set.ranges.flatMap(([low, high]) =>
    Array.from({ length: high - low + 1 }, (_, n) => low + n),
  );
}

function indexPhase(rules: readonly Rule[]): Phase {
  const starts = rules.map(firstUnits);
  const byFirst = new Map<number, Rule[]>();
  for (const unit of new Set(starts.flatMap((units) => units ?? []))) {
    byFirst.set(
      unit,
      rules.filter((_, i) => starts[i]?.includes(unit) ?? true),
    );
  }
  return { byFirst, any: rules.filter((_, i) => starts[i] === null) };
}

function parseRules(source: string): Phase[] {
  const defs = new Map<string, string>();
  const expand = (s: string) =>
    s.replace(/\$([a-zA-Z]\w*)/g, (_, name: string) => {
      const value = defs.get(name);
      if (value === undefined) throw new Error(`Undefined $${name}`);
      return value;
    });
  const phases: Rule[][] = [[]];
  for (const raw of source.replace(/#.*$/gm, "").split(";")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "::Null") {
      phases.push([]);
      continue;
    }
    const def = /^\$(\w+)\s*=\s*([\s\S]*)$/.exec(line);
    if (def) {
      defs.set(def[1]!, expand(def[2]!));
      continue;
    }
    const arrow = /[→>]/.exec(line);
    if (!arrow) throw new Error(`No arrow in ${line}`);
    const left = line.slice(0, arrow.index);
    const right = line.slice(arrow.index + 1);
    phases.at(-1)!.push(parseRule(expand(left), expand(right)));
  }
  return phases.filter((rules) => rules.length).map(indexPhase);
}

/** Matches a rule at the top of `rest`, filling `ends` with how far each item reached. */
function match(rule: Rule, rest: number[], done: number, ends: number[]): boolean {
  if (rule.atStart && done !== 0) return false;
  let at = rest.length - 1;
  for (let n = 0; n < rule.items.length; n++) {
    const { set, min, max } = rule.items[n]!;
    let count = 0;
    while (count < max && at >= 0 && has(set, rest[at]!)) {
      at--;
      count++;
    }
    if (count < min) return false;
    ends[n] = rest.length - 1 - at;
  }
  return !rule.atEnd || at < 0;
}

/**
 * The replacement for a rule that has just matched at the top of `rest`, and how much of it the
 * cursor moves past.
 */
function outputOf(rule: Rule, rest: readonly number[], ends: readonly number[]) {
  const out: number[] = [];
  const top = rest.length - 1;
  let cursor = -1;
  for (const [i, part] of rule.output.entries()) {
    if (i === rule.cursor) cursor = out.length;
    if (typeof part === "number") {
      out.push(part);
      continue;
    }
    const [first, end] = rule.groups[Number(part) - 1]!;
    const from = first === 0 ? 0 : ends[first - 1]!;
    const to = ends[end - 1]!;
    for (let n = from; n < to; n++) out.push(rest[top - n]!);
  }
  return { out, cursor: cursor < 0 ? out.length : cursor };
}

function runPhase(phase: Phase, input: string): string {
  const done: number[] = [];
  const rest: number[] = [];
  for (let i = input.length - 1; i >= 0; i--) rest.push(input.charCodeAt(i));
  const ends: number[] = [];
  // A rule that keeps the cursor put could loop for ever on bad data; ICU has the same guard.
  let budget = (rest.length + 1) << 6;
  while (rest.length && budget-- > 0) {
    const rules = phase.byFirst.get(rest[rest.length - 1]!) ?? phase.any;
    const rule = rules.find((r) => match(r, rest, done.length, ends));
    if (!rule) {
      done.push(rest.pop()!);
      continue;
    }
    const { out, cursor } = outputOf(rule, rest, ends);
    rest.length -= ends[rule.items.length - 1]!;
    for (let n = out.length - 1; n >= cursor; n--) rest.push(out[n]!);
    for (let n = 0; n < cursor; n++) done.push(out[n]!);
  }
  while (rest.length) done.push(rest.pop()!);
  let text = "";
  const CHUNK = 8192;
  for (let i = 0; i < done.length; i += CHUNK) {
    text += String.fromCharCode(...done.slice(i, i + CHUNK));
  }
  return text;
}

/**
 * Compiles rules into a function, on the first call. `^` and `$` mean the two ends of the string
 * it is given.
 */
export function transliterator(source: string): (text: string) => string {
  let phases: Phase[] | undefined;
  return (text) => {
    phases ??= parseRules(source);
    return phases.reduce((out, phase) => runPhase(phase, out), text);
  };
}

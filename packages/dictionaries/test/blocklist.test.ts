/**
 * data/<code>/blocked.txt is what src/blocklist.ts makes from the vendored lists (plan item
 * 8.1). Refresh with BLOCKLIST_WRITE=1.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOCKLIST_HEADER, isBlocked, readBlocklist } from "../src/blocked.ts";
import { blocklists } from "../src/blocklist.ts";

const DATA = new URL("../data/", import.meta.url);
const lists = [...blocklists()].filter(([code]) => existsSync(new URL(`${code}/`, DATA)));

describe("typing-practice blocklists", () => {
  it.each(lists)("%s is up to date", (code, words) => {
    const file = new URL(`${code}/blocked.txt`, DATA);
    const text = BLOCKLIST_HEADER + words.join("\n") + "\n";
    if (process.env.BLOCKLIST_WRITE) writeFileSync(file, text);
    expect(readFileSync(file, "utf8")).toBe(text);
  });

  it("matches whole words and phrases, in any case", () => {
    const list = readBlocklist("# x\nbad\nvery bad\n");
    expect(isBlocked("This is Bad.", list)).toBe(true);
    expect(isBlocked("It was very  bad!", list)).toBe(true);
    expect(isBlocked("Badminton is fun.", list)).toBe(false);
    expect(isBlocked("Very good, not bad", list)).toBe(true);
  });
});

import { useState } from "react";
import { recognitionCtor, type Recognition } from "../keyboard/voice";

/**
 * Owner's check of which speech locales a browser transcribes in the script Likho types
 * (plan item 6.7). Say a sentence for each locale; the result is classified by script and
 * the table can be copied into the notes. Nothing is stored or sent by this page.
 */
const LOCALES: readonly [tag: string, language: string, script: string][] = [
  ["ur-PK", "Urdu", "Arabic"],
  ["ur-IN", "Urdu", "Arabic"],
  ["ar-SA", "Arabic", "Arabic"],
  ["ar-EG", "Arabic", "Arabic"],
  ["ar-MA", "Arabic", "Arabic"],
  ["fa-IR", "Persian", "Arabic"],
  ["ps-AF", "Pashto", "Arabic"],
  ["sd-IN", "Sindhi", "Arabic"],
  ["pa-PK", "Punjabi (Shahmukhi)", "Arabic"],
  ["pa-IN", "Punjabi", "Arabic"],
  ["hi-IN", "Hindi", "Devanagari"],
  ["bn-BD", "Bangla", "Bengali"],
  ["bn-IN", "Bangla", "Bengali"],
];

const SCRIPTS: readonly [name: string, re: RegExp][] = [
  ["Arabic", /\p{Script=Arabic}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Bengali", /\p{Script=Bengali}/u],
  ["Gurmukhi", /\p{Script=Gurmukhi}/u],
  ["Latin", /\p{Script=Latin}/u],
];

function scriptOf(text: string): string {
  return SCRIPTS.find(([, re]) => re.test(text))?.[0] ?? "none";
}

interface Result {
  transcript: string;
  script: string;
  error?: string;
}

const BTN =
  "inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm text-text hover:bg-surface-2 disabled:opacity-50";

export default function VoiceProbe() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const Ctor = typeof window === "undefined" ? null : recognitionCtor();

  const probe = (tag: string) => {
    if (!Ctor) return;
    const r: Recognition = new Ctor();
    r.lang = tag;
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    setActive(tag);
    r.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setResults((all) => ({ ...all, [tag]: { transcript, script: scriptOf(transcript) } }));
    };
    r.onerror = (event) =>
      setResults((all) => ({
        ...all,
        [tag]: { transcript: "", script: "none", error: event.error },
      }));
    r.onend = () => setActive(null);
    r.start();
  };

  const verdict = (tag: string, expected: string) => {
    const res = results[tag];
    if (!res) return "not tried";
    if (res.error) return `error: ${res.error}`;
    return res.script === expected ? "pass" : `fail (${res.script})`;
  };

  const table = () =>
    [
      `Browser: ${navigator.userAgent}`,
      "",
      "| Locale | Language | Expected script | Result | Transcript |",
      "|---|---|---|---|---|",
      ...LOCALES.map(
        ([tag, language, script]) =>
          `| ${tag} | ${language} | ${script} | ${verdict(tag, script)} | ${results[tag]?.transcript ?? ""} |`,
      ),
    ].join("\n");

  if (!Ctor) {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm">
        This browser has no speech recognition (Firefox has none). Record it as &ldquo;no voice
        typing&rdquo; for every locale.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2">Locale</th>
            <th>Language</th>
            <th>Expected script</th>
            <th>Result</th>
            <th>Transcript</th>
          </tr>
        </thead>
        <tbody>
          {LOCALES.map(([tag, language, script]) => (
            <tr key={tag} className="border-b border-border/60">
              <td className="py-2">
                <button
                  type="button"
                  className={BTN}
                  disabled={active !== null}
                  onClick={() => probe(tag)}
                >
                  {active === tag ? "Listening…" : tag}
                </button>
              </td>
              <td>{language}</td>
              <td>{script}</td>
              <td>{verdict(tag, script)}</td>
              <td dir="auto">{results[tag]?.transcript}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className={`${BTN} self-start`}
        onClick={() => void navigator.clipboard.writeText(table()).then(() => setCopied(true))}
      >
        {copied ? "Copied" : "Copy results as a table"}
      </button>
    </div>
  );
}

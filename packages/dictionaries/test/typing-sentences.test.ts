/**
 * The typing test and tutor's sentences (data/<code>/typing.txt, src/typing-sentences.ts):
 * enough of them, never a spell-check test sentence, and nothing on the blocklist.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isBlocked, readBlocklist } from "../src/blocked.ts";

const DATA = new URL("../data/", import.meta.url);
const TEST = new URL("data/", import.meta.url);
const rows = (path: URL) =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string]);

const codes = readdirSync(DATA).filter((c) => existsSync(new URL(`${c}/typing.txt`, DATA)));

describe.each(codes)("%s typing sentences", (code) => {
  const sentences = rows(new URL(`${code}/typing.txt`, DATA));

  it("has at least 20, each with a Tatoeba number, no repeats", () => {
    expect(sentences.length).toBeGreaterThanOrEqual(20);
    for (const [id] of sentences) expect(id).toMatch(/^\d+$/);
    expect(new Set(sentences.map(([, s]) => s)).size).toBe(sentences.length);
  });

  it("shares no sentence with the spell-check test", () => {
    const everyday = new URL(`${code}-everyday.txt`, TEST);
    if (!existsSync(everyday)) return;
    const tested = new Set(rows(everyday).map(([, s]) => s.toLowerCase()));
    expect(sentences.filter(([, s]) => tested.has(s.toLowerCase()))).toEqual([]);
  });

  it("holds nothing on the blocklist", () => {
    const file = new URL(`${code}/blocked.txt`, DATA);
    const list = readBlocklist(existsSync(file) ? readFileSync(file, "utf8") : "");
    expect(sentences.filter(([, s]) => isBlocked(s, list))).toEqual([]);
  });
});

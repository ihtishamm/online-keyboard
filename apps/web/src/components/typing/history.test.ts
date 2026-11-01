import { describe, expect, it } from "vitest";
import { addRecord, addRecords, clearRecords, listRecords, persistent } from "./history";
import type { TypingRecord } from "./progress";

const record = (at: number, slug = "urdu"): TypingRecord => ({
  slug,
  layout: "ur-phonetic",
  activity: "test",
  at,
  day: "2026-11-01",
  speed: 30,
  unit: "wpm",
  accuracy: 95,
  seconds: 60,
  phone: false,
  keys: { س: [3, 1] },
});

describe("typing history", () => {
  it("keeps records in IndexedDB, by language, without duplicates", async () => {
    expect(await persistent()).toBe(true);
    await addRecord(record(2));
    await addRecords([record(1), record(2), record(3, "hindi")]);
    expect((await listRecords()).map((r) => r.at)).toEqual([1, 2, 3]);
    expect((await listRecords("hindi")).map((r) => r.slug)).toEqual(["hindi"]);
    expect((await listRecords())[0]!.keys).toEqual({ س: [3, 1] });
    await clearRecords();
    expect(await listRecords()).toEqual([]);
  });
});

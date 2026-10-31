import { describe, expect, it } from "vitest";
import { safeProps } from "./track";

describe("analytics", () => {
  it("drops anything that could be typed text", () => {
    expect(
      safeProps({ layout: "ur-phonetic", count: 3, ok: true, text: "میرا نام", long: "a b c" }),
    ).toEqual({ layout: "ur-phonetic", count: 3, ok: true });
  });
});

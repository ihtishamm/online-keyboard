import { describe, expect, it } from "vitest";
import { sitemapSection } from "./sitemap";

const at = (path: string) => sitemapSection(`https://likho.example${path}`);

describe("sitemap sections", () => {
  it("files each kind of page in its own sitemap", () => {
    expect(at("/")).toBeNull();
    expect(at("/urdu")).toBe("keyboards");
    expect(at("/urdu/roman")).toBe("keyboards");
    expect(at("/hindi/to-roman")).toBe("keyboards");
    expect(at("/typing")).toBe("typing");
    expect(at("/urdu-typing-test")).toBe("typing");
    expect(at("/spanish-typing-games")).toBe("typing");
    expect(at("/guides")).toBe("guides");
    expect(at("/guides/type-urdu-on-mac")).toBe("guides");
    expect(at("/cheat-sheets/urdu-phonetic")).toBe("cheat-sheets");
    expect(at("/case-converter")).toBe("tools");
    expect(at("/keyboard-tester")).toBe("tools");
    expect(at("/kruti-dev-to-unicode")).toBe("tools");
    expect(at("/chanakya-to-unicode")).toBe("tools");
    expect(at("/bijoy-to-unicode")).toBe("tools");
    expect(at("/zawgyi-to-unicode")).toBe("tools");
  });
});

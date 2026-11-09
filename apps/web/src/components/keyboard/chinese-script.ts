import { ChineseScriptConverter } from "@okb/engine";

/** OpenCC's tables, fetched only when someone converts. */
const FILES = import.meta.glob<string>(
  "../../../../../packages/dictionaries/data/zh/opencc-*.txt",
  {
    query: "?url",
    import: "default",
    eager: true,
  },
);

export type ScriptDirection = "s2t" | "t2s";

const loaded = new Map<ScriptDirection, Promise<ChineseScriptConverter | null>>();

function converter(direction: ScriptDirection): Promise<ChineseScriptConverter | null> {
  let promise = loaded.get(direction);
  if (!promise) {
    const url = Object.entries(FILES).find(([path]) =>
      path.endsWith(`opencc-${direction}.txt`),
    )?.[1];
    promise = (async () => {
      if (!url) return null;
      const response = await fetch(url);
      return response.ok ? new ChineseScriptConverter(await response.text()) : null;
    })().catch(() => {
      loaded.delete(direction); // allow a retry when back online
      return null;
    });
    loaded.set(direction, promise);
  }
  return promise;
}

/** The text in the other script, or null when the table could not be loaded. */
export async function convertChineseScript(
  direction: ScriptDirection,
  text: string,
): Promise<string | null> {
  return (await converter(direction))?.convert(text) ?? null;
}

import type { Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { useEffect, useState } from "react";
import { loadPreference, savePreference } from "../keyboard/preferences";
import DailyChallenge from "./DailyChallenge";
import FallingWords from "./FallingWords";
import KeyFinder from "./KeyFinder";
import Segmented from "./Segmented";

/** The typing games of a language (plan item 8.2): daily challenge, falling words, key finder. */
export interface TypingGamesProps {
  slug: string;
  lang: string;
  languageName: string;
  nativeName: string;
  layouts: readonly Layout[];
  words: readonly string[];
  passages: readonly string[];
  bands: readonly (readonly string[])[];
  script: string;
  dir: "rtl" | "ltr";
  font: FontId;
}

const GAMES = [
  { id: "daily", label: "Daily challenge" },
  { id: "falling", label: "Falling words" },
  { id: "finder", label: "Key finder" },
] as const;
type Game = (typeof GAMES)[number]["id"];

export default function TypingGames(props: TypingGamesProps) {
  const [game, setGame] = useState<Game>("daily");
  const [layoutId, setLayoutId] = useState(props.layouts[0]!.id);
  const [keyboard, setKeyboard] = useState(true);
  const [ownKeyboard, setOwnKeyboard] = useState(false);
  const layout = props.layouts.find((l) => l.id === layoutId) ?? props.layouts[0]!;

  useEffect(() => {
    const fromHash = () => GAMES.find((g) => `#${g.id}` === location.hash)?.id;
    const onHash = () => {
      const g = fromHash();
      if (g) setGame(g);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    const l = loadPreference("typing:layout");
    if (l && props.layouts.some((x) => x.id === l)) setLayoutId(l);
    if (loadPreference("typing:keyboard") === "off") setKeyboard(false);
    if (loadPreference("typing:own") === "on") setOwnKeyboard(true);
    return () => window.removeEventListener("hashchange", onHash);
  }, [props.layouts]);

  const pick = (id: Game) => {
    setGame(id);
    history.replaceState(null, "", `#${id}`);
  };

  const shared = {
    slug: props.slug,
    lang: props.lang,
    languageName: props.languageName,
    nativeName: props.nativeName,
    layout,
    dir: props.dir,
    font: props.font,
    ownKeyboard,
    keyboard,
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Games"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            id={`tab-${g.id}`}
            aria-selected={game === g.id}
            aria-controls={`panel-${g.id}`}
            onClick={() => pick(g.id)}
            className={`-mb-px h-11 shrink-0 border-b-2 px-3 text-sm font-medium ${
              game === g.id
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {props.layouts.length > 1 && (
          <Segmented
            label="Keyboard layout"
            value={layoutId}
            options={props.layouts.map((l) => ({ value: l.id, label: l.name.en }))}
            onChange={(id) => {
              setLayoutId(id);
              savePreference("typing:layout", id);
            }}
          />
        )}
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={keyboard}
            onChange={(e) => {
              setKeyboard(e.target.checked);
              savePreference("typing:keyboard", e.target.checked ? "on" : "off");
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          Show the on-screen keyboard
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={ownKeyboard}
            onChange={(e) => {
              setOwnKeyboard(e.target.checked);
              savePreference("typing:own", e.target.checked ? "on" : "off");
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          My device already types {props.languageName}
        </label>
      </div>

      <div role="tabpanel" id={`panel-${game}`} aria-labelledby={`tab-${game}`}>
        {game === "daily" && (
          <DailyChallenge
            {...shared}
            passages={props.passages}
            words={props.words}
            script={props.script}
          />
        )}
        {game === "falling" && (
          <FallingWords {...shared} key={layout.id} bands={props.bands} script={props.script} />
        )}
        {game === "finder" && <KeyFinder {...shared} key={layout.id} />}
      </div>
    </div>
  );
}

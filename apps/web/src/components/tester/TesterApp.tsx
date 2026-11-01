import { useEffect, useState } from "react";
import { hasCoarsePointer } from "../keyboard/platform";
import CharInspector from "./CharInspector";
import KeyboardTester from "./KeyboardTester";
import TouchTester from "./TouchTester";

/**
 * The tester page's tabs (plan item 8.3): keyboard, touch screen and characters. Phones open on
 * the touch tester, computers on the keyboard; #keyboard, #touch and #characters pick one.
 */
const TABS = [
  { id: "keyboard", label: "Keyboard" },
  { id: "touch", label: "Touch screen" },
  { id: "characters", label: "Special characters" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function TesterApp() {
  const [tab, setTab] = useState<Tab | null>(null);

  // The tab in the address (#characters), also when a link changes it on this page.
  useEffect(() => {
    const fromHash = () => TABS.find((t) => `#${t.id}` === location.hash)?.id;
    setTab(fromHash() ?? (hasCoarsePointer() ? "touch" : "keyboard"));
    const onHash = () => {
      const t = fromHash();
      if (t) setTab(t);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Testers"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="tester-panel"
            onClick={() => {
              setTab(t.id);
              history.replaceState(null, "", `#${t.id}`);
            }}
            className={`-mb-px h-11 shrink-0 border-b-2 px-3 text-sm font-medium ${
              tab === t.id
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="tester-panel" aria-labelledby={tab ? `tab-${tab}` : undefined}>
        {tab === "keyboard" && <KeyboardTester />}
        {tab === "touch" && <TouchTester />}
        {tab === "characters" && <CharInspector />}
      </div>
    </div>
  );
}

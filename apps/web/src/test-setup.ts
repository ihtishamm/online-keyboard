import { configure } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";
import { resetDraftStore } from "./components/keyboard/drafts";

// Word lists load asynchronously; the default 1 s is too short when `pnpm test` runs every
// package at once on a cold cache, as in CI.
configure({ asyncUtilTimeout: 10_000 });

// Every test gets an empty IndexedDB.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDraftStore();
});

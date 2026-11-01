import { recordId, type TypingRecord } from "./progress";

/**
 * Typing history on this device (plan item 8.2), in IndexedDB: one record per finished test,
 * lesson or game. Nothing is uploaded. Without IndexedDB (some private modes) records last
 * for the page view, and the progress page says so.
 */

const DB = "likho-typing";
const STORE = "records";
/** Records kept; the oldest go first. Each is a few hundred bytes. */
const MAX_RECORDS = 5000;

let memory: TypingRecord[] | null = null;
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { autoIncrement: true }).createIndex("slug", "slug");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/** True when records survive the page view. */
export async function persistent(): Promise<boolean> {
  return (await open()) !== null;
}

/** Every record, oldest first (all languages, or one). */
export async function listRecords(slug?: string): Promise<TypingRecord[]> {
  const db = await open();
  if (!db) return (memory ?? []).filter((r) => !slug || r.slug === slug);
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const req = slug ? store.index("slug").getAll(slug) : store.getAll();
  const records = await new Promise<TypingRecord[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as TypingRecord[]);
    req.onerror = () => reject(req.error);
  });
  return records.sort((a, b) => a.at - b.at);
}

/** Add records, skipping any already kept (same language, activity and time). */
export async function addRecords(records: readonly TypingRecord[]): Promise<number> {
  const db = await open();
  const have = new Set((await listRecords()).map(recordId));
  const fresh = records.filter((r) => !have.has(recordId(r)) && have.add(recordId(r)));
  if (!db) {
    memory = [...(memory ?? []), ...fresh].slice(-MAX_RECORDS);
    return fresh.length;
  }
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const r of fresh) store.add(r);
  // Trim the oldest past the cap.
  const countReq = store.count();
  countReq.onsuccess = () => {
    let extra = countReq.result - MAX_RECORDS;
    if (extra <= 0) return;
    store.openCursor().onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor && extra-- > 0) {
        cursor.delete();
        cursor.continue();
      }
    };
  };
  await done(tx);
  return fresh.length;
}

export const addRecord = (record: TypingRecord) => addRecords([record]);

/** Forget everything (the progress page's "Delete my history"). */
export async function clearRecords(): Promise<void> {
  const db = await open();
  memory = null;
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await done(tx);
}

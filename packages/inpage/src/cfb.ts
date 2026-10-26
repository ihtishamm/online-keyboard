/**
 * Minimal reader for Microsoft Compound File Binary (OLE2) containers, the format InPage
 * 1.x-2.x documents use ([MS-CFB]). Reads the directory and the streams in it, including
 * small streams kept in the mini stream. Read-only, no writing or property sets.
 */

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** Sector ids at or above this mark chain ends and special sectors. */
const MAX_REG_SECT = 0xfffffffa;
const NO_STREAM = 0xffffffff;

export class CfbError extends Error {
  override name = "CfbError";
}

export interface CfbStream {
  name: string;
  size: number;
  read(): Uint8Array;
}

export function isCompoundFile(bytes: Uint8Array): boolean {
  return bytes.length >= 512 && SIGNATURE.every((b, i) => bytes[i] === b);
}

/** List the streams (not storages) in a compound file. */
export function readCompoundFile(bytes: Uint8Array): CfbStream[] {
  if (!isCompoundFile(bytes)) throw new CfbError("not a compound file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => view.getUint16(o, true);
  const u32 = (o: number) => view.getUint32(o, true);

  const sectorSize = 1 << u16(30);
  const miniSectorSize = 1 << u16(32);
  if (sectorSize !== 512 && sectorSize !== 4096) throw new CfbError("bad sector size");
  const fatSectorCount = u32(44);
  const directoryStart = u32(48);
  const miniCutoff = u32(56);
  const miniFatStart = u32(60);
  let difatNext = u32(68);

  const sectorOffset = (id: number) => (id + 1) * sectorSize;
  const sectorCount = Math.floor(bytes.length / sectorSize) - 1;

  // DIFAT: the first 109 FAT sector ids live in the header, the rest in a sector chain.
  const fatSectors: number[] = [];
  for (let i = 0; i < 109 && fatSectors.length < fatSectorCount; i++)
    fatSectors.push(u32(76 + i * 4));
  const perSector = sectorSize / 4;
  for (let guard = 0; difatNext < MAX_REG_SECT && fatSectors.length < fatSectorCount; guard++) {
    if (guard > sectorCount) throw new CfbError("DIFAT loop");
    const base = sectorOffset(difatNext);
    for (let i = 0; i < perSector - 1 && fatSectors.length < fatSectorCount; i++) {
      fatSectors.push(u32(base + i * 4));
    }
    difatNext = u32(base + (perSector - 1) * 4);
  }

  const fat: number[] = [];
  for (const id of fatSectors) {
    if (id >= sectorCount) throw new CfbError("FAT sector out of range");
    const base = sectorOffset(id);
    for (let i = 0; i < perSector; i++) fat.push(u32(base + i * 4));
  }

  /** Follow a chain through a FAT, returning the sector ids. */
  const chain = (start: number, table: readonly number[], limit: number): number[] => {
    const ids: number[] = [];
    for (let id = start; id < MAX_REG_SECT; id = table[id] ?? NO_STREAM) {
      if (id >= limit || ids.length > limit) throw new CfbError("broken sector chain");
      ids.push(id);
    }
    return ids;
  };

  const readRegular = (start: number, size: number): Uint8Array => {
    const out = new Uint8Array(size);
    let pos = 0;
    for (const id of chain(start, fat, sectorCount)) {
      if (pos >= size) break;
      const base = sectorOffset(id);
      const n = Math.min(sectorSize, size - pos);
      out.set(bytes.subarray(base, base + n), pos);
      pos += n;
    }
    if (pos < size) throw new CfbError("stream shorter than its size");
    return out;
  };

  // Directory: 128-byte entries in the directory sector chain.
  const dirIds = chain(directoryStart, fat, sectorCount);
  const entries: { name: string; type: number; start: number; size: number }[] = [];
  for (const id of dirIds) {
    const base = sectorOffset(id);
    for (let e = 0; e < sectorSize / 128; e++) {
      const o = base + e * 128;
      const nameLength = u16(o + 64);
      let name = "";
      for (let i = 0; i + 2 < nameLength && i < 64; i += 2) name += String.fromCharCode(u16(o + i));
      // Sizes above 4 GB do not occur in documents this small; the high dword is ignored.
      entries.push({ name, type: bytes[o + 66]!, start: u32(o + 116), size: u32(o + 120) });
    }
  }

  const root = entries[0];
  if (!root || root.type !== 5) throw new CfbError("missing root entry");

  // The mini stream (root entry's data) holds streams smaller than the cutoff.
  let mini: { data: Uint8Array; fat: number[] } | null = null;
  const loadMini = () => {
    if (mini) return mini;
    const data = readRegular(root.start, root.size);
    const miniFat: number[] = [];
    if (miniFatStart < MAX_REG_SECT) {
      for (const id of chain(miniFatStart, fat, sectorCount)) {
        const base = sectorOffset(id);
        for (let i = 0; i < perSector; i++) miniFat.push(u32(base + i * 4));
      }
    }
    mini = { data, fat: miniFat };
    return mini;
  };

  const readMini = (start: number, size: number): Uint8Array => {
    const { data, fat: miniFat } = loadMini();
    const out = new Uint8Array(size);
    let pos = 0;
    for (const id of chain(start, miniFat, data.length / miniSectorSize)) {
      if (pos >= size) break;
      const n = Math.min(miniSectorSize, size - pos);
      out.set(data.subarray(id * miniSectorSize, id * miniSectorSize + n), pos);
      pos += n;
    }
    if (pos < size) throw new CfbError("mini stream shorter than its size");
    return out;
  };

  return entries
    .filter((e) => e.type === 2)
    .map((e) => ({
      name: e.name,
      size: e.size,
      read: () => (e.size < miniCutoff ? readMini(e.start, e.size) : readRegular(e.start, e.size)),
    }));
}

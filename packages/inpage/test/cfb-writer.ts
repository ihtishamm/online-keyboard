/**
 * Test helper: writes a minimal compound file (512-byte sectors) holding the given streams.
 * Streams under 4096 bytes go into the mini stream, as real writers do.
 */
const SECTOR = 512;
const MINI = 64;
const CUTOFF = 4096;
const END = 0xfffffffe;
const FREE = 0xffffffff;
const FAT_SECT = 0xfffffffd;

export function writeCompoundFile(streams: { name: string; data: Uint8Array }[]): Uint8Array {
  const sectors: Uint8Array[] = [];
  const fat: number[] = [];
  /** Append data as a chain of sectors; returns the first sector id. */
  const addChain = (data: Uint8Array): number => {
    const count = Math.max(1, Math.ceil(data.length / SECTOR));
    const first = sectors.length;
    for (let i = 0; i < count; i++) {
      const s = new Uint8Array(SECTOR);
      s.set(data.subarray(i * SECTOR, (i + 1) * SECTOR));
      sectors.push(s);
      fat.push(i === count - 1 ? END : first + i + 1);
    }
    return first;
  };

  // Mini stream: small streams packed into 64-byte mini sectors.
  const miniParts: Uint8Array[] = [];
  const miniFat: number[] = [];
  const placed = streams.map((s) => {
    if (s.data.length >= CUTOFF) return { ...s, start: addChain(s.data) };
    const count = Math.max(1, Math.ceil(s.data.length / MINI));
    const first = miniFat.length;
    for (let i = 0; i < count; i++) {
      const m = new Uint8Array(MINI);
      m.set(s.data.subarray(i * MINI, (i + 1) * MINI));
      miniParts.push(m);
      miniFat.push(i === count - 1 ? END : first + i + 1);
    }
    return { ...s, start: first };
  });
  const miniData = new Uint8Array(miniParts.length * MINI);
  miniParts.forEach((m, i) => miniData.set(m, i * MINI));
  const miniStart = miniParts.length ? addChain(miniData) : END;
  const miniFatBytes = new Uint8Array(Math.max(4, miniFat.length * 4));
  const mv = new DataView(miniFatBytes.buffer);
  miniFat.forEach((v, i) => mv.setUint32(i * 4, v, true));
  const miniFatStart = miniFat.length ? addChain(miniFatBytes) : END;

  // Directory: root entry, then one entry per stream.
  const dir = new Uint8Array(Math.ceil((placed.length + 1) / 4) * SECTOR);
  const dv = new DataView(dir.buffer);
  const entry = (i: number, name: string, type: number, start: number, size: number) => {
    const o = i * 128;
    for (let c = 0; c < name.length; c++) dv.setUint16(o + c * 2, name.charCodeAt(c), true);
    dv.setUint16(o + 64, (name.length + 1) * 2, true);
    dir[o + 66] = type;
    dv.setUint32(o + 68, FREE, true); // left sibling
    dv.setUint32(o + 72, i > 0 && i < placed.length ? i + 1 : FREE, true); // right sibling
    dv.setUint32(o + 76, type === 5 && placed.length ? 1 : FREE, true); // child
    dv.setUint32(o + 116, start, true);
    dv.setUint32(o + 120, size, true);
  };
  entry(0, "Root Entry", 5, miniStart, miniData.length);
  placed.forEach((s, i) => entry(i + 1, s.name, 2, s.start, s.data.length));
  const dirStart = addChain(dir);

  // FAT sectors go last; they must also be marked in the FAT itself.
  const perSector = SECTOR / 4;
  let fatCount = 1;
  while (fat.length + fatCount > fatCount * perSector) fatCount++;
  const fatStart = sectors.length;
  for (let i = 0; i < fatCount; i++) fat.push(FAT_SECT);
  while (fat.length < fatCount * perSector) fat.push(FREE);
  for (let i = 0; i < fatCount; i++) {
    const s = new Uint8Array(SECTOR);
    const v = new DataView(s.buffer);
    for (let j = 0; j < perSector; j++) v.setUint32(j * 4, fat[i * perSector + j]!, true);
    sectors.push(s);
  }

  const header = new Uint8Array(SECTOR);
  const hv = new DataView(header.buffer);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(24, 0x3e, true); // minor version
  hv.setUint16(26, 3, true); // major version 3 (512-byte sectors)
  hv.setUint16(28, 0xfffe, true); // little-endian
  hv.setUint16(30, 9, true); // sector shift
  hv.setUint16(32, 6, true); // mini sector shift
  hv.setUint32(44, fatCount, true);
  hv.setUint32(48, dirStart, true);
  hv.setUint32(56, CUTOFF, true);
  hv.setUint32(60, miniFatStart, true);
  hv.setUint32(64, miniFat.length ? 1 : 0, true);
  hv.setUint32(68, END, true); // no DIFAT sectors
  hv.setUint32(72, 0, true);
  for (let i = 0; i < 109; i++) hv.setUint32(76 + i * 4, i < fatCount ? fatStart + i : FREE, true);

  const out = new Uint8Array(SECTOR * (sectors.length + 1));
  out.set(header);
  sectors.forEach((s, i) => out.set(s, SECTOR * (i + 1)));
  return out;
}

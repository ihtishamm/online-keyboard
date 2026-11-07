/**
 * Tells Zawgyi from Unicode Burmese. Both use the same code points, so nothing in a single
 * character says which one a text is; this scores how likely each pair of neighbouring code
 * points is in each encoding.
 *
 * Adapted from the ZawgyiDetector of Google's myanmar-tools (clients/js/src/zawgyi_detector.ts),
 * with its trained model in zawgyi-model.ts. Copyright 2017 Google LLC, Apache License 2.0 (see
 * LICENSE-myanmar-tools in this folder). Changed from the original: the model is read into one
 * flat array, and the checks of its header are gone.
 */
import { MODEL_BASE64 } from "./zawgyi-model.ts";

// The code points the model tells apart. All others share state 0.
const STD = [0x1000, 0x103f] as const; // Myanmar, before the digits
const AFT = [0x104a, 0x109f] as const; // Myanmar, after the digits
const EXA = [0xaa60, 0xaa7f] as const; // Myanmar Extended-A
const EXB = [0xa9e0, 0xa9ff] as const; // Myanmar Extended-B
const SPC = [0x2000, 0x200b] as const; // spaces

const STD_OFFSET = 1;
const AFT_OFFSET = STD_OFFSET + STD[1] - STD[0] + 1;
const EXA_OFFSET = AFT_OFFSET + AFT[1] - AFT[0] + 1;
const EXB_OFFSET = EXA_OFFSET + EXA[1] - EXA[0] + 1;
const SPC_OFFSET = EXB_OFFSET + EXB[1] - EXB[0] + 1;

interface Model {
  size: number;
  /** log P(Unicode) - log P(Zawgyi) for each pair of states, row by row. */
  deltas: Float32Array;
  usesSpaces: boolean;
}

let model: Model | undefined;

function loadModel(): Model {
  const binary = atob(MODEL_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const data = new DataView(bytes.buffer);
  let at = 8; // the file's magic number
  const version = data.getUint32(at);
  at += 4;
  let usesSpaces = true;
  if (version === 2) {
    usesSpaces = data.getUint32(at) === 0;
    at += 4;
  }
  at += 12; // the Markov table's magic number and version
  const size = data.getInt16(at);
  at += 2;
  const deltas = new Float32Array(size * size);
  for (let from = 0; from < size; from++) {
    let entries = data.getInt16(at);
    at += 2;
    let fallback = 0;
    if (entries !== 0) {
      fallback = data.getFloat32(at);
      at += 4;
    }
    let next = -1;
    for (let to = 0; to < size; to++) {
      if (entries > 0 && next < to) {
        next = data.getInt16(at);
        at += 2;
        entries--;
      }
      if (next === to) {
        deltas[from * size + to] = data.getFloat32(at);
        at += 4;
      } else {
        deltas[from * size + to] = fallback;
      }
    }
  }
  return { size, deltas, usesSpaces };
}

function stateOf(cp: number, usesSpaces: boolean): number {
  if (cp >= STD[0] && cp <= STD[1]) return cp - STD[0] + STD_OFFSET;
  if (cp >= AFT[0] && cp <= AFT[1]) return cp - AFT[0] + AFT_OFFSET;
  if (cp >= EXA[0] && cp <= EXA[1]) return cp - EXA[0] + EXA_OFFSET;
  if (cp >= EXB[0] && cp <= EXB[1]) return cp - EXB[0] + EXB_OFFSET;
  if (usesSpaces && cp >= SPC[0] && cp <= SPC[1]) return cp - SPC[0] + SPC_OFFSET;
  return 0;
}

/**
 * The evidence in a text, as log P(Unicode) - log P(Zawgyi). Below 0 leans Zawgyi. Null if the
 * text has no Myanmar code points. Adding the evidence of two texts gives that of both.
 */
export function zawgyiEvidence(text: string): number | null {
  model ??= loadModel();
  const { size, deltas, usesSpaces } = model;
  let prev = 0;
  let total = 0;
  let seen = false;
  for (let i = 0; i <= text.length; i++) {
    const state = i === text.length ? 0 : stateOf(text.charCodeAt(i), usesSpaces);
    // Ignore moves between code points the model knows nothing about.
    if (prev !== 0 || state !== 0) {
      total += deltas[prev * size + state]!;
      seen = true;
    }
    prev = state;
  }
  return seen ? total : null;
}

/** The probability that a text is Zawgyi rather than Unicode; null if it has no Myanmar text. */
export function zawgyiProbability(text: string): number | null {
  const evidence = zawgyiEvidence(text);
  return evidence === null ? null : 1 / (1 + Math.exp(evidence));
}

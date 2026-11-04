import { ZHUYIN_LETTERS } from "@okb/engine";
import { phrase } from "./phrase-schemes";

/** Digit keys type Zhuyin symbols, so they never pick a suggestion. */
export const ZHT_ZHUYIN = phrase(
  "zht-zhuyin",
  "zh-Hant",
  "zhuyin",
  ZHUYIN_LETTERS + "1234567890",
  {},
);

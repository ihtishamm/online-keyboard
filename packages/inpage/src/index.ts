export { INPAGE_TO_UNICODE, UNICODE_TO_INPAGE } from "./charmap";
export { CfbError, isCompoundFile, readCompoundFile, type CfbStream } from "./cfb";
export {
  InPageFileError,
  decodeInPageBytes,
  decodeInPageFile,
  decodeInPageText,
  extractStreamText,
  looksLikeInPageText,
  type Decoded,
  type InPageDocument,
} from "./decode";
export { encodeInPage, type Encoded } from "./encode";

/**
 * Copy and spelling guides for the Roman (English letters) layouts, keyed by layout id.
 * Original text, written for this site. Every example is checked by roman.test.ts: it must
 * convert exactly as shown with the scheme and the word list the page ships.
 */
import type { LayoutCopy } from "./languages";

/** One row of the spelling guide. */
export interface RomanGuideRow {
  roman: string;
  /** The letters it gives, in the language's script. */
  script: string;
  examples: [roman: string, script: string][];
}

export interface RomanCopy {
  page: LayoutCopy;
  /** Shown above the editor: type this, get that. */
  example: [roman: string, script: string];
  /** A word typed without its vowels, for the "vowels can be left out" note. */
  short?: [roman: string, script: string];
  guide: RomanGuideRow[];
}

export const ROMAN: Readonly<Record<string, RomanCopy>> = {
  "ur-roman": {
    page: {
      title: "Roman Urdu to Urdu: Type Urdu in English Letters Online",
      heading: "Roman Urdu to Urdu",
      description:
        "Type Urdu the way you text it, in English letters, and get proper Urdu script as you go. Free, private, with word suggestions and Nastaliq.",
      summary:
        "Type Urdu the way you text it, in English letters. Each word turns into Urdu when you press Space, and the bar under the editor offers other spellings and longer words.",
      bestFor:
        "Anyone who writes Roman Urdu on WhatsApp and wants real Urdu script without learning a keyboard layout.",
    },
    example: ["mera naam", "میرا نام"],
    short: ["bht", "بہت"],
    guide: [
      {
        roman: "kh",
        script: "خ  کھ",
        examples: [
          ["khush", "خوش"],
          ["khel", "کھیل"],
        ],
      },
      {
        roman: "gh",
        script: "غ  گھ",
        examples: [
          ["ghalat", "غلط"],
          ["ghar", "گھر"],
        ],
      },
      { roman: "sh", script: "ش", examples: [["shaam", "شام"]] },
      {
        roman: "ch, chh",
        script: "چ  چھ",
        examples: [
          ["chalo", "چلو"],
          ["chhota", "چھوٹا"],
        ],
      },
      {
        roman: "th",
        script: "تھ  ٹھ",
        examples: [
          ["tha", "تھا"],
          ["theek", "ٹھیک"],
        ],
      },
      {
        roman: "bh, ph, jh, dh",
        script: "بھ  پھ  جھ  دھ",
        examples: [
          ["bhai", "بھائی"],
          ["phir", "پھر"],
          ["mujhe", "مجھے"],
        ],
      },
      {
        roman: "aa",
        script: "ا  آ",
        examples: [
          ["baat", "بات"],
          ["aaj", "آج"],
        ],
      },
      {
        roman: "ee, i",
        script: "ی",
        examples: [
          ["teen", "تین"],
          ["thi", "تھی"],
        ],
      },
      {
        roman: "e, ay (at the end)",
        script: "ے",
        examples: [
          ["mere", "میرے"],
          ["hay", "ہے"],
        ],
      },
      {
        roman: "oo, o, u",
        script: "و",
        examples: [
          ["door", "دور"],
          ["ko", "کو"],
        ],
      },
      {
        roman: "n (at the end)",
        script: "ں",
        examples: [
          ["main", "میں"],
          ["kahan", "کہاں"],
        ],
      },
      {
        roman: "T D R S Z H",
        script: "ٹ  ڈ  ڑ  ص  ض  ح",
        examples: [
          ["baRa", "بڑا"],
          ["Sabr", "صبر"],
        ],
      },
    ],
  },

  "ar-roman": {
    page: {
      title: "English to Arabic Typing: Type Arabic in English Letters and Arabizi",
      heading: "English to Arabic Typing",
      description:
        "Type Arabic in English letters or Arabizi (3 for ع, 7 for ح) and get Arabic script as you go. Free, private and offline, with spelling suggestions.",
      summary:
        "Write Arabic the way you text it: marhaba, ana, 7abibi. Each word turns into Arabic script when you press Space, and the bar under the editor offers other spellings. The chat digits 2 3 5 6 7 work, and 8 and 9 offer both regional readings.",
      bestFor:
        "Anyone who chats in Arabizi or English letters and wants proper Arabic script without learning the Arabic keyboard.",
    },
    example: ["marhaba", "مرحبا"],
    guide: [
      {
        roman: "2 3 5 6 7",
        script: "ء  ع  خ  ط  ح",
        examples: [
          ["masa2", "مساء"],
          ["3arabi", "عربي"],
          ["ya3ni", "يعني"],
          ["7ub", "حب"],
        ],
      },
      {
        roman: "3' 6' 7'",
        script: "غ  ظ  خ",
        examples: [
          ["3'arb", "غرب"],
          ["6'uhr", "ظهر"],
        ],
      },
      {
        roman: "kh, gh, sh",
        script: "خ  غ  ش",
        examples: [
          ["shams", "شمس"],
          ["khair", "خير"],
        ],
      },
      {
        roman: "q, k",
        script: "ق  ك",
        examples: [
          ["qalb", "قلب"],
          ["kayf", "كيف"],
        ],
      },
      {
        roman: "al (the)",
        script: "ال",
        examples: [
          ["alqamar", "القمر"],
          ["alsalam", "السلام"],
        ],
      },
      {
        roman: "a, ah (at the end)",
        script: "ة  ا",
        examples: [
          ["madrasa", "مدرسة"],
          ["marhaba", "مرحبا"],
        ],
      },
      {
        roman: "-an (at the end)",
        script: "ا",
        examples: [
          ["shukran", "شكرا"],
          ["ahlan", "أهلا"],
        ],
      },
      {
        roman: "S D T Z H",
        script: "ص  ض  ط  ظ  ح",
        examples: [["Sabah", "صباح"]],
      },
    ],
  },

  "fa-roman": {
    page: {
      title: "Finglish to Persian Keyboard: Type Farsi in English Letters",
      heading: "Finglish to Persian",
      description:
        "Type Persian in Finglish (salam, merci, mikonam) and get Persian script with the right half-spaces as you go. Free, private and offline.",
      summary:
        "Write Persian the way you text it in Finglish. Each word turns into Persian script when you press Space. Verb prefixes and plurals get their half-space (ZWNJ) on their own: mikonam becomes می\u200Cکنم and ketabha becomes کتاب\u200Cها.",
      bestFor:
        "Anyone who writes Finglish on Telegram or Instagram and wants proper Persian script without learning the Persian keyboard.",
    },
    example: ["salam", "سلام"],
    guide: [
      {
        roman: "kh, gh, sh, zh, ch",
        script: "خ  غ  ش  ژ  چ",
        examples: [
          ["khub", "خوب"],
          ["shab", "شب"],
          ["chetori", "چطوری"],
        ],
      },
      {
        roman: "mi-, nemi-",
        script: "می\u200C  نمی\u200C",
        examples: [
          ["mikonam", "می\u200Cکنم"],
          ["nemidoonam", "نمی\u200Cدونم"],
        ],
      },
      { roman: "-ha (plural)", script: "\u200Cها", examples: [["ketabha", "کتاب\u200Cها"]] },
      {
        roman: "e (at the end)",
        script: "ه",
        examples: [
          ["khane", "خانه"],
          ["zendegi", "زندگی"],
        ],
      },
      {
        roman: "oo, u",
        script: "و",
        examples: [
          ["rooz", "روز"],
          ["mamnoon", "ممنون"],
        ],
      },
      {
        roman: "i",
        script: "ی",
        examples: [
          ["farsi", "فارسی"],
          ["iran", "ایران"],
        ],
      },
    ],
  },

  "ps-roman": {
    page: {
      title: "Roman Pashto to Pashto: Type Pashto in English Letters",
      heading: "Roman Pashto to Pashto",
      description:
        "Type Pashto in English letters (xa, tsanga, manana) and get Pashto script as you go: ښ, څ, ځ, ږ and the rest. Free, private and offline.",
      summary:
        "Write Pashto the way you text it in English letters. Each word turns into Pashto script when you press Space. The Pashto letters have their usual chat spellings: x for ښ, ts for څ, dz for ځ and zh for ږ.",
      bestFor:
        "Anyone who chats in Roman Pashto and wants proper Pashto script without learning the Pashto keyboard.",
    },
    example: ["tsanga", "څنګه"],
    guide: [
      {
        roman: "x",
        script: "ښ",
        examples: [
          ["xa", "ښه"],
          ["pashto", "پښتو"],
        ],
      },
      {
        roman: "ts, dz",
        script: "څ  ځ",
        examples: [
          ["tsanga", "څنګه"],
          ["dzmaka", "ځمکه"],
        ],
      },
      {
        roman: "zh",
        script: "ږ  ژ",
        examples: [
          ["mung", "موږ"],
          ["zhwand", "ژوند"],
        ],
      },
      {
        roman: "kh, gh",
        script: "خ  غ",
        examples: [
          ["khor", "خور"],
          ["ghar", "غر"],
        ],
      },
      {
        roman: "a (at the end)",
        script: "ه",
        examples: [
          ["za", "زه"],
          ["manana", "مننه"],
        ],
      },
      { roman: "T D R N", script: "ټ  ډ  ړ  ڼ", examples: [["wror", "ورور"]] },
    ],
  },

  "sd-roman": {
    page: {
      title: "Roman Sindhi to Sindhi: Type Sindhi in English Letters",
      heading: "Roman Sindhi to Sindhi",
      description:
        "Type Sindhi in English letters and get Sindhi script as you go, with ڪ, ڻ, ڏ, ٿ and the other Sindhi letters. Free, private and offline.",
      summary:
        "Write Sindhi the way you text it in English letters. Each word turns into Sindhi script when you press Space, and the bar under the editor offers other spellings.",
      bestFor:
        "Anyone who writes Sindhi in English letters and wants proper Sindhi script without learning the Sindhi keyboard.",
    },
    example: ["sindhi", "سنڌي"],
    guide: [
      {
        roman: "k",
        script: "ڪ",
        examples: [
          ["kitab", "ڪتاب"],
          ["karachi", "ڪراچي"],
        ],
      },
      { roman: "dh", script: "ڌ  ڏ", examples: [["sindh", "سنڌ"]] },
      { roman: "th", script: "ٿ  ٺ", examples: [["sutho", "سٺو"]] },
      { roman: "n", script: "ن  ڻ", examples: [["paani", "پاڻي"]] },
      { roman: "gh", script: "گه", examples: [["ghar", "گهر"]] },
      { roman: "i (at the end)", script: "ي", examples: [["sindhi", "سنڌي"]] },
    ],
  },

  "pnb-roman": {
    page: {
      title: "Roman Punjabi to Shahmukhi: Type Punjabi in English Letters",
      heading: "Roman Punjabi to Shahmukhi",
      description:
        "Type Punjabi in English letters and get Shahmukhi script as you go. Free, private and offline, with Nastaliq and word suggestions.",
      summary:
        "Write Punjabi the way you text it in English letters. Each word turns into Shahmukhi when you press Space, and the bar under the editor offers other spellings.",
      bestFor:
        "Anyone who writes Punjabi in English letters and wants it in Shahmukhi without learning a keyboard layout.",
    },
    example: ["main theek haan", "میں ٹھیک ہاں"],
    guide: [
      { roman: "kh, gh", script: "کھ  گھ", examples: [["ghar", "گھر"]] },
      { roman: "ch", script: "چ", examples: [["changa", "چنگا"]] },
      {
        roman: "v, w",
        script: "و",
        examples: [
          ["vich", "وچ"],
          ["kiwen", "کیویں"],
        ],
      },
      {
        roman: "n (at the end)",
        script: "ں",
        examples: [
          ["nu", "نوں"],
          ["main", "میں"],
        ],
      },
      {
        roman: "N",
        script: "ݨ",
        examples: [
          ["paNi", "پاݨی"],
          ["kaNak", "کݨک"],
        ],
      },
      {
        roman: "T D R",
        script: "ٹ  ڈ  ڑ",
        examples: [
          ["chhoTa", "چھوٹا"],
          ["munDa", "منڈا"],
          ["kuRi", "کڑی"],
        ],
      },
    ],
  },

  "skr-roman": {
    page: {
      title: "Roman Saraiki to Saraiki: Type Saraiki in English Letters",
      heading: "Roman Saraiki to Saraiki",
      description:
        "Type Saraiki in English letters and get Saraiki script as you go, with ٻ, ڄ, ݙ and ڳ. Free, private and offline.",
      summary:
        "Write Saraiki the way you text it in English letters. Each word turns into Saraiki script when you press Space, and the bar under the editor offers other spellings, including the implosive letters.",
      bestFor:
        "Anyone who writes Saraiki in English letters and wants proper Saraiki script without learning a keyboard layout.",
    },
    example: ["saraiki", "سرائیکی"],
    guide: [
      { roman: "kh, gh", script: "کھ  گھ", examples: [["ghar", "گھر"]] },
      { roman: "ch", script: "چ", examples: [["changa", "چنگا"]] },
      {
        roman: "n (at the end)",
        script: "ں",
        examples: [
          ["main", "میں"],
          ["tusan", "تساں"],
        ],
      },
      {
        roman: "bb jj dd gg",
        script: "ٻ  ڄ  ݙ  ڳ",
        examples: [
          ["bbaal", "ٻال"],
          ["ajj", "اڄ"],
          ["wadda", "وݙا"],
        ],
      },
      { roman: "N", script: "ݨ", examples: [["paNi", "پاݨی"]] },
    ],
  },

  "bal-roman": {
    page: {
      title: "Roman Balochi to Balochi: Type Balochi in English Letters",
      heading: "Roman Balochi to Balochi",
      description:
        "Type Balochi in English letters and get Balochi script as you go. Free, private and offline. In Beta: there is no Balochi word list yet.",
      summary:
        "Write Balochi the way you text it in English letters. Each word turns into Balochi script when you press Space. There is no open Balochi word list yet, so conversions rest on spelling rules and a few common words.",
      bestFor: "Anyone who writes Balochi in English letters and wants it in Balochi script.",
    },
    example: ["balochi", "بلوچی"],
    guide: [
      {
        roman: "sh, ch",
        script: "ش  چ",
        examples: [
          ["shuma", "شما"],
          ["roch", "روچ"],
        ],
      },
      { roman: "i (at the end)", script: "ی", examples: [["balochi", "بلوچی"]] },
    ],
  },

  "ks-roman": {
    page: {
      title: "Roman Kashmiri to Kashmiri: Type Kashmiri in English Letters",
      heading: "Roman Kashmiri to Kashmiri",
      description:
        "Type Kashmiri in English letters and get Kashmiri script as you go, with ژ, ٲ and the Kashmiri vowel marks. Free, private and offline.",
      summary:
        "Write Kashmiri the way you text it in English letters. Each word turns into Kashmiri script when you press Space, and the bar under the editor offers other spellings.",
      bestFor: "Anyone who writes Kashmiri in English letters and wants it in Kashmiri script.",
    },
    example: ["kashur", "کٲشر"],
    guide: [
      { roman: "ts", script: "ژ", examples: [["tsi", "ژٕ"]] },
      { roman: "chh", script: "چھ", examples: [["chhu", "چھ"]] },
      {
        roman: "kh, gh",
        script: "خ  گھ",
        examples: [
          ["khabar", "خبر"],
          ["ghar", "گھر"],
        ],
      },
      { roman: "i (at the end)", script: "ہٕ", examples: [["bi", "بہٕ"]] },
    ],
  },

  "hi-roman": {
    page: {
      title: "English to Hindi Typing: Type Hindi in English Letters Online",
      heading: "English to Hindi Typing",
      description:
        "Type Hindi in English letters (Hinglish) and get Devanagari as you go: namaste becomes नमस्ते. Free, private and offline, with word suggestions.",
      summary:
        "Write Hindi the way you text it in English letters. Each word turns into Devanagari when you press Space, and the bar under the editor offers other spellings. Capitals ask for the retroflex letters: T ट, D ड, N ण, R ड़.",
      bestFor:
        "Anyone who chats in Hinglish and wants proper Hindi script without learning InScript.",
    },
    example: ["namaste", "नमस्ते"],
    guide: [
      {
        roman: "aa, a",
        script: "आ  ा",
        examples: [
          ["aaj", "आज"],
          ["naam", "नाम"],
        ],
      },
      {
        roman: "ee, i",
        script: "ई  ी  ि",
        examples: [
          ["pani", "पानी"],
          ["phir", "फिर"],
        ],
      },
      { roman: "oo, u", script: "ऊ  \u0942  \u0941", examples: [["dukaan", "दुकान"]] },
      {
        roman: "e, ai",
        script: "\u0947  \u0948",
        examples: [
          ["mera", "मेरा"],
          ["kaise", "कैसे"],
        ],
      },
      {
        roman: "kh, gh, ch, chh, jh",
        script: "ख  घ  च  छ  झ",
        examples: [
          ["ghar", "घर"],
          ["bachchon", "बच्चों"],
        ],
      },
      {
        roman: "bh, ph, th, dh",
        script: "भ  फ  थ  ध",
        examples: [
          ["bhai", "भाई"],
          ["dhanyavad", "धन्यवाद"],
        ],
      },
      {
        roman: "n (at the end)",
        script: "\u0902  \u0901",
        examples: [
          ["hain", "हैं"],
          ["baatein", "बातें"],
        ],
      },
      {
        roman: "T D N R",
        script: "ट  ड  ण  ड़",
        examples: [
          ["Tamatar", "टमाटर"],
          ["gaRi", "गाड़ी"],
        ],
      },
    ],
  },

  "bn-roman": {
    page: {
      title: "English to Bangla Typing: Type Bangla in English Letters Online",
      heading: "English to Bangla Typing",
      description:
        "Type Bangla in English letters (ami, tumi, kemon acho) and get Bangla script as you go. Free, private and offline, with word suggestions.",
      summary:
        "Write Bangla the way you text it in English letters. Each word turns into Bangla script when you press Space, and the bar under the editor offers other spellings.",
      bestFor:
        "Anyone who chats in Banglish and wants proper Bangla script without learning a Bangla keyboard.",
    },
    example: ["kemon acho", "কেমন আছো"],
    guide: [
      {
        roman: "a, o",
        script: "আ  া  অ",
        examples: [
          ["ami", "আমি"],
          ["ghor", "ঘর"],
        ],
      },
      {
        roman: "i, ee",
        script: "ই  ি  ী",
        examples: [
          ["tumi", "তুমি"],
          ["pani", "পানি"],
        ],
      },
      { roman: "u", script: "উ  \u09C1", examples: [["bondhu", "বন্ধু"]] },
      { roman: "e", script: "এ  ে", examples: [["kemon", "কেমন"]] },
      {
        roman: "kh, gh, ch, jh",
        script: "খ  ঘ  ছ  ঝ",
        examples: [
          ["khabar", "খাবার"],
          ["acho", "আছো"],
        ],
      },
      {
        roman: "bh, th, dh",
        script: "ভ  থ  ধ",
        examples: [
          ["bhalo", "ভালো"],
          ["kotha", "কথা"],
        ],
      },
      {
        roman: "sh",
        script: "শ  ষ  স",
        examples: [
          ["bhasha", "ভাষা"],
          ["shundor", "সুন্দর"],
        ],
      },
      { roman: "ng", script: "ং", examples: [["bangla", "বাংলা"]] },
    ],
  },
  "mr-roman": {
    page: {
      title: "English to Marathi Typing: Type Marathi in English Letters Online",
      heading: "English to Marathi Typing",
      description:
        "Type Marathi in English letters and get Devanagari as you go: namaskar becomes नमस्कार. Free, private and offline, with word suggestions.",
      summary:
        "Write Marathi the way you text it in English letters. Each word turns into Devanagari when you press Space, and the bar under the editor offers other spellings. The word list picks between ल and ळ and between न and ण; a capital D asks for ड.",
      bestFor:
        "Anyone who chats in Marathi with English letters and wants proper Devanagari without learning InScript.",
    },
    example: ["namaskar", "नमस्कार"],
    guide: [
      {
        roman: "aa, a",
        script: "आ  ा",
        examples: [
          ["aaj", "आज"],
          ["naav", "नाव"],
        ],
      },
      {
        roman: "i, u",
        script: "ई  ी  ऊ  ू",
        examples: [
          ["aai", "आई"],
          ["bhau", "भाऊ"],
        ],
      },
      {
        roman: "kh, gh, ch, chh, jh",
        script: "ख  घ  च  छ  झ",
        examples: [
          ["khup", "खूप"],
          ["chhan", "छान"],
        ],
      },
      {
        roman: "bh, dh",
        script: "भ  ध",
        examples: [["dhanyavad", "धन्यवाद"]],
      },
      {
        roman: "l, n",
        script: "ळ  ण",
        examples: [
          ["shala", "शाळा"],
          ["pani", "पाणी"],
        ],
      },
      { roman: "D", script: "ड", examples: [["gaaDi", "गाडी"]] },
      {
        roman: "dny, ksh",
        script: "ज्ञ  क्ष",
        examples: [
          ["dnyan", "ज्ञान"],
          ["kshama", "क्षमा"],
        ],
      },
    ],
  },

  "gu-roman": {
    page: {
      title: "English to Gujarati Typing: Type Gujarati in English Letters Online",
      heading: "English to Gujarati Typing",
      description:
        "Type Gujarati in English letters (tame kem cho) and get Gujarati script as you go. Free, private and offline, with word suggestions.",
      summary:
        "Write Gujarati the way you text it in English letters. Each word turns into Gujarati script when you press Space, and the bar under the editor offers other spellings. Endings such as -nu and -maa get their nasal by themselves: maru gives મારું.",
      bestFor:
        "Anyone who chats in Gujarati with English letters and wants proper Gujarati script without learning InScript.",
    },
    example: ["kem cho", "કેમ છો"],
    guide: [
      {
        roman: "aa, a",
        script: "આ  ા",
        examples: [
          ["aaj", "આજ"],
          ["naam", "નામ"],
        ],
      },
      {
        roman: "e, i, u",
        script: "ે  ી  ૂ",
        examples: [
          ["mane", "મને"],
          ["khub", "ખૂબ"],
        ],
      },
      {
        roman: "kh, gh, chh, bh, dh",
        script: "ખ  ઘ  છ  ભ  ધ",
        examples: [
          ["ghar", "ઘર"],
          ["bhai", "ભાઈ"],
          ["dhanyavaad", "ધન્યવાદ"],
        ],
      },
      {
        roman: "u (at the end)",
        script: "ું",
        examples: [
          ["maru", "મારું"],
          ["tamaru", "તમારું"],
        ],
      },
      {
        roman: "D, L, n",
        script: "ડ  ળ  ણ",
        examples: [
          ["gaaDi", "ગાડી"],
          ["shaaLa", "શાળા"],
          ["pani", "પાણી"],
        ],
      },
    ],
  },

  "pa-roman": {
    page: {
      title: "English to Punjabi Typing: Type Gurmukhi in English Letters Online",
      heading: "English to Punjabi Typing",
      description:
        "Type Punjabi in English letters (sat sri akal) and get Gurmukhi as you go. Free, private and offline, with word suggestions.",
      summary:
        "Write Punjabi the way you text it in English letters. Each word turns into Gurmukhi when you press Space, and the bar under the editor offers other spellings. A doubled letter gives the addak (pakka ਪੱਕਾ), and the tippi and bindi come by themselves.",
      bestFor:
        "Anyone who chats in Punjabi with English letters and wants proper Gurmukhi without learning InScript.",
    },
    example: ["sat sri akal", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ"],
    guide: [
      {
        roman: "aa, a",
        script: "ਆ  ਾ",
        examples: [
          ["naam", "ਨਾਮ"],
          ["haal", "ਹਾਲ"],
        ],
      },
      {
        roman: "i, u",
        script: "ੀ  ੂ  ੁ",
        examples: [
          ["ki", "ਕੀ"],
          ["khush", "ਖੁਸ਼"],
        ],
      },
      {
        roman: "gh, bh, dh",
        script: "ਘ  ਭ  ਧ",
        examples: [
          ["ghar", "ਘਰ"],
          ["bhra", "ਭਰਾ"],
        ],
      },
      {
        roman: "kk, ll (doubled)",
        script: "ੱ",
        examples: [
          ["pakka", "ਪੱਕਾ"],
          ["gall", "ਗੱਲ"],
        ],
      },
      {
        roman: "n (before a letter or at the end)",
        script: "ੰ  ਂ",
        examples: [
          ["changa", "ਚੰਗਾ"],
          ["mainu", "ਮੈਨੂੰ"],
        ],
      },
      {
        roman: "D, N",
        script: "ੜ  ਣ",
        examples: [
          ["kuDi", "ਕੁੜੀ"],
          ["sohNa", "ਸੋਹਣਾ"],
        ],
      },
      { roman: "z, sh", script: "ਜ਼  ਸ਼", examples: [["zindagi", "ਜ਼ਿੰਦਗੀ"]] },
    ],
  },

  "ta-roman": {
    page: {
      title: "English to Tamil Typing: Type Tamil in English Letters Online",
      heading: "English to Tamil Typing",
      description:
        "Type Tamil in English letters (Tanglish) and get Tamil script as you go: vanakkam becomes வணக்கம். Free, private and offline, with word suggestions.",
      summary:
        "Write Tamil the way you text it in English letters. Each word turns into Tamil script when you press Space, and the bar under the editor offers other spellings. The word list picks between the three n's and the three l's; capitals ask for one: N ண, L ள, R ற, and zh gives ழ.",
      bestFor:
        "Anyone who chats in Tanglish and wants proper Tamil script without learning a Tamil keyboard.",
    },
    example: ["vanakkam", "வணக்கம்"],
    guide: [
      {
        roman: "aa, ee, oo",
        script: "ா  ீ  ூ",
        examples: [
          ["kaalai", "காலை"],
          ["veedu", "வீடு"],
        ],
      },
      {
        roman: "kk, pp, ll (doubled)",
        script: "க்க  ப்ப  ல்ல",
        examples: [
          ["appa", "அப்பா"],
          ["nalla", "நல்ல"],
        ],
      },
      {
        roman: "n",
        script: "ந  ன",
        examples: [
          ["naan", "நான்"],
          ["nandri", "நன்றி"],
        ],
      },
      {
        roman: "N, L, R",
        script: "ண  ள  ற",
        examples: [
          ["vaNakkam", "வணக்கம்"],
          ["paLLi", "பள்ளி"],
          ["aRivu", "அறிவு"],
        ],
      },
      {
        roman: "zh",
        script: "ழ",
        examples: [
          ["tamizh", "தமிழ்"],
          ["vaazhkai", "வாழ்க்கை"],
        ],
      },
      { roman: "m (at the end)", script: "ம்", examples: [["maram", "மரம்"]] },
    ],
  },

  "te-roman": {
    page: {
      title: "English to Telugu Typing: Type Telugu in English Letters Online",
      heading: "English to Telugu Typing",
      description:
        "Type Telugu in English letters (meeru ela unnaru) and get Telugu script as you go. Free, private and offline, with word suggestions.",
      summary:
        "Write Telugu the way you text it in English letters. Each word turns into Telugu script when you press Space, and the bar under the editor offers other spellings. A final m is the anusvara (namaskaram నమస్కారం); capitals ask for a letter: T ట, D డ, N ణ, L ళ.",
      bestFor:
        "Anyone who chats in Telugu with English letters and wants proper Telugu script without learning InScript.",
    },
    example: ["namaskaram", "నమస్కారం"],
    guide: [
      {
        roman: "aa, ee, e",
        script: "ా  ీ  ే",
        examples: [
          ["chaala", "చాలా"],
          ["meeru", "మీరు"],
          ["nenu", "నేను"],
        ],
      },
      {
        roman: "u (at the end)",
        script: "ు",
        examples: [
          ["telugu", "తెలుగు"],
          ["illu", "ఇల్లు"],
        ],
      },
      {
        roman: "mm, kk (doubled)",
        script: "మ్మ  క్క",
        examples: [
          ["amma", "అమ్మ"],
          ["ikkada", "ఇక్కడ"],
        ],
      },
      {
        roman: "n, m (before a letter or at the end)",
        script: "ం",
        examples: [
          ["manchi", "మంచి"],
          ["baagundi", "బాగుంది"],
        ],
      },
      {
        roman: "D, N, L",
        script: "డ  ణ  ళ",
        examples: [
          ["vaaDu", "వాడు"],
          ["raNDi", "రండి"],
          ["kaLLu", "కళ్ళు"],
        ],
      },
    ],
  },

  "kn-roman": {
    page: {
      title: "English to Kannada Typing: Type Kannada in English Letters Online",
      heading: "English to Kannada Typing",
      description:
        "Type Kannada in English letters and get Kannada script as you go: namaskara becomes ನಮಸ್ಕಾರ. Free, private and offline, with word suggestions.",
      summary:
        "Write Kannada the way you text it in English letters. Each word turns into Kannada script when you press Space, and the bar under the editor offers other spellings. A nasal before a letter is the anusvara (thumba ತುಂಬಾ); capitals ask for a letter: T ಟ, D ಡ, N ಣ, L ಳ.",
      bestFor:
        "Anyone who chats in Kannada with English letters and wants proper Kannada script without learning InScript.",
    },
    example: ["namaskara", "ನಮಸ್ಕಾರ"],
    guide: [
      {
        roman: "ee, e",
        script: "ೀ  ೇ",
        examples: [
          ["neeru", "ನೀರು"],
          ["beku", "ಬೇಕು"],
        ],
      },
      {
        roman: "u (at the end)",
        script: "ು",
        examples: [
          ["hesaru", "ಹೆಸರು"],
          ["ondu", "ಒಂದು"],
        ],
      },
      {
        roman: "nn, dd (doubled)",
        script: "ನ್ನ  ಡ್ಡ",
        examples: [
          ["kannada", "ಕನ್ನಡ"],
          ["dodda", "ದೊಡ್ಡ"],
        ],
      },
      {
        roman: "n, m (before a letter)",
        script: "ಂ",
        examples: [["thumba", "ತುಂಬಾ"]],
      },
      {
        roman: "T, D, N, L",
        script: "ಟ  ಡ  ಣ  ಳ",
        examples: [
          ["ooTa", "ಊಟ"],
          ["eraDu", "ಎರಡು"],
          ["haNNu", "ಹಣ್ಣು"],
          ["baLe", "ಬಾಳೆ"],
        ],
      },
    ],
  },

  "ml-roman": {
    page: {
      title: "English to Malayalam Typing: Type Malayalam in English Letters Online",
      heading: "English to Malayalam Typing",
      description:
        "Type Malayalam in English letters (Manglish) and get Malayalam script as you go: namaskaram becomes നമസ്കാരം. Free, private and offline, with word suggestions.",
      summary:
        "Write Malayalam the way you text it in English letters. Each word turns into Malayalam script when you press Space, and the bar under the editor offers other spellings. A final n, r or l becomes a chillu by itself (avan അവൻ), and zh gives ഴ.",
      bestFor:
        "Anyone who chats in Manglish and wants proper Malayalam script without learning InScript.",
    },
    example: ["namaskaram", "നമസ്കാരം"],
    guide: [
      {
        roman: "n, r, l, L (at the end)",
        script: "ൻ  ർ  ൽ  ൾ",
        examples: [
          ["avan", "അവൻ"],
          ["avar", "അവർ"],
          ["kaal", "കാൽ"],
          ["avaL", "അവൾ"],
        ],
      },
      {
        roman: "m (at the end)",
        script: "ം",
        examples: [
          ["malayalam", "മലയാളം"],
          ["pazham", "പഴം"],
        ],
      },
      {
        roman: "u (at the end)",
        script: "്",
        examples: [
          ["aaNu", "ആണ്"],
          ["enikku", "എനിക്ക്"],
        ],
      },
      {
        roman: "nte, nj, ng",
        script: "ന്റെ  ഞ  ങ്ങ",
        examples: [
          ["ente", "എന്റെ"],
          ["njan", "ഞാൻ"],
          ["ningal", "നിങ്ങൾ"],
        ],
      },
      {
        roman: "zh, ll",
        script: "ഴ  ള്ള",
        examples: [
          ["mazha", "മഴ"],
          ["vellam", "വെള്ളം"],
        ],
      },
      { roman: "chch", script: "ച്ഛ", examples: [["achchan", "അച്ഛൻ"]] },
    ],
  },

  "si-roman": {
    page: {
      title: "English to Sinhala Typing: Type Sinhala in English Letters Online",
      heading: "English to Sinhala Typing",
      description:
        "Type Sinhala in English letters (Singlish) and get Sinhala script as you go: kohomada becomes කොහොමද. Free, private and offline, with word suggestions.",
      summary:
        "Write Sinhala the way you text it in English letters (Singlish). Each word turns into Sinhala script when you press Space, and the bar under the editor offers other spellings. A final consonant takes the al-lakuna by itself (pothak පොතක්), and ae gives ඇ.",
      bestFor:
        "Anyone who chats in Singlish and wants proper Sinhala script without learning Wijesekara.",
    },
    example: ["kohomada", "කොහොමද"],
    guide: [
      {
        roman: "a, aa",
        script: "ා",
        examples: [
          ["oya", "ඔයා"],
          ["yannawa", "යනවා"],
        ],
      },
      {
        roman: "e, o",
        script: "ෙ  ො  ේ",
        examples: [
          ["gedara", "ගෙදර"],
          ["mage", "මගේ"],
        ],
      },
      { roman: "ae", script: "ඇ  ෑ", examples: [["kaema", "කෑම"]] },
      {
        roman: "th, w",
        script: "ත  ව",
        examples: [
          ["wathura", "වතුර"],
          ["lankawa", "ලංකාව"],
        ],
      },
      {
        roman: "nd, ng",
        script: "ඳ  ං",
        examples: [
          ["hondin", "හොඳින්"],
          ["sinhala", "සිංහල"],
        ],
      },
      { roman: "L", script: "ළ", examples: [["Lamaya", "ළමයා"]] },
      {
        roman: "(at the end)",
        script: "්",
        examples: [
          ["pothak", "පොතක්"],
          ["ayubowan", "ආයුබෝවන්"],
        ],
      },
    ],
  },
};

export function romanFor(layoutId: string): RomanCopy | undefined {
  return ROMAN[layoutId];
}

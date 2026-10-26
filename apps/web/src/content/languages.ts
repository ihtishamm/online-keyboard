/** Page copy for each language. Original text, written for this site. */
export interface LayoutCopy {
  /** Short description shown above the layout chart. */
  summary: string;
  /** Who this layout suits. */
  bestFor: string;
  /** Page title, heading and meta description when the defaults do not fit the search. */
  title?: string;
  heading?: string;
  description?: string;
}

/** One row of the Roman spelling guide. */
export interface RomanGuideRow {
  roman: string;
  urdu: string;
  examples: [roman: string, urdu: string][];
}

export interface LanguageCopy {
  title: string;
  description: string;
  heading: string;
  headingNative: string;
  intro: string;
  layouts: Record<string, LayoutCopy>;
  tips: string[];
  faqs: { q: string; a: string }[];
  /** Spelling guide shown on the Roman layout page. */
  romanGuide?: RomanGuideRow[];
}

export const COPY: Record<string, LanguageCopy> = {
  urdu: {
    title: "Urdu Keyboard Online: Type in Urdu (اردو) with Nastaliq",
    description:
      "Type Urdu online for free in beautiful Nastaliq. Phonetic and standard layouts, on-screen keyboard for phones, autosave, and nothing to install. Your text never leaves your device.",
    heading: "Urdu Keyboard",
    headingNative: "اردو کی بورڈ",
    intro:
      "Type Urdu with your computer keyboard, by tapping the keys below, or on your phone. Text appears in Nastaliq, the script style Urdu readers expect, and is saved on this device as you write.",
    layouts: {
      "ur-phonetic": {
        summary:
          "Letters sit on the English keys that sound like them: s for س, k for ک, p for پ. Shift gives the related letter, such as Shift+t for ٹ and Shift+d for ڈ.",
        bestFor: "People who already type English and want to start typing Urdu today.",
      },
      "ur-standard": {
        summary:
          'The layout that ships with Windows as "Urdu". Keys follow how often letters are used rather than how they sound.',
        bestFor: "Office and newsroom typists who learnt Urdu typing on Windows.",
      },
      "ur-roman": {
        title: "Roman Urdu to Urdu: Type Urdu in English Letters Online",
        heading: "Roman Urdu to Urdu",
        description:
          "Type Urdu the way you text it, in English letters, and get proper Urdu script as you go. Free, private, with word suggestions and Nastaliq.",
        summary:
          "Type Urdu the way you text it, in English letters. Each word turns into Urdu when you press Space, and the bar under the editor offers other spellings and longer words.",
        bestFor:
          "Anyone who writes Roman Urdu on WhatsApp and wants real Urdu script without learning a keyboard layout.",
      },
    },
    tips: [
      "Press Esc to switch between Urdu and English without leaving the page.",
      "On the Roman layout, type words in English letters (mera naam) and press Space. Press 1 to 6 to pick another spelling, or Esc to keep a word in English.",
      "Shift + a key gives the second character on it. Diacritics such as zabar, zer and pesh are on Shift in the Phonetic layout and on AltGr (right Alt) in the Standard layout.",
      "Shift + AltGr + S types ﷺ. Shift + AltGr + R, Z and A type the honorifics ◌\u0612 (rahmatullah alaih), ◌\u0613 (radiallahu anhu) and ◌\u0611 (alaihis salam).",
      "On a phone, press and hold a key to see related letters, like آ on ا or ں on ن.",
      "Copy your text, share it to WhatsApp, or download it as a .txt file from the toolbar.",
    ],
    faqs: [
      {
        q: "Do I need to install anything to type Urdu?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Which Urdu keyboard layout should I choose?",
        a: "Choose Phonetic if you are new to Urdu typing: letters are on the English keys that sound alike. Choose Standard if you already use the Windows Urdu layout.",
      },
      {
        q: "Why does my Urdu text look different from other websites?",
        a: "We display Urdu in Nastaliq, the traditional calligraphic style used in Urdu books and newspapers. You can switch to the simpler Naskh style from the Font menu.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
      {
        q: "Can I paste the Urdu text into Word, WhatsApp or Facebook?",
        a: "Yes. The keyboard produces standard Unicode Urdu, so it works anywhere text works. Press Copy and paste it wherever you like.",
      },
      {
        q: "Can I type Urdu in English letters (Roman Urdu)?",
        a: "Yes. Choose the Roman layout and type as you would in a text message, for example “aap kaise hain”. Each word becomes Urdu (آپ کیسے ہیں) when you press Space. If a word comes out wrong, pick another spelling from the bar under the editor.",
      },
      {
        q: "How do I type zabar, zer and pesh?",
        a: "On the Phonetic layout use Shift+Y for zabar, Shift+I for zer and Shift+P for pesh. On the Standard layout use AltGr+A, AltGr+I and AltGr+U. On a phone, tap Shift (or AltGr) first, then the key.",
      },
    ],
    romanGuide: [
      {
        roman: "kh",
        urdu: "خ  کھ",
        examples: [
          ["khush", "خوش"],
          ["khana", "کھانا"],
        ],
      },
      {
        roman: "gh",
        urdu: "غ  گھ",
        examples: [
          ["ghalat", "غلط"],
          ["ghar", "گھر"],
        ],
      },
      { roman: "sh", urdu: "ش", examples: [["shaam", "شام"]] },
      {
        roman: "ch, chh",
        urdu: "چ  چھ",
        examples: [
          ["chai", "چائے"],
          ["chhota", "چھوٹا"],
        ],
      },
      {
        roman: "th",
        urdu: "تھ  ٹھ",
        examples: [
          ["tha", "تھا"],
          ["theek", "ٹھیک"],
        ],
      },
      {
        roman: "bh, ph, jh, dh",
        urdu: "بھ  پھ  جھ  دھ",
        examples: [
          ["bhai", "بھائی"],
          ["phir", "پھر"],
          ["mujhe", "مجھے"],
        ],
      },
      {
        roman: "aa",
        urdu: "ا  آ",
        examples: [
          ["baat", "بات"],
          ["aaj", "آج"],
        ],
      },
      {
        roman: "ee, i",
        urdu: "ی",
        examples: [
          ["teen", "تین"],
          ["thi", "تھی"],
        ],
      },
      {
        roman: "e, ay (at the end)",
        urdu: "ے",
        examples: [
          ["mere", "میرے"],
          ["hay", "ہے"],
        ],
      },
      {
        roman: "oo, o, u",
        urdu: "و",
        examples: [
          ["door", "دور"],
          ["ko", "کو"],
        ],
      },
      {
        roman: "n (at the end)",
        urdu: "ں",
        examples: [
          ["main", "میں"],
          ["kahan", "کہاں"],
        ],
      },
      {
        roman: "T D R S Z H",
        urdu: "ٹ  ڈ  ڑ  ص  ض  ح",
        examples: [
          ["baRa", "بڑا"],
          ["Sabr", "صبر"],
        ],
      },
    ],
  },
};

export function copyFor(slug: string): LanguageCopy {
  const copy = COPY[slug];
  if (!copy) throw new Error(`No page copy for "${slug}"`);
  return copy;
}

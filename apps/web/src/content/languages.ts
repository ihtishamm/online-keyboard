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

import { getLanguage } from "@okb/layouts";
import { ROMAN } from "./roman";

export interface LanguageCopy {
  title: string;
  description: string;
  heading: string;
  headingNative: string;
  intro: string;
  layouts: Record<string, LayoutCopy>;
  tips: string[];
  faqs: { q: string; a: string }[];
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
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers. The one exception is voice typing, which you turn on yourself: your browser sends the recording to its speech service to be written out.",
      },
      {
        q: "Can I type Urdu by voice?",
        a: "Yes, in Chrome, Edge and Safari. Press Voice typing, speak Urdu, and your words are typed where the cursor is. Say “فل سٹاپ” for ۔, “سوالیہ نشان” for ؟, “کوما” for ، and “نئی لائن” for a new line. Your browser turns speech into text using its own online service.",
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
  },

  arabic: {
    title: "Arabic Keyboard Online: Type in Arabic (العربية) with Harakat",
    description:
      "Type Arabic online for free with the standard Arabic (101) layout. Harakat, hamza forms, an on-screen keyboard for phones, and autosave. Nothing to install, and your text never leaves your device.",
    heading: "Arabic Keyboard",
    headingNative: "لوحة المفاتيح العربية",
    intro:
      "Type Arabic with your computer keyboard, by tapping the keys below, or on your phone. The layout is the one printed on Arabic keyboards, and your text is saved on this device as you write.",
    layouts: {
      "ar-standard": {
        summary:
          "Arabic (101), the layout printed on Arabic keyboards and built into Windows. Harakat and hamza forms are on Shift.",
        bestFor:
          "Anyone who has typed Arabic on a computer before, or has Arabic letters on their keys.",
      },
    },
    tips: [
      "Press Esc to switch between Arabic and English without leaving the page.",
      "Harakat are on Shift: Shift+Q fatha (◌\u064E), Shift+E damma (◌\u064F), Shift+A kasra (◌\u0650), Shift+X sukun (◌\u0652) and Shift+` shadda (◌\u0651). Tanween is on Shift+W, Shift+R and Shift+S.",
      "Hamza forms: Shift+H types أ, Shift+Y إ, Shift+N آ, X ء, Z ئ and C ؤ.",
      "B types the lam-alef ligature لا in one press, and Shift+G, Shift+T and Shift+B type لأ, لإ and لآ.",
      "On a phone, press and hold a key to reach its Shift character, such as أ on ا.",
      "Copy your text, share it to WhatsApp, or download it as a .txt file from the toolbar.",
    ],
    faqs: [
      {
        q: "Do I need to install anything to type Arabic?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Which Arabic keyboard layout is this?",
        a: "Arabic (101), the standard layout that comes with Windows and is printed on most Arabic keyboards. If you have typed Arabic on a computer before, your fingers already know it.",
      },
      {
        q: "How do I type harakat (tashkeel)?",
        a: "Hold Shift and press Q for fatha, E for damma, A for kasra, X for sukun and ` (the key left of 1) for shadda. Type the letter first, then its haraka.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
      {
        q: "Can I paste the Arabic text into Word, WhatsApp or Facebook?",
        a: "Yes. The keyboard produces standard Unicode Arabic, so it works anywhere text works. Press Copy and paste it wherever you like.",
      },
    ],
  },

  farsi: {
    title: "Farsi Keyboard Online: Type in Persian (فارسی) with Half-Space",
    description:
      "Type Persian online for free with the standard Persian layout. Half-space (ZWNJ), Persian digits, Naskh and Nastaliq fonts, and an on-screen keyboard for phones. Your text never leaves your device.",
    heading: "Farsi Keyboard",
    headingNative: "صفحه\u200Cکلید فارسی",
    intro:
      "Type Persian with your computer keyboard, by tapping the keys below, or on your phone. The layout follows Iran's national standard, and your text is saved on this device as you write.",
    layouts: {
      "fa-standard": {
        summary:
          "Persian (Standard), the layout of Iran's national standard ISIRI 9147, built into Windows. پ, چ, ژ and گ have keys of their own, and Shift+B types the half-space.",
        bestFor: "Anyone who types Persian on Windows, Mac or Linux and wants the same keys here.",
      },
    },
    tips: [
      "Press Esc to switch between Persian and English without leaving the page.",
      "Shift+B types the half-space (نیم\u200Cفاصله), which joins parts of a word without connecting the letters: می\u200Cروم, کتاب\u200Cها.",
      "The number row types Persian digits ۱۲۳. Shift+4 types ریال, and Shift+2 and Shift+3 type the Persian thousands and decimal separators.",
      "Harakat are on Shift: Shift+U fatha (◌\u064E), Shift+Y kasra (◌\u0650), Shift+T damma (◌\u064F), Shift+I shadda (◌\u0651) and Shift+Q sukun (◌\u0652).",
      "Shift+L and Shift+K type the guillemets « » used as quotation marks.",
      "Choose Nastaliq from the Font menu for poetry and calligraphic text.",
    ],
    faqs: [
      {
        q: "Do I need to install anything to type Persian?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "How do I type a half-space (ZWNJ)?",
        a: "Press Shift+B. The half-space keeps the parts of a word such as می\u200Cخواهم apart without a full space, as Persian spelling requires.",
      },
      {
        q: "Why does ی look different from Arabic ي?",
        a: "Persian uses its own ye (ی) and kaf (ک), which this layout types by default. The Arabic forms ي and ك are on Shift+D and Shift+Z for quoting Arabic.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
      {
        q: "Can I paste the Persian text into Word, Telegram or Instagram?",
        a: "Yes. The keyboard produces standard Unicode Persian, so it works anywhere text works. Press Copy and paste it wherever you like.",
      },
    ],
  },

  pashto: {
    title: "Pashto Keyboard Online: Type in Pashto (پښتو)",
    description:
      "Type Pashto online for free with the standard Pashto layout: ښ, ټ, ځ, څ, ډ, ړ, ږ, ګ, ڼ, ۍ and ې, Naskh or Nastaliq, and an on-screen keyboard for phones. Your text never leaves your device.",
    heading: "Pashto Keyboard",
    headingNative: "پښتو کیبورډ",
    intro:
      "Type Pashto with your computer keyboard, by tapping the keys below, or on your phone. Every Pashto letter has a key, and your text is saved on this device as you write.",
    layouts: {
      "ps-standard": {
        summary:
          "The Pashto layout built into Windows. It follows the Persian layout and adds the Pashto letters, mostly on Shift.",
        bestFor: "Anyone who types Pashto on Windows, or already knows the Persian keyboard.",
      },
    },
    tips: [
      "Press Esc to switch between Pashto and English without leaving the page.",
      "Pashto letters on Shift: ښ Shift+A, ۍ Shift+S, ټ Shift+J, ڼ Shift+K, ځ Shift+O, څ Shift+P, ډ Shift+N, ې Shift+X and پ Shift+F.",
      "ړ, ږ and ګ have keys of their own: M, the full stop key and the quote key.",
      "AltGr (right Alt) adds Urdu letters for Pakistani spelling: ٹ AltGr+J, ڈ AltGr+N, ڑ AltGr+M, ں AltGr+F and ے AltGr+D.",
      "Shift+4 types the afghani sign ؋. Choose Nastaliq from the Font menu if you write Pashto in the Pakistani style.",
    ],
    faqs: [
      {
        q: "Do I need to install anything to type Pashto?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "How do I type ښ, ځ and څ?",
        a: "Hold Shift and press A for ښ, O for ځ and P for څ. The other Pashto letters are listed in the tips and in the layout chart below the keyboard.",
      },
      {
        q: "Can I type Pashto in Nastaliq?",
        a: "Yes. Choose Nastaliq from the Font menu. Naskh is the default because it is the common style in Afghanistan.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  sindhi: {
    title: "Sindhi Keyboard Online: Type in Sindhi (سنڌي)",
    description:
      "Type Sindhi online for free with a phonetic layout that has every Sindhi letter: ٻ, ڄ, ڃ, ڇ, ڊ, ڌ, ڍ, ڏ, ڙ, ڦ, ڪ, ڳ, ڱ, ڻ, ٺ, ٽ, ٿ and ڀ. Works on phones, saves as you type.",
    heading: "Sindhi Keyboard",
    headingNative: "سنڌي ڪي بورڊ",
    intro:
      "Type Sindhi with your computer keyboard, by tapping the keys below, or on your phone. Letters sit on the English keys that sound like them, and your text is saved on this device as you write.",
    layouts: {
      "sd-phonetic": {
        summary:
          "Letters sit on English keys that sound alike: s for س, k for ڪ, b for ب. The extra Sindhi letters are on Shift and on the punctuation keys. Based on the open Rachitrali-Sindhi keyboard, adjusted for standard Sindhi spelling.",
        bestFor:
          "People who know the English keyboard and want all 52 Sindhi letters without learning a new layout.",
      },
    },
    tips: [
      "Press Esc to switch between Sindhi and English without leaving the page.",
      "Implosives: ٻ Shift+7, ڄ Shift+L, ڳ the quote key, ڏ the ` key, and ڊ Shift+4.",
      "On the punctuation keys: ٿ [ and ڀ Shift+[, ڱ ] and ٺ Shift+], ڌ \\ and ک Shift+\\.",
      "On Shift with numbers: ڦ 1, ٽ 2, ڙ 3, ڻ 6 and ڍ 9. Shift+F types ڃ and Shift+` types ڇ.",
      "K types ڪ, the usual Sindhi kaf. Shift+H types ھ for aspirated letters such as جھ and گھ.",
    ],
    faqs: [
      {
        q: "Do I need to install anything to type Sindhi?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Where are the extra Sindhi letters?",
        a: "Most are on Shift with the number keys and on the bracket, backslash and quote keys. The layout chart below the keyboard shows every key.",
      },
      {
        q: "Why is the text in Naskh, not Nastaliq?",
        a: "Sindhi books and newspapers are printed in Naskh, and it shows every Sindhi letter clearly, including ڪ.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  shahmukhi: {
    title: "Shahmukhi Keyboard Online: Type Punjabi in Shahmukhi (پنجابی)",
    description:
      "Type Punjabi in Shahmukhi online for free, in Nastaliq. Phonetic layout with ݨ and ࣇ, an on-screen keyboard for phones, and autosave. Your text never leaves your device.",
    heading: "Punjabi (Shahmukhi) Keyboard",
    headingNative: "شاہ مکھی پنجابی",
    intro:
      "Type Punjabi in Shahmukhi with your computer keyboard, by tapping the keys below, or on your phone. Text appears in Nastaliq and is saved on this device as you write.",
    layouts: {
      "pnb-phonetic": {
        summary:
          "Letters sit on English keys that sound alike, as on Urdu phonetic keyboards. Shift+N types ݨ and Shift+L types ࣇ, the letters Punjabi adds to Urdu.",
        bestFor: "Punjabi speakers who already type Urdu or English and want Shahmukhi right away.",
      },
    },
    tips: [
      "Press Esc to switch between Punjabi and English without leaving the page.",
      "Shift+N types ݨ (as in پاݨی) and Shift+L types ࣇ.",
      "H types ھ for aspirated sounds (پھ, کھ, گھ); ح is on Shift+H. Noon ghunna ں is on Shift+M.",
      "Diacritics: zabar AltGr+., zer AltGr+, and pesh AltGr+/.",
      "AltGr+S types ﷺ, AltGr+A types ﷲ and AltGr+B types ﷽.",
    ],
    faqs: [
      {
        q: "Is this Shahmukhi or Gurmukhi?",
        a: "Shahmukhi, the Perso-Arabic script used for Punjabi in Pakistan. It is written right to left, like Urdu.",
      },
      {
        q: "How do I type ݨ?",
        a: "Hold Shift and press N. On a phone, tap Shift first, then ن.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  saraiki: {
    title: "Saraiki Keyboard Online: Type in Saraiki (سرائیکی)",
    description:
      "Type Saraiki online for free, in Nastaliq, with all four implosives ٻ ڄ ݙ ڳ and ݨ. On-screen keyboard for phones and autosave. Your text never leaves your device.",
    heading: "Saraiki Keyboard",
    headingNative: "سرائیکی کی بورڈ",
    intro:
      "Type Saraiki with your computer keyboard, by tapping the keys below, or on your phone. Text appears in Nastaliq and is saved on this device as you write.",
    layouts: {
      "skr-phonetic": {
        summary:
          "A phonetic layout by Parvez Qadir. Letters sit on English keys that sound alike, and the Saraiki implosives are on Shift of the related letter: ٻ on B, ڄ on J, ݙ on F, ڳ on Q.",
        bestFor: "Saraiki writers who know the English or Urdu phonetic keyboard.",
      },
    },
    tips: [
      "Press Esc to switch between Saraiki and English without leaving the page.",
      "Implosives: Shift+B ٻ, Shift+J ڄ, Shift+F ݙ and Shift+Q ڳ. Shift+M types ݨ and Shift+N types ں.",
      "H types ھ for aspirated sounds; ح is on Shift+H.",
      "Zabar is on Shift+. (full stop), zer on Shift+, (comma) and pesh on Shift+P.",
      "Shift+6 types ﷺ.",
    ],
    faqs: [
      {
        q: "How do I type ٻ, ڄ, ݙ and ڳ?",
        a: "Hold Shift and press B, J, F or Q. On a phone, tap Shift first, then the letter.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  balochi: {
    title: "Balochi Keyboard Online: Type in Balochi (بلوچی)",
    description:
      "Type Balochi online for free with a phonetic layout: ۆ, ێ and ے on their own keys, Nastaliq or Naskh, and an on-screen keyboard for phones. Your text never leaves your device.",
    heading: "Balochi Keyboard",
    headingNative: "بلوچی کیبورڈ",
    intro:
      "Type Balochi with your computer keyboard, by tapping the keys below, or on your phone. Text is saved on this device as you write.",
    layouts: {
      "bal-phonetic": {
        summary:
          "A phonetic layout from SIL. Balochi vowels have their own keys (ۆ on U, ێ on I, ے on E), and the short vowels zabar, zer and pesh are on F, V and O.",
        bestFor: "Balochi writers who know the English keyboard.",
      },
    },
    tips: [
      "Press Esc to switch between Balochi and English without leaving the page.",
      "Vowels: U types ۆ, I types ێ, E types ے and Y types ی. F, V and O type zabar, zer and pesh.",
      "Letters from Arabic are on Shift: ق Shift+Q, ف Shift+F, ع Shift+K, غ Shift+M, خ Shift+X and ص Shift+G.",
      "AltGr (right Alt) types ء (AltGr+K), ذ (AltGr+D) and ؤ (AltGr+B), and the Urdu digits ۱۲۳ on AltGr with the number keys.",
    ],
    faqs: [
      {
        q: "Where is ف? The F key types a zabar.",
        a: "This layout puts the short vowels on F, V and O because Balochi uses them often. ف is on Shift+F.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  kashmiri: {
    title: "Kashmiri Keyboard Online: Type in Kashmiri (کٲشُر)",
    description:
      "Type Kashmiri online for free with every Kashmiri vowel: ٲ, ۄ, ؠ and the vowel marks. Nastaliq, an on-screen keyboard for phones, and autosave. Your text never leaves your device.",
    heading: "Kashmiri Keyboard",
    headingNative: "کٲشُر کی بورڈ",
    intro:
      "Type Kashmiri in the Perso-Arabic script with your computer keyboard, by tapping the keys below, or on your phone. Text appears in Nastaliq and is saved on this device as you write.",
    layouts: {
      "ks-phonetic": {
        summary:
          "A phonetic layout from SIL. Letters sit on English keys that sound alike, and the Kashmiri vowels have keys of their own: ٲ on the minus key, ۄ on V, ؠ on Shift+Y.",
        bestFor: "Kashmiri writers who know the English or Urdu phonetic keyboard.",
      },
    },
    tips: [
      "Press Esc to switch between Kashmiri and English without leaving the page.",
      "Vowels: - types ٲ, V types ۄ and Shift+Y types ؠ.",
      "Vowel marks are on Shift: ◌\u065A Shift+F, ◌\u0655 Shift+M, ◌\u0656 Shift+L, ◌\u0657 Shift+U, zer Shift+I, pesh Shift+P and zabar Shift+. (full stop).",
      "ط is on [ and ظ on ]. Shadda is on ` and sukun on the quote key.",
    ],
    faqs: [
      {
        q: "How do I type the Kashmiri vowels?",
        a: "ٲ is on the minus key and ۄ on V. The vowel marks ◌\u065A, ◌\u0655, ◌\u0656 and ◌\u0657 are on Shift+F, Shift+M, Shift+L and Shift+U: type the letter first, then the mark.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  hindi: {
    title: "English to Hindi Typing: Type Hindi in English Letters Online",
    description:
      "Type Hindi in English letters and get Devanagari as you go: namaste becomes नमस्ते. InScript too, an on-screen keyboard for phones, and autosave. Your text never leaves your device.",
    heading: "English to Hindi Typing",
    headingNative: "हिन्दी टाइपिंग",
    intro:
      "Type Hindi in English letters, the way you chat, and each word turns into Devanagari when you press Space. Prefer the Hindi keyboard? Switch to InScript. Your text is saved on this device as you write.",
    layouts: {
      "hi-inscript": {
        title: "Hindi InScript Keyboard Online: Type in Hindi (हिन्दी)",
        heading: "Hindi InScript Keyboard",
        description:
          "Type Hindi online with InScript, the Indian government standard layout. Conjuncts, Devanagari digits, an on-screen keyboard for phones, and autosave.",
        summary:
          "InScript, the Government of India standard built into Windows, macOS and Android. Vowel signs are on the left of the keyboard and consonants on the right.",
        bestFor: "Government and office typists, and anyone who wants the official Hindi layout.",
      },
    },
    tips: [
      "Press Esc to switch between Hindi and English without leaving the page.",
      "On the Roman layout, type words in English letters (mera naam) and press Space. Press 1 to 6 to pick another spelling, or Esc to keep a word in English.",
      "Type a consonant, then a vowel sign: क (K) then ा (E) makes का.",
      "The halant \u094D on D joins consonants: स (M), \u094D (D), त (L) makes स्त.",
      "Full vowels are on Shift of their sign: Shift+E आ, Shift+F इ, Shift+R ई, Shift+G उ, Shift+S ए.",
      "Shift+5 to Shift+8 type ज्ञ, त्र, क्ष and श्र. X types the anusvara \u0902 and Shift+X the chandrabindu \u0901.",
      "AltGr (right Alt) with the number keys types Devanagari digits १२३. Shift+AltGr+4 types ₹.",
    ],
    faqs: [
      {
        q: "Can I type Hindi in English letters?",
        a: "Yes. The page opens on Roman typing: write as you would in a chat, for example “aap kaise hain”, and each word becomes Hindi (आप कैसे हैं) when you press Space. If a word comes out wrong, pick another spelling from the bar under the editor.",
      },
      {
        q: "What is InScript?",
        a: "InScript is the standard keyboard layout for Indian scripts, set by the Government of India. Hindi, Marathi, Bangla and other Indian scripts share the same key positions.",
      },
      {
        q: "How do I type क्ष, त्र and ज्ञ?",
        a: "Press Shift+7 for क्ष, Shift+6 for त्र and Shift+5 for ज्ञ. You can also build any conjunct with the halant on D.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },

  bangla: {
    title: "English to Bangla Typing: Type Bangla in English Letters Online",
    description:
      "Type Bangla in English letters (ami, tumi, kemon acho) and get Bangla script as you go. InScript too, an on-screen keyboard for phones, and autosave. Your text never leaves your device.",
    heading: "English to Bangla Typing",
    headingNative: "বাংলা টাইপিং",
    intro:
      "Type Bangla in English letters, the way you chat, and each word turns into Bangla script when you press Space. Prefer the Bangla keyboard? Switch to InScript. Your text is saved on this device as you write.",
    layouts: {
      "bn-inscript": {
        title: "Bangla InScript Keyboard Online: Type in Bengali (বাংলা)",
        heading: "Bangla InScript Keyboard",
        description:
          "Type Bangla online with the InScript layout. Conjuncts, ৎ, ৳, an on-screen keyboard for phones, and autosave.",
        summary:
          "Bengali InScript, the Indian government standard built into Windows. Vowel signs are on the left of the keyboard and consonants on the right, in the same places as Hindi InScript.",
        bestFor: "Office typists and anyone who wants the standard Bangla layout.",
      },
    },
    tips: [
      "Press Esc to switch between Bangla and English without leaving the page.",
      "On the Roman layout, type words in English letters (kemon acho) and press Space. Press 1 to 6 to pick another spelling, or Esc to keep a word in English.",
      "Type a consonant, then a vowel sign: ক (K) then া (E) makes কা.",
      "The hasanta \u09CD on D joins consonants: ক (K), \u09CD (D), ষ (Shift+,) makes ক্ষ. Shift+7 types ক্ষ in one press.",
      "Shift+J types ৎ and / types য়. For ড়, type ড ([) then the nukta \u09BC (]).",
      "Shift+AltGr+5 types the taka sign ৳ and Shift+AltGr+4 types ₹.",
    ],
    faqs: [
      {
        q: "Can I type Bangla in English letters?",
        a: "Yes. The page opens on Roman typing: write as you would in a chat, for example “kemon acho”, and each word becomes Bangla (কেমন আছো) when you press Space. If a word comes out wrong, pick another spelling from the bar under the editor.",
      },
      {
        q: "Is this the Bijoy or Avro layout?",
        a: "No. This page uses InScript, the standard layout built into Windows. Its keys differ from Bijoy, but every Bangla letter and conjunct can be typed.",
      },
      {
        q: "How do I type conjuncts (যুক্তাক্ষর)?",
        a: "Type the first consonant, the hasanta \u09CD (D key), then the next consonant. Common ones have shortcuts: Shift+7 ক্ষ, Shift+6 ত্র, Shift+5 জ্ঞ.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The keyboard runs in your browser on Windows, Mac, Linux, Android and iPhone. There is nothing to download.",
      },
      {
        q: "Is my text private?",
        a: "Yes. Your text is saved only in this browser on this device. It is never sent to our servers.",
      },
    ],
  },
};

export function copyFor(slug: string): LanguageCopy {
  const copy = COPY[slug];
  if (!copy) throw new Error(`No page copy for "${slug}"`);
  // Roman layouts keep their copy with their spelling guide (roman.ts).
  const roman = Object.fromEntries(
    getLanguage(slug).layouts.flatMap((id) => (ROMAN[id] ? [[id, ROMAN[id].page]] : [])),
  );
  const romanId = getLanguage(slug).layouts.find((id) => ROMAN[id]);
  const tips =
    romanId && !copy.tips.some((t) => t.includes("Roman layout"))
      ? [
          ...copy.tips.slice(0, 1),
          `On the Roman layout, type words in English letters (${ROMAN[romanId]!.example[0]}) and press Space. Press 1 to 6 to pick another spelling, or Esc to keep a word in English.`,
          ...copy.tips.slice(1),
        ]
      : copy.tips;
  return { ...copy, tips, layouts: { ...roman, ...copy.layouts } };
}

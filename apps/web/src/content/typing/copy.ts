import { keystrokeMap } from "@okb/engine";
import { getLayout } from "@okb/layouts";
import { strokeName } from "../../components/typing/keys";

/**
 * What the typing pages say in, and about, each language: the heading in the language, and
 * one tip on the letters that slow learners down. Original text. Outside Latin script the
 * tips name keys straight from the layout (`on`), so they cannot drift from it. The headings
 * outside Latin script use the English loanwords those languages' typing sites use; none has
 * been reviewed by a native speaker yet.
 */
export interface TypingCopy {
  /** "Typing tutor" and "typing test" in the language. */
  tutor: string;
  test: string;
  /** The letters to watch, and how the layouts reach them. */
  tip: string;
}

/** "ټ on Shift + J, ښ on Shift + A": where each letter is on a layout. */
function on(layoutId: string, letters: string): string {
  const keys = keystrokeMap(getLayout(layoutId));
  return [...letters]
    .map((ch) => {
      const k = keys.get(ch);
      if (!k) throw new Error(`${layoutId} has no key for ${ch}`);
      return `${ch} on ${strokeName(k)}`;
    })
    .join(", ");
}

/** The key alone: "Shift + B". */
const key = (layoutId: string, ch: string) => on(layoutId, ch).replace(/^.* on /su, "");

function NON_LATIN(): Record<string, TypingCopy> {
  const h = "hi-inscript";
  const b = "bn-inscript";
  return {
    hi: {
      tutor: "हिन्दी टाइपिंग ट्यूटर",
      test: "हिन्दी टाइपिंग टेस्ट",
      tip: `On InScript a vowel sign is typed after its consonant, even one written before it: क (${key(h, "क")}) and then ि (${key(h, "ि")}) make कि. The virama \u094D (${key(h, "\u094D")}) joins consonants: क, \u094D, ष make क्ष.`,
    },
    bn: {
      tutor: "বাংলা টাইপিং টিউটর",
      test: "বাংলা টাইপিং টেস্ট",
      tip: `On InScript a vowel sign is typed after its consonant, even one written before it: ক (${key(b, "ক")}) and then ি (${key(b, "ি")}) make কি. The hasanta \u09CD (${key(b, "\u09CD")}) joins consonants: ক, \u09CD, ষ make ক্ষ.`,
    },
    ar: {
      tutor: "تعلم الكتابة على لوحة المفاتيح",
      test: "اختبار سرعة الكتابة",
      tip: `Watch the letters that look alike: ة (${key("ar-standard", "ة")}) and ه, ى (${key("ar-standard", "ى")}) and ي. Each hamza has a key of its own: ${on("ar-standard", "ءأإؤئ")}.`,
    },
    fa: {
      tutor: "آموزش تایپ فارسی",
      test: "تست تایپ فارسی",
      tip: `The letters Arabic lacks are ${on("fa-standard", "پچژگ")}. ${key("fa-standard", "\u200c")} types the half space (zero-width non-joiner) inside words such as می\u200Cروم and کتاب\u200Cها.`,
    },
    ps: {
      tutor: "د پښتو ټایپ زده کړه",
      test: "د پښتو ټایپ ازموینه",
      tip: `Pashto's own letters: ${on("ps-standard", "ټډړښږځڅ")}.`,
    },
    sd: {
      tutor: "سنڌي ٽائپنگ ٽيوٽر",
      test: "سنڌي ٽائپنگ ٽيسٽ",
      tip: `Sindhi's extra letters: ${on("sd-phonetic", "ٻڄڃڇڙ")}, and ڪ, Sindhi's k, is on ${key("sd-phonetic", "ڪ")}.`,
    },
    pnb: {
      tutor: "پنجابی ٹائپنگ ٹیوٹر",
      test: "پنجابی ٹائپنگ ٹیسٹ",
      tip: `ݨ, Punjabi's retroflex n, is on ${key("pnb-phonetic", "ݨ")}.`,
    },
    skr: {
      tutor: "سرائیکی ٹائپنگ ٹیوٹر",
      test: "سرائیکی ٹائپنگ ٹیسٹ",
      tip: `Saraiki's own letters: ${on("skr-phonetic", "ٻڄݙڳݨ")}.`,
    },
    bal: {
      tutor: "بلوچی ٹائپنگ ٹیوٹر",
      test: "بلوچی ٹائپنگ ٹیسٹ",
      tip: `ء is written as a word of its own (ءَ, ءُ): it is on ${key("bal-phonetic", "ء")}, and the zabar \u064E on ${key("bal-phonetic", "\u064E")}.`,
    },
    brh: {
      tutor: "براہوی ٹائپنگ ٹیوٹر",
      test: "براہوی ٹائپنگ ٹیسٹ",
      tip: `Brahui's ڷ, written for its own l sound, is on ${key("brh-rachitrali", "ڷ")}.`,
    },
    scl: {
      tutor: "شینا ٹائپنگ ٹیوٹر",
      test: "شینا ٹائپنگ ٹیسٹ",
      tip: `Shina's own letters: ${on("scl-rachitrali", "ڇڅڙݜݨ")}.`,
    },
    khw: {
      tutor: "کھوار ٹائپنگ ٹیوٹر",
      test: "کھوار ٹائپنگ ٹیسٹ",
      tip: `Khowar's own letters: ${on("khw-rachitrali", "ݯݰݮݱ")}.`,
    },
    ks: {
      tutor: "کٲشُر ٹایپنگ ٹیوٹر",
      test: "کٲشُر ٹایپنگ ٹیسٹ",
      tip: `ٲ, Kashmiri's own vowel letter, is on ${key("ks-phonetic", "ٲ")}.`,
    },
    dv: {
      tutor: "ދިވެހި ޓައިޕިންގ ޓިއުޓަރު",
      test: "ދިވެހި ޓައިޕިންގ ޓެސްޓު",
      tip: `Every consonant takes a vowel sign or a sukun: type the letter first, then the sign. The sukun \u07B0 is on ${key("dv-phonetic", "\u07B0")}, and alifu އ, the seat of a vowel with no consonant, on ${key("dv-phonetic", "އ")}.`,
    },
    ckb: {
      tutor: "فێرکاری تایپی کوردی",
      test: "تاقیکردنەوەی تایپی کوردی",
      tip: `Sorani's own letters: ${on("ckb-standard", "ەێۆڕڵ")}.`,
    },
    ug: {
      tutor: "ئۇيغۇرچە خەت بېسىش دەرسلىكى",
      test: "ئۇيغۇرچە خەت بېسىش سىنىقى",
      tip: `A word that begins with a vowel starts with ئ, on ${key("ug-standard", "ئ")}. Uyghur's own vowels: ${on("ug-standard", "ەېۇۆۈ")}.`,
    },
    prs: {
      tutor: "آموزش تایپ دری",
      test: "آزمون تایپ دری",
      tip: `The letters Arabic lacks are ${on("prs-clra", "پچژگ")}. The half-space is on ${key("prs-clra", "\u200C")}.`,
    },
    zlm: {
      tutor: "ڤلاجرن مناءيڤ جاوي",
      test: "اوجين مناءيڤ جاوي",
      tip: `Jawi's own letters: ${on("zlm-standard", "ݢڤچڽڠ")}.`,
    },
    mr: {
      tutor: "मराठी टायपिंग ट्यूटर",
      test: "मराठी टायपिंग टेस्ट",
      tip: `ळ, which Hindi lacks, is on ${key("mr-inscript", "ळ")}. A vowel sign is typed after its consonant, even one written before it: क and then ि (${key("mr-inscript", "ि")}) make कि.`,
    },
    gu: {
      tutor: "ગુજરાતી ટાઇપિંગ ટ્યુટર",
      test: "ગુજરાતી ટાઇપિંગ ટેસ્ટ",
      tip: `On InScript a vowel sign is typed after its consonant, even one written before it: ક and then િ (${key("gu-inscript", "િ")}) make કિ. The virama \u0ACD (${key("gu-inscript", "\u0ACD")}) joins consonants, and ળ is on ${key("gu-inscript", "ળ")}.`,
    },
    pa: {
      tutor: "ਪੰਜਾਬੀ ਟਾਈਪਿੰਗ ਟਿਊਟਰ",
      test: "ਪੰਜਾਬੀ ਟਾਈਪਿੰਗ ਟੈਸਟ",
      tip: `The addak \u0A71 (${key("pa-inscript", "\u0A71")}) comes before the letter it doubles: ਪ, \u0A71, ਕ, ਾ make ਪੱਕਾ. The tippi \u0A70 is on ${key("pa-inscript", "\u0A70")} and the bindi \u0A02 on ${key("pa-inscript", "\u0A02")}.`,
    },
    ta: {
      tutor: "தமிழ் டைப்பிங் பயிற்சி",
      test: "தமிழ் டைப்பிங் டெஸ்ட்",
      tip: `The pulli \u0BCD (${key("ta-inscript", "\u0BCD")}) ends a consonant: க and \u0BCD make க். ${on("ta-inscript", "ழளற")}.`,
    },
    te: {
      tutor: "తెలుగు టైపింగ్ ట్యూటర్",
      test: "తెలుగు టైపింగ్ టెస్ట్",
      tip: `The virama \u0C4D (${key("te-inscript", "\u0C4D")}) joins consonants: క, \u0C4D, ష make క్ష. The anusvara ం is on ${key("te-inscript", "ం")}.`,
    },
    kn: {
      tutor: "ಕನ್ನಡ ಟೈಪಿಂಗ್ ಟ್ಯೂಟರ್",
      test: "ಕನ್ನಡ ಟೈಪಿಂಗ್ ಟೆಸ್ಟ್",
      tip: `The virama \u0CCD (${key("kn-inscript", "\u0CCD")}) joins consonants: ನ, \u0CCD, ನ make ನ್ನ. The anusvara ಂ is on ${key("kn-inscript", "ಂ")} and ಳ on ${key("kn-inscript", "ಳ")}.`,
    },
    ml: {
      tutor: "മലയാളം ടൈപ്പിംഗ് ട്യൂട്ടർ",
      test: "മലയാളം ടൈപ്പിംഗ് ടെസ്റ്റ്",
      tip: `Each chillu has its own key: ${on("ml-inscript", "ൻർൽൾ")}. The virama \u0D4D is on ${key("ml-inscript", "\u0D4D")} and ഴ on ${key("ml-inscript", "ഴ")}.`,
    },
    si: {
      tutor: "සිංහල ටයිපිං පුහුණුව",
      test: "සිංහල ටයිපිං පරීක්ෂණය",
      tip: `On Wijesekara the al-lakuna \u0DCA (${key("si-wijesekara", "\u0DCA")}) ends a consonant: ක and \u0DCA make ක්. The vowel sign ා is on ${key("si-wijesekara", "ා")}.`,
    },
    ne: {
      tutor: "नेपाली टाइपिङ ट्युटर",
      test: "नेपाली टाइपिङ टेस्ट",
      tip: `On the traditional layout ा is on ${key("ne-traditional", "ा")} and ि on ${key("ne-traditional", "ि")}. Shift with a consonant key types its half form: क is ${key("ne-traditional", "क")}, so Shift with it types क्.`,
    },
    or: {
      tutor: "ଓଡ଼ିଆ ଟାଇପିଂ ଟ୍ୟୁଟର",
      test: "ଓଡ଼ିଆ ଟାଇପିଂ ଟେଷ୍ଟ",
      tip: `On InScript a vowel sign is typed after its consonant, even one written before it: କ and then \u0B3F (${key("or-inscript", "\u0B3F")}) make କି. The halant \u0B4D (${key("or-inscript", "\u0B4D")}) joins consonants.`,
    },
    as: {
      tutor: "অসমীয়া টাইপিং টিউটৰ",
      test: "অসমীয়া টাইপিং পৰীক্ষা",
      tip: `ৰ, Assamese's own ra, is on ${key("as-inscript", "ৰ")} and ৱ on ${key("as-inscript", "ৱ")}. A vowel sign is typed after its consonant: ক and then ি (${key("as-inscript", "ি")}) make কি.`,
    },
    sa: {
      tutor: "संस्कृत टङ्कन शिक्षक",
      test: "संस्कृत टङ्कन परीक्षा",
      tip: `The visarga ः is on ${key("sa-inscript", "ः")} and the halant \u094D on ${key("sa-inscript", "\u094D")}: त and \u094D make त्, as at the end of भवेत्.`,
    },
    kok: {
      tutor: "कोंकणी टायपिंग ट्यूटर",
      test: "कोंकणी टायपिंग टेस्ट",
      tip: `ळ is on ${key("kok-inscript", "ळ")}. A vowel sign is typed after its consonant, even one written before it: क and then ि (${key("kok-inscript", "ि")}) make कि.`,
    },
    mai: {
      tutor: "मैथिली टाइपिंग ट्यूटर",
      test: "मैथिली टाइपिंग टेस्ट",
      tip: `The avagraha ऽ (कऽ) is on ${key("mai-inscript", "ऽ")}, and the chandrabindu \u0901 (अहाँ) on ${key("mai-inscript", "\u0901")}.`,
    },
  };
}

export const TYPING_COPY: Readonly<Record<string, TypingCopy>> = {
  es: {
    tutor: "Curso de mecanografía",
    test: "Test de mecanografía",
    tip: "On the Spain and Latin American layouts, ñ has a key of its own next to L. Accented vowels take two presses: the accent key first, then the vowel.",
  },
  fr: {
    tutor: "Cours de dactylographie",
    test: "Test de dactylographie",
    tip: "AZERTY swaps A with Q and Z with W, and puts M beside L. é, è, à and ç have their own keys on the top row; ê and the other circumflexes come from the ^ key, then the vowel.",
  },
  it: {
    tutor: "Corso di dattilografia",
    test: "Test di dattilografia",
    tip: "The Italian layout has keys of its own for à, è, ì, ò and ù, and é is Shift + è, so Italian needs no dead keys. Capitals such as È have no key there: Easy accents types È with ` and then Shift + E.",
  },
  de: {
    tutor: "Tippen lernen",
    test: "Tipptest",
    tip: "QWERTZ swaps Y and Z. ä, ö and ü sit to the right of L and P, and ß is next to 0. Nouns start with a capital, so you will press Shift more often than in English.",
  },
  pt: {
    tutor: "Curso de digitação",
    test: "Teste de digitação",
    tip: "ç has its own key beside L. For ã and õ press the tilde key first, then the vowel; for á, é and the other acute accents use the accent key, then the vowel.",
  },
  tr: {
    tutor: "On parmak klavye kursu",
    test: "Klavye hız testi",
    tip: "Turkish has a dotless ı and a dotted i on separate keys: on Turkish Q the dotless ı is where English has I. ğ, ü, ş, ç and ö have keys of their own on the right.",
  },
  pl: {
    tutor: "Kurs pisania na klawiaturze",
    test: "Test szybkości pisania",
    tip: "Polish programmer's layout is US QWERTY with AltGr: AltGr + A types ą, AltGr + L types ł, and AltGr + X types ź (AltGr + Z is ż).",
  },
  nl: {
    tutor: "Leren typen",
    test: "Typetest",
    tip: "Most Dutch words need no accents at all. The few that do (één, ruïne, café) take the accent key first and then the vowel.",
  },
  ro: {
    tutor: "Curs de dactilografie",
    test: "Test de dactilografie",
    tip: "The Romanian standard layout has keys for ă, â, î, ș and ț. ș and ț have a comma below, not a cedilla: type them here and you get the correct letters.",
  },
  cs: {
    tutor: "Výuka psaní na klávesnici",
    test: "Test rychlosti psaní",
    tip: "On Czech QWERTZ the number row types ě, š, č, ř, ž, ý, á, í and é; numbers need Shift. ů is beside L, and ú is on the key to the right of P.",
  },
  hu: {
    tutor: "Gépírás-oktató",
    test: "Gépírási sebességteszt",
    tip: "Hungarian QWERTZ swaps Y and Z. ö, ü and ó are on the number row, ő and ú beside P, and é, á and ű beside L. The long ő and ű have keys of their own, apart from ö and ü.",
  },
  sv: {
    tutor: "Lär dig touchskrivning",
    test: "Skrivtest",
    tip: "å, ä and ö have keys of their own to the right of P and L: they are letters of the Swedish alphabet, not accented vowels.",
  },
  ca: {
    tutor: "Curs de mecanografia",
    test: "Test de mecanografia",
    tip: "Catalan uses the Spanish keyboard: à, è and ò from the ` key, é, í, ó and ú from the ´ key, then the vowel. ç is on the row of ñ, by the Enter key. For the middle dot of l·l press Shift + 3.",
  },
  hr: {
    tutor: "Tečaj tipkanja",
    test: "Test brzine tipkanja",
    tip: "Croatian QWERTZ swaps Y and Z. š and đ are to the right of P, č and ć to the right of L, and ž by the Enter key.",
  },
  ...NON_LATIN(),
};

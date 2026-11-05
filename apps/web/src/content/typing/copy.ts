import { keystrokeMap } from "@okb/engine";
import { getLayout } from "@okb/layouts";
import { strokeName } from "../../components/typing/keys";

/**
 * What the typing pages say in, and about, each language: the heading in the language, and
 * one tip on the letters that slow learners down. Original text. Outside Latin script the
 * tips name keys straight from the layout (`on`), so they cannot drift from it. The headings
 * outside Latin script use the English loanwords those languages' typing sites use; none has
 * been reviewed by a native speaker yet. Yoruba, Igbo, Wolof and Hawaiian stay in English
 * until someone who writes them can give the phrases.
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
    el: {
      tutor: "Εκμάθηση πληκτρολόγησης",
      test: "Τεστ ταχύτητας πληκτρολόγησης",
      tip: `The tonos is a dead key: press ${key("el-standard", "΄")}, then the vowel. σ is on ${key("el-standard", "σ")} and final ς on ${key("el-standard", "ς")}.`,
    },
    he: {
      tutor: "לימוד הקלדה",
      test: "מבחן מהירות הקלדה",
      tip: `Final letters have keys of their own: ${on("he-standard", "ךםןףץ")}.`,
    },
    hy: {
      tutor: "Տպագրության ուսուցում",
      test: "Տպագրության արագության թեստ",
      tip: `On the phonetic layout the number row holds letters: ${on("hy-phonetic", "էթփձջրչճ")}. Digits need AltGr.`,
    },
    th: {
      tutor: "ฝึกพิมพ์สัมผัส",
      test: "ทดสอบความเร็วการพิมพ์",
      tip: `Kedmanee keeps letters on the number row too: ${on("th-kedmanee", "ภถคตจขช")}. Type vowels in the order they are written.`,
    },
    lo: {
      tutor: "ຝຶກພິມດີດ",
      test: "ທົດສອບຄວາມໄວພິມ",
      tip: `The number row holds letters here: ${on("lo-standard", "ຢຟຖຄຕຈຂຊ")}. Type vowels in the order they are written.`,
    },
    km: {
      tutor: "រៀនវាយអក្សរ",
      test: "តេស្តល្បឿនវាយអក្សរ",
      tip: `The coeng is ${key("km-nida", "\u17D2")}: it puts the next consonant below the one before it, as in ស្ត. Type a vowel after its consonant, even when it is drawn before it.`,
    },
    my: {
      tutor: "လက်ကွက်လေ့ကျင့်ခန်း",
      test: "စာရိုက်အမြန်နှုန်းစမ်းသပ်ခြင်း",
      tip: `Type the consonant first, then the vowel drawn before it: ${on("my-standard", "\u1031")}. The asat is ${key("my-standard", "\u103A")} and the stacking sign is ${key("my-standard", "\u1039")}.`,
    },
    ko: {
      tutor: "타자 연습",
      test: "타자 속도 테스트",
      tip: `Letters join into syllables as you type. Consonants are on the left and vowels on the right, and Shift doubles a consonant: ${on("ko-2set", "ㅃㅉㄸㄲㅆ")}.`,
    },
    ka: {
      tutor: "ბეჭდვის მასწავლებელი",
      test: "ბეჭდვის სიჩქარის ტესტი",
      tip: `On the QWERTY layout Shift types other letters, not capitals: ${on("ka-qwerty", "თჭღშჟძჩ")}.`,
    },
    ru: {
      tutor: "Тренажёр слепой печати",
      test: "Тест скорости печати",
      tip: `The letters people reach for most slowly: ${on("ru-standard", "ёъэ")}. On the phonetic layout, ${on("ru-phonetic", "ячшщю")}.`,
    },
    uk: {
      tutor: "Тренажер сліпого друку",
      test: "Тест швидкості друку",
      tip: `Ukrainian's own letters: ${on("uk-standard", "іїєґ")}, and the apostrophe on ${key("uk-standard", "'")}.`,
    },
    be: {
      tutor: "Трэнажор сляпога друку",
      test: "Тэст хуткасці друку",
      tip: `Belarusian's own letters: ${on("be-standard", "ўі")}, and the apostrophe on ${key("be-standard", "'")}.`,
    },
    bg: {
      tutor: "Тренажор за бързо писане",
      test: "Тест за скорост на писане",
      tip: `On БДС: ${on("bg-standard", "ъьщ")}. On the phonetic layout: ${on("bg-phonetic", "ъщчя")}.`,
    },
    sr: {
      tutor: "Вежбе куцања",
      test: "Тест брзине куцања",
      tip: `Serbian's own letters: ${on("sr-standard", "љњјћђџ")}.`,
    },
    mk: {
      tutor: "Вежби за пишување",
      test: "Тест за брзина на пишување",
      tip: `Macedonian's own letters: ${on("mk-standard", "љњѕјѓќџ")}.`,
    },
    kk: {
      tutor: "Жазу жаттықтырғышы",
      test: "Жазу жылдамдығын тексеру",
      tip: `Kazakh's own letters are on the number row: ${on("kk-standard", "әіңғүұқөһ")}. Digits need Shift.`,
    },
    ky: {
      tutor: "Терүү машыктыргычы",
      test: "Терүү ылдамдыгын текшерүү",
      tip: `Kyrgyz's own letters use AltGr: ${on("ky-standard", "ңөү")}.`,
    },
    tg: {
      tutor: "Машқи чопкунӣ",
      test: "Санҷиши суръати чопкунӣ",
      tip: `Tajik's own letters: ${on("tg-standard", "ғӣқӯҳҷ")}.`,
    },
    mn: {
      tutor: "Бичих дасгал",
      test: "Бичих хурдны шалгалт",
      tip: `Mongolian's keys are not arranged like Russian's: ${on("mn-standard", "аеоөү")}. Digits need Shift.`,
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
  sk: {
    tutor: "Kurz písania na klávesnici",
    test: "Test rýchlosti písania",
    tip: "Slovak QWERTZ swaps Y and Z. The number row types ľ, š, č, ť, ž, ý, á, í and é; digits need Shift. ú and ä are right of P, ô right of L, and ň by Enter.",
  },
  sl: {
    tutor: "Tečaj tipkanja",
    test: "Test hitrosti tipkanja",
    tip: "Slovenian QWERTZ swaps Y and Z. š is to the right of P, č to the right of L, and ž by the Enter key.",
  },
  sq: {
    tutor: "Kurs shtypjeje",
    test: "Test i shpejtësisë së shtypjes",
    tip: "The Albanian keyboard swaps Y and Z. ç is to the right of P and ë to the right of L, and ë comes up more than almost any other letter.",
  },
  lt: {
    tutor: "Spausdinimo pamokos",
    test: "Spausdinimo greičio testas",
    tip: "The number keys 1 to 8 type ą, č, ę, ė, į, š, ų and ū, and the = key types ž.",
  },
  lv: {
    tutor: "Rakstīšanas kurss",
    test: "Rakstīšanas ātruma tests",
    tip: "Hold AltGr and press the plain letter: AltGr + A types ā, AltGr + S š, AltGr + N ņ. Keep your left hand home, and use your right thumb for AltGr.",
  },
  et: {
    tutor: "Trükkimise õpetus",
    test: "Trükkimiskiiruse test",
    tip: "ü and õ are to the right of P, ö and ä to the right of L. They are ordinary letters here, so keep them on the little finger.",
  },
  fi: {
    tutor: "Konekirjoituskurssi",
    test: "Kirjoitusnopeustesti",
    tip: "ö and ä are to the right of L, under your right little finger. Finnish uses them all the time, so they are worth learning first.",
  },
  nb: {
    tutor: "Touchkurs",
    test: "Skrivetest",
    tip: "å is to the right of P, and ø and æ to the right of L, in that order.",
  },
  da: {
    tutor: "Touchkursus",
    test: "Skrivetest",
    tip: "å is to the right of P, and æ and ø to the right of L, in that order: the reverse of Norwegian.",
  },
  is: {
    tutor: "Fingrasetning",
    test: "Innsláttarpróf",
    tip: "ð is to the right of P, æ to the right of L, ö on the - key and þ on the / key. For á, press the ´ key right of æ, then a.",
  },
  fo: {
    tutor: "Knappaskeið",
    test: "Skrivroynd",
    tip: "æ and ø are to the right of L, and ð two keys right of P. For á, press the ´ key by Backspace, then a.",
  },
  ga: {
    tutor: "Cúrsa clóscríbhneoireachta",
    test: "Tástáil luais",
    tip: "Hold AltGr and press the vowel for the fada: AltGr + A types á, AltGr + E é.",
  },
  cy: {
    tutor: "Cwrs teipio",
    test: "Prawf teipio",
    tip: "AltGr + 6 is the to bach: press it, then the vowel, so AltGr + 6 then w types ŵ.",
  },
  gd: {
    tutor: "Cùrsa sgrìobhaidh",
    test: "Deuchainn sgrìobhaidh",
    tip: "The grave comes first: press the key left of 1, then the vowel, so that key then a types à.",
  },
  mt: {
    tutor: "Kors tat-tajpjar",
    test: "Test tat-tajpjar",
    tip: "ċ is left of 1, ġ and ħ are right of P, and ż is left of Z on 47-key keyboards. għ is two keys: g, then ħ.",
  },
  gl: {
    tutor: "Curso de mecanografía",
    test: "Proba de mecanografía",
    tip: "Galician uses the Spanish keyboard: ñ is right of L, and the ´ key beside it, then a vowel, types á, é, í, ó or ú.",
  },
  eo: {
    tutor: "Tajpokurso",
    test: "Tajpotesto",
    tip: "Hold AltGr and press the plain letter: AltGr + C types ĉ, AltGr + S ŝ, AltGr + U ŭ.",
  },
  la: {
    tutor: "Cursus dactylographiae",
    test: "Probatio dactylographiae",
    tip: "Most printed Latin needs only the plain alphabet. Where a sentence has a macron, hold AltGr and press the vowel: AltGr + A types ā.",
  },
  af: {
    tutor: "Tikkursus",
    test: "Tiktoets",
    tip: 'Marks come first, then the letter: ^ then e types ê, " then e types ë.',
  },
  az: {
    tutor: "Yazı kursu",
    test: "Yazı sürəti testi",
    tip: "On the Azerbaijani layout ü is on W, ö and ğ right of P, ı and ə right of L, and ç and ş on the comma and period keys.",
  },
  tk: {
    tutor: "Ýazuw kursy",
    test: "Ýazuw tizligi synagy",
    tip: "On the Turkmen layout ä is on Q, ü on X, ç on C and ý on V. ň and ö are right of P, and ş is by Enter.",
  },
  uz: {
    tutor: "Yozish kursi",
    test: "Yozish tezligi testi",
    tip: "Hold AltGr for the two special letters: AltGr + O types oʻ and AltGr + G types gʻ.",
  },
  kmr: {
    tutor: "Kursa nivîsandinê",
    test: "Testa nivîsandinê",
    tip: "Hold AltGr and press the plain letter: AltGr + E types ê, AltGr + I î, AltGr + U û and AltGr + S ş.",
  },
  yo: {
    tutor: "Typing tutor",
    test: "Typing test",
    tip: "Practice words come as they are written. Hold AltGr for AltGr + E ẹ, AltGr + O ọ and AltGr + S ṣ, press ' or ` before a plain vowel to add a tone, and AltGr + ] or AltGr + [ after ẹ or ọ.",
  },
  ig: {
    tutor: "Typing tutor",
    test: "Typing test",
    tip: "Hold AltGr and press the plain letter: AltGr + I types ị, AltGr + O ọ, AltGr + U ụ and AltGr + N ṅ.",
  },
  ha: {
    tutor: "Koyon rubutu",
    test: "Gwajin rubutu",
    tip: "Hold AltGr and press the plain letter: AltGr + B types ɓ, AltGr + D ɗ, AltGr + K ƙ and AltGr + Y ƴ.",
  },
  wo: {
    tutor: "Typing tutor",
    test: "Typing test",
    tip: 'On Easy accents AltGr + N types ñ and AltGr + G ŋ. For ë, press " then e.',
  },
  haw: {
    tutor: "Typing tutor",
    test: "Typing test",
    tip: "Hold AltGr and press the vowel for its kahakō: AltGr + A types ā. AltGr + ; types the ʻokina.",
  },
  mi: {
    tutor: "Akoranga patopato",
    test: "Whakamātautau patopato",
    tip: "Hold AltGr and press the vowel for its tohutō: AltGr + A types ā, AltGr + O ō.",
  },
  vi: {
    tutor: "Luyện gõ phím",
    test: "Kiểm tra tốc độ gõ",
    tip: "Marks are keys of their own. On Telex: aa â, aw ă, ee ê, oo ô, ow ơ, uw ư, dd đ, then s f r x j for the tones. On VNI: digits 1 to 9.",
  },
  ...NON_LATIN(),
};

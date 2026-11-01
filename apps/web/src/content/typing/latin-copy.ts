/**
 * What the Latin-script typing pages say in, and about, each language: the heading in the
 * language, and one tip on the letters that slow learners down. Original text.
 */
export interface TypingCopy {
  /** "Typing tutor" and "typing test" in the language. */
  tutor: string;
  test: string;
  /** The letters to watch, and how the layouts reach them. */
  tip: string;
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
};

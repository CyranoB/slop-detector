declare module 'wink-pos-tagger' {
  interface PosToken {
    value: string;
    tag: string;
    pos: string;
    lemma?: string;
  }

  interface PosTagger {
    tagSentence(text: string): PosToken[];
  }

  function winkPosTagger(): PosTagger;
  export = winkPosTagger;
}

/**
 * ────────────────────────────────────────────────────────────
 *  EDIT THIS FILE. This is the only file you need to touch.
 * ────────────────────────────────────────────────────────────
 */

export const config = {
  /** The card at the very start. */
  opening: {
    kicker: "for you",
    title: "Today was a lot.",
    subtitle: "So here's everything else.",
  },

  /** The card at the very end. */
  closing: {
    title: "Still my favourite person.",
    subtitle: "Bad day and all.",
    signoff: "— me",
  },

  /**
   * Background music. Drop an .mp3 or .m4a into public/ and put the
   * filename here, e.g. "song.mp3". Set to null for no music.
   */
  music: null as string | null,

  /** Music volume, 0 to 1. */
  musicVolume: 0.55,

  /**
   * Play the audio from your video clips too? Usually false when you have
   * music, otherwise it's a mess.
   */
  keepClipAudio: false,

  /** Warm and soft by default. Swap for any hex colours you like. */
  theme: {
    background: "#1a1214",
    glowA: "#e8927c",
    glowB: "#7c6ce8",
    text: "#fdf6f0",
    accent: "#f0b7a4",
  },
} as const;

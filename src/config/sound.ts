/**
 * Tunable values of the ambient sound (`src/lib/ambient.ts`). Everything is
 * synthesized with Web Audio; there are no sound files. Levels are linear
 * gains before the master volume. Frequencies are in Hz.
 */
export const sound = {
  /** Master volume while sound is on. */
  volume: 0.18,
  /** Seconds to fade in and out when sound is toggled or the scene hides. */
  fade: 1.4,
  /**
   * Time constant (seconds) of the swell when sound comes in: on load it
   * follows the intro build-up (squared, so it starts barely audible), and
   * after a held-back start it rises from silence.
   */
  swell: 1.2,
  /** Cursor speed (NDC units per second) that stirs the sound fully, as in CursorWind. */
  fullSpeed: 1.6,
  /** Rate of change of `night` (per second) that blows the flight's whoosh fully. */
  fullFlight: 0.45,

  /** Day: airy wind in gusts, stronger and brighter while the cursor moves. */
  day: {
    /** Body of the wind: band-passed pink noise, the band rises with the gusts. */
    wind: 0.2,
    windFreq: [320, 1100],
    /** High, breathy air on top. */
    air: 0.06,
    airFreq: 5200,
    /** A faint whistle that sings up when the cursor blows hard. */
    whistle: 0.05,
    whistleFreq: [650, 1500],
  },

  /** Night: a low rumble and a dark drone, with a shimmer of dust under the cursor light. */
  night: {
    /** Level of the whole night layer, relative to the day. */
    level: 2,
    rumble: 0.22,
    rumbleFreq: 150,
    /** Root of the drone (A1); its partials form an A minor chord. */
    droneRoot: 55,
    drone: 0.05,
    /** Lowpass over the drone; it opens a little as the cursor stirs the dust. */
    droneFreq: [220, 650],
    shimmer: 0.07,
    shimmerFreq: 2600,
  },

  /** Rush of air during the flight between day and night. */
  flight: {
    whoosh: 0.35,
    /** Its band rises with the camera. */
    whooshFreq: [240, 1400],
  },

  /** Shared space, so the layers and the clicks sit in one room. */
  reverb: {
    seconds: 3.5,
    /** Send level by day and by night. */
    day: 0.18,
    night: 0.45,
  },

  /**
   * A soft click on every press, tuned into the ambience: a pitched tick in
   * A minor pentatonic (degree by cursor x), bright and short by day, low and
   * ringing by night, with a breath of the world's noise. It also stirs the
   * ambience for a moment. Plays on every click, also on the nav buttons and
   * from the keyboard.
   */
  click: {
    volume: 0.22,
    /** Root pitch by day and by night (A5, A3). */
    pitch: [880, 220],
    /** Decay in seconds by day and by night. */
    decay: [0.09, 0.5],
    /** Band of the noise tick by day and by night. */
    noiseFreq: [6000, 1200],
    /** Semitones above the root, picked by cursor x. */
    scale: [0, 3, 5, 7, 10, 12],
    /** How much each click stirs the ambience (0..1). */
    stir: 0.35,
  },

  /**
   * A calm piano loop in A minor (Am, F, C, G, Am, F, C, Em): a slow broken
   * chord in the left hand and a sparse melody above. Synthesized from a few
   * inharmonic partials per note, the high ones fading first. The notes stay
   * the same by day and night, but with `night` the piano turns slightly
   * electric (a Rhodes-like bark and tine, a gentle tremolo) and wetter.
   */
  piano: {
    volume: 0.3,
    /** Reverb send by day. */
    reverb: 0.5,
    bpm: 64,
    /** Seconds a low note rings; higher notes ring shorter. */
    ring: 5,
    /** Slight timing and velocity variation, so the loop doesn't sound mechanical. */
    humanize: { time: 0.012, velocity: 0.06 },
    /** The electric piano of the night, each at full `night`. */
    night: {
      /** FM index of the bark on the attack (the fundamental modulating itself). */
      bark: 1.1,
      /** Level of the short bell of the tine, seven times the pitch. */
      tine: 0.12,
      /** How much the piano's own overtones are thinned out (0..1). */
      thinOvertones: 0.55,
      /** Tremolo depth (0..1 of the volume) and rate in Hz. */
      tremolo: 0.16,
      tremoloRate: 4.2,
      /** Reverb send. */
      reverb: 1.3,
    },
  },
} as const;

/**
 * The piano loop as [beat, MIDI note, velocity 0..1]. Eight bars of four
 * beats; the loop length is `pianoLoopBeats`.
 */
const chords: [number, number, number, number][] = [
  [45, 52, 59, 60], // Am(add9)
  [41, 48, 55, 57], // F(add9)
  [48, 55, 62, 64], // C(add9)
  [43, 50, 57, 59], // G(add9)
  [45, 52, 59, 60], // Am(add9)
  [41, 48, 55, 57], // F(add9)
  [48, 55, 62, 64], // C(add9)
  [40, 47, 55, 59], // Em
];
const melody: [number, number][][] = [
  [[0, 76], [2, 74], [3, 72]],
  [[0, 72], [2.5, 69]],
  [[0, 67], [2, 72]],
  [[0, 71], [2.5, 74]],
  [[0, 76], [2, 79], [3, 76]],
  [[0, 77], [2.5, 76]],
  [[0, 72], [2, 74], [3, 76]],
  [[0, 71]],
];
export const pianoLoopBeats = chords.length * 4;
export const pianoNotes: readonly [number, number, number][] = chords
  .flatMap((chord, bar) => [
    ...chord.map((note, i): [number, number, number] => [bar * 4 + i, note, i === 0 ? 0.38 : 0.26]),
    ...melody[bar].map(([beat, note]): [number, number, number] => [bar * 4 + beat, note, 0.5]),
  ])
  .sort((a, b) => a[0] - b[0]);

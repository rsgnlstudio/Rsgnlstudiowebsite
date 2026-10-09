import { pianoLoopBeats, pianoNotes, sound } from "@/config/sound";
import { useSceneStore } from "@/store/scene";
import { useSoundStore } from "@/store/sound";

/*
 * The ambient sound, synthesized with Web Audio (no sound files).
 *
 *   day:    pink noise -> wind band ─┐
 *           white noise -> air ──────┤ dayBus ─┐
 *           pink noise -> whistle ───┘          │
 *   night:  brown noise -> rumble ──┐           ├─ mix ─┬────────────── master -> limiter -> out
 *           drone (A minor) ────────┤ nightBus ─┤       └─ reverb send ┘
 *           white noise -> shimmer ─┘           │
 *   flight: pink noise -> whoosh ───────────────┤
 *   clicks ─────────────────────────────────────┘
 *   piano ── master, and a reverb send (wetter and slightly electric by night)
 *
 * Every animation frame `tick` reads `night` from the scene store and the
 * cursor speed, and moves the parameters: day and night cross-fade with
 * `night`, the cursor stirs the wind (day) and the dust shimmer (night), the
 * flight between them rushes. One engine per page load, created on the first
 * user gesture (the sound toggle).
 */

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Interpolates frequencies on a log scale, so the sweep sounds even. */
const lerpFreq = (a: number, b: number, t: number) => a * Math.pow(b / a, t);
/** Frame-rate independent smoothing toward a target (as MathUtils.damp). */
const damp = (from: number, to: number, lambda: number, dt: number) =>
  lerp(from, to, 1 - Math.exp(-lambda * dt));

/** Seconds of looped noise; filtered, the loop is inaudible. */
const NOISE_SECONDS = 6;

type NoiseColor = "white" | "pink" | "brown";

/** Stereo noise with decorrelated channels, so it sounds wide. */
function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    // Paul Kellet's pink filter; a leaky integrator for brown.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "white") {
        data[i] = white * 0.5;
      } else if (color === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = brown * 3.5;
      }
    }
  }
  return buffer;
}

/** A dark, diffuse room: decaying stereo noise, low-passed as it fades. */
function impulseResponse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // The tail gets darker: more smoothing the later it is.
      smooth = lerp(Math.random() * 2 - 1, smooth, 0.2 + 0.7 * t);
      data[i] = smooth * Math.pow(1 - t, 3);
    }
  }
  return buffer;
}

class AmbientEngine {
  private readonly ctx = new AudioContext({ latencyHint: "playback" });
  private readonly white = noiseBuffer(this.ctx, "white");
  private readonly pink = noiseBuffer(this.ctx, "pink");
  private readonly brown = noiseBuffer(this.ctx, "brown");

  private readonly master = this.ctx.createGain();
  private readonly mix = this.ctx.createGain();
  private readonly reverbSend = this.ctx.createGain();
  private readonly reverb = this.ctx.createConvolver();
  private readonly piano = this.ctx.createGain();
  private readonly pianoSend = this.ctx.createGain();
  private readonly tremolo = this.ctx.createGain();

  private readonly dayBus = this.ctx.createGain();
  private readonly wind = this.ctx.createBiquadFilter();
  private readonly windGain = this.ctx.createGain();
  private readonly windPan = this.ctx.createStereoPanner();
  private readonly airGain = this.ctx.createGain();
  private readonly whistle = this.ctx.createBiquadFilter();
  private readonly whistleGain = this.ctx.createGain();

  private readonly nightBus = this.ctx.createGain();
  private readonly rumbleGain = this.ctx.createGain();
  private readonly drone = this.ctx.createBiquadFilter();
  private readonly shimmerGain = this.ctx.createGain();
  private readonly shimmerPan = this.ctx.createStereoPanner();

  private readonly whoosh = this.ctx.createBiquadFilter();
  private readonly whooshGain = this.ctx.createGain();

  private enabled = false;
  private audible = false;
  private frame = 0;
  private lastTime = 0;
  private suspendTimer = 0;

  // Cursor, from window pointer events.
  private pointerX = 0;
  private lastPointer: { x: number; y: number } | null = null;
  private travelled = 0;
  private stir = 0;
  private clickStir = 0;

  // Piano loop: when the current loop started, and the next note to schedule.
  private pianoStart = -1;
  private pianoNext = 0;

  private lastNight = useSceneStore.getState().night;
  private flight = 0;

  constructor() {
    const { ctx } = this;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.01;
    limiter.release.value = 0.3;
    this.master.gain.value = 0;
    this.master.connect(limiter).connect(ctx.destination);

    this.reverb.buffer = impulseResponse(ctx, sound.reverb.seconds);
    this.reverb.connect(this.master);
    this.mix.connect(this.master);
    this.mix.connect(this.reverbSend).connect(this.reverb);

    // Piano.
    this.piano.gain.value = sound.piano.volume;
    this.piano.connect(this.master);
    this.pianoSend.gain.value = sound.piano.reverb;
    this.piano.connect(this.pianoSend).connect(this.reverb);
    // Tremolo of the night's electric piano: an LFO on the piano's volume.
    const tremoloLfo = ctx.createOscillator();
    tremoloLfo.frequency.value = sound.piano.night.tremoloRate;
    this.tremolo.gain.value = 0;
    tremoloLfo.connect(this.tremolo).connect(this.piano.gain);
    tremoloLfo.start();

    // Day.
    this.dayBus.connect(this.mix);
    this.wind.type = "bandpass";
    this.loop(this.pink, 0).connect(this.wind).connect(this.windGain).connect(this.windPan).connect(this.dayBus);
    const airHigh = ctx.createBiquadFilter();
    airHigh.type = "highpass";
    airHigh.frequency.value = sound.day.airFreq;
    this.loop(this.white, 1.3).connect(airHigh).connect(this.airGain).connect(this.windPan);
    this.whistle.type = "bandpass";
    this.whistle.Q.value = 14;
    this.loop(this.pink, 2.9).connect(this.whistle).connect(this.whistleGain).connect(this.windPan);

    // Night.
    this.nightBus.connect(this.mix);
    const rumble = ctx.createBiquadFilter();
    rumble.type = "lowpass";
    rumble.frequency.value = sound.night.rumbleFreq;
    this.loop(this.brown, 0.7).connect(rumble).connect(this.rumbleGain).connect(this.nightBus);
    this.drone.type = "lowpass";
    this.drone.Q.value = 0.7;
    const droneGain = ctx.createGain();
    droneGain.gain.value = sound.night.drone;
    this.drone.connect(droneGain).connect(this.nightBus);
    // A, E, A, C, E: an open A minor chord, each partial a slightly detuned
    // pair that breathes in its own slow swell.
    [1, 1.5, 2, 2.378, 3].forEach((ratio, i) => {
      const voice = ctx.createGain();
      voice.gain.value = 0.5 / (1 + i * 0.5);
      const swell = ctx.createOscillator();
      swell.frequency.value = 0.03 + i * 0.017;
      const depth = ctx.createGain();
      depth.gain.value = voice.gain.value * 0.8;
      swell.connect(depth).connect(voice.gain);
      swell.start();
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = sound.night.droneRoot * ratio;
        osc.detune.value = detune;
        osc.connect(voice);
        osc.start();
      }
      voice.connect(this.drone);
    });
    const shimmer = ctx.createBiquadFilter();
    shimmer.type = "bandpass";
    shimmer.frequency.value = sound.night.shimmerFreq;
    shimmer.Q.value = 1.5;
    this.loop(this.white, 4.1).connect(shimmer).connect(this.shimmerGain).connect(this.shimmerPan).connect(this.nightBus);

    // Flight.
    this.whoosh.type = "bandpass";
    this.whoosh.Q.value = 0.9;
    this.loop(this.pink, 3.7).connect(this.whoosh).connect(this.whooshGain).connect(this.mix);

    for (const gain of [this.dayBus, this.nightBus, this.windGain, this.airGain, this.whistleGain, this.rumbleGain, this.shimmerGain, this.whooshGain]) {
      gain.gain.value = 0;
    }

    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("click", this.onClick, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    window.clearTimeout(this.suspendTimer);
    if (enabled) {
      if (!document.hidden) void this.ctx.resume();
      if (!this.frame) {
        this.lastTime = performance.now();
        this.frame = requestAnimationFrame(this.tick);
      }
    } else {
      // Let the fade run out, then stop the context and the loop.
      this.suspendTimer = window.setTimeout(() => {
        if (this.enabled) return;
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.audible = false;
        void this.ctx.suspend();
      }, sound.fade * 1500);
    }
  }

  /** Stops everything for good: closes the audio context and removes the listeners. */
  dispose() {
    this.enabled = false;
    window.clearTimeout(this.suspendTimer);
    cancelAnimationFrame(this.frame);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("click", this.onClick);
    document.removeEventListener("visibilitychange", this.onVisibility);
    void this.ctx.close();
  }

  /** A looped noise source, started at `offset` seconds so loops don't line up. */
  private loop(buffer: AudioBuffer, offset: number) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start(0, offset % NOISE_SECONDS);
    return source;
  }

  private set(param: AudioParam, value: number, tau = 0.08) {
    param.setTargetAtTime(value, this.ctx.currentTime, tau);
  }

  private tick = (time: number) => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(Math.max((time - this.lastTime) / 1000, 1e-3), 0.1);
    this.lastTime = time;
    const t = this.ctx.currentTime;
    const { night, sceneMode } = useSceneStore.getState();

    // Fade with the toggle, and out while no page shows the scene.
    const audible = this.enabled && sceneMode !== "hidden";
    if (audible !== this.audible) {
      this.audible = audible;
      this.set(this.master.gain, audible ? sound.volume : 0, sound.fade / 3);
    }

    // Cursor speed: rises fast with a flick, eases off slowly like a gust.
    const target = clamp01(this.travelled / dt / sound.fullSpeed);
    this.travelled = 0;
    this.stir = damp(this.stir, target, target > this.stir ? 8 : 1.2, dt);
    this.clickStir = damp(this.clickStir, 0, 1.5, dt);
    const stir = clamp01(this.stir + this.clickStir);

    // The flight between day and night rushes while `night` moves.
    const rate = Math.abs(night - this.lastNight) / dt;
    this.lastNight = night;
    this.flight = damp(this.flight, clamp01(rate / sound.fullFlight), 4, dt);

    // Equal-power cross-fade of the two worlds.
    this.set(this.dayBus.gain, Math.cos((night * Math.PI) / 2), 0.15);
    this.set(this.nightBus.gain, Math.sin((night * Math.PI) / 2) * sound.night.level, 0.15);
    this.set(this.reverbSend.gain, lerp(sound.reverb.day, sound.reverb.night, night), 0.3);

    // Day: slow gusts from a few drifting waves, blown up by the cursor.
    const gust = clamp01(
      0.5 + 0.25 * Math.sin(t * 0.11) + 0.15 * Math.sin(t * 0.27 + 1.3) + 0.1 * Math.sin(t * 0.63 + 2.1),
    );
    const { day } = sound;
    this.set(this.windGain.gain, day.wind * (0.3 + 0.4 * gust + 0.6 * stir), 0.25);
    this.set(this.wind.frequency, lerpFreq(day.windFreq[0], day.windFreq[1], 0.35 * gust + 0.65 * stir), 0.25);
    this.set(this.wind.Q, 0.9 - 0.4 * stir, 0.25);
    this.set(this.airGain.gain, day.air * (0.5 + 0.5 * gust + 1.2 * stir), 0.25);
    this.set(this.whistleGain.gain, day.whistle * (0.2 * gust + stir * stir), 0.3);
    this.set(this.whistle.frequency, lerpFreq(day.whistleFreq[0], day.whistleFreq[1], 0.3 * gust + 0.7 * stir), 0.4);
    // The wind comes from where the cursor is.
    this.set(this.windPan.pan, this.pointerX * 0.5, 0.3);

    // Night: a breathing rumble; the cursor light stirs a shimmer of dust.
    const { night: dark } = sound;
    this.set(this.rumbleGain.gain, dark.rumble * (0.8 + 0.2 * Math.sin(t * 0.07)), 0.4);
    this.set(this.drone.frequency, lerpFreq(dark.droneFreq[0], dark.droneFreq[1], 0.25 + 0.15 * Math.sin(t * 0.05) + 0.6 * stir), 0.4);
    this.set(this.shimmerGain.gain, dark.shimmer * (0.1 + stir), 0.2);
    this.set(this.shimmerPan.pan, this.pointerX * 0.7, 0.2);

    this.schedulePiano();
    const { piano } = sound;
    this.set(this.pianoSend.gain, lerp(piano.reverb, piano.night.reverb, night), 0.3);
    this.set(this.tremolo.gain, piano.volume * piano.night.tremolo * night, 0.3);

    this.set(this.whooshGain.gain, sound.flight.whoosh * this.flight, 0.15);
    this.set(this.whoosh.frequency, lerpFreq(sound.flight.whooshFreq[0], sound.flight.whooshFreq[1], night), 0.15);
  };

  /** Schedules the piano notes due in the next moment, looping forever. */
  private schedulePiano() {
    const { piano } = sound;
    const beat = 60 / piano.bpm;
    const now = this.ctx.currentTime;
    if (this.pianoStart < 0) this.pianoStart = now + 0.5;
    for (;;) {
      const [noteBeat, note, velocity] = pianoNotes[this.pianoNext];
      const time = this.pianoStart + noteBeat * beat;
      if (time > now + 0.25) break;
      // Notes that were due while the page lagged are skipped, not bunched up.
      if (time > now - 0.05) {
        const h = piano.humanize;
        this.pianoNote(
          Math.max(time + (Math.random() * 2 - 1) * h.time, now),
          note,
          velocity * (1 + (Math.random() * 2 - 1) * h.velocity),
        );
      }
      this.pianoNext++;
      if (this.pianoNext === pianoNotes.length) {
        this.pianoNext = 0;
        this.pianoStart += pianoLoopBeats * beat;
      }
    }
  }

  /**
   * One soft piano note: a few slightly stretched partials, the high ones
   * fading first. With `night` it turns into an electric piano: fewer
   * overtones, a bark of FM on the attack and the short bell of a tine.
   */
  private pianoNote(time: number, midi: number, velocity: number) {
    const { ctx } = this;
    const electric = sound.piano.night;
    const night = useSceneStore.getState().night;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    // Low notes ring longer.
    const ring = sound.piano.ring * Math.pow(2, -(midi - 45) / 24);
    const note = ctx.createGain();
    note.gain.value = velocity;
    note.connect(this.piano);
    let partialsLeft = 0;
    for (let n = 1; n <= 5; n++) {
      const freq = f * n * Math.sqrt(1 + 0.0004 * n * n);
      if (freq > 12000) break;
      const decay = ring / Math.pow(n, 0.8);
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      // Softer touch, fewer overtones; fewer still on the electric piano.
      const thin = n === 1 ? 1 : 1 - electric.thinOvertones * night;
      const level = Math.pow(n, -1.6) * (n === 1 ? 1 : 0.4 + 0.6 * velocity) * thin;
      this.pianoPartial(note, osc, level, time, decay, () => --partialsLeft === 0);
      partialsLeft++;
      if (n === 1 && night > 0) {
        // The bark: the fundamental modulates itself, hard on the attack.
        const modulator = ctx.createOscillator();
        modulator.frequency.value = freq;
        const index = ctx.createGain();
        const depth = freq * electric.bark * night * (0.5 + velocity);
        index.gain.setValueAtTime(depth, time);
        index.gain.setTargetAtTime(depth * 0.15, time, 0.25);
        modulator.connect(index).connect(osc.frequency);
        modulator.start(time);
        modulator.stop(time + decay * 1.5);
        modulator.onended = () => index.disconnect();
      }
    }
    // The tine: a short, quiet bell high above the note.
    if (night > 0 && f * 7 < 12000) {
      const tine = ctx.createOscillator();
      tine.frequency.value = f * 7;
      partialsLeft++;
      this.pianoPartial(note, tine, electric.tine * night * velocity, time, 0.4, () => --partialsLeft === 0);
    }
  }

  /** Plays one partial of a piano note; `last` says whether it was the note's last one. */
  private pianoPartial(
    note: GainNode,
    osc: OscillatorNode,
    level: number,
    time: number,
    decay: number,
    last: () => boolean,
  ) {
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(level, time + 0.006);
    env.gain.setTargetAtTime(0, time + 0.006, decay / 4);
    osc.connect(env).connect(note);
    osc.start(time);
    osc.stop(time + decay * 1.5);
    osc.onended = () => {
      env.disconnect();
      if (last()) note.disconnect();
    };
  }

  private onPointerMove = (event: PointerEvent) => {
    // In NDC units of the screen height, as CursorWind measures speed.
    const x = (event.clientX / window.innerHeight) * 2;
    const y = (event.clientY / window.innerHeight) * 2;
    if (this.lastPointer) this.travelled += Math.hypot(x - this.lastPointer.x, y - this.lastPointer.y);
    this.lastPointer = { x, y };
    this.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
  };

  private onClick = (event: MouseEvent) => {
    // Keyboard presses have no position: use the middle of the element.
    let x = event.clientX;
    if (event.detail === 0 && event.target instanceof Element) {
      const rect = event.target.getBoundingClientRect();
      x = rect.left + rect.width / 2;
    }
    this.click(x / window.innerWidth);
  };

  private onVisibility = () => {
    if (document.hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  };

  /** A soft tick tuned into the current world; `x` (0..1) picks the note and the side. */
  private click(x: number) {
    const { ctx } = this;
    if (!this.audible || ctx.state !== "running") return;
    const { click } = sound;
    const night = useSceneStore.getState().night;
    const t = ctx.currentTime;
    const decay = lerp(click.decay[0], click.decay[1], night);
    const degree = click.scale[Math.min(click.scale.length - 1, Math.floor(clamp01(x) * click.scale.length))];
    const pitch = lerpFreq(click.pitch[0], click.pitch[1], night) * Math.pow(2, degree / 12);

    const out = ctx.createGain();
    out.gain.value = click.volume;
    const pan = ctx.createStereoPanner();
    pan.pan.value = (x * 2 - 1) * 0.6;
    out.connect(pan).connect(this.mix);

    // The tone: a sine with a faint airy overtone by day.
    const tone = ctx.createGain();
    tone.gain.setValueAtTime(0, t);
    tone.gain.linearRampToValueAtTime(1, t + 0.004);
    tone.gain.exponentialRampToValueAtTime(1e-4, t + decay);
    tone.connect(out);
    const partials: [number, number][] = [[1, 1], [2.01, lerp(0.35, 0.08, night)]];
    for (const [ratio, level] of partials) {
      const osc = ctx.createOscillator();
      osc.frequency.value = pitch * ratio;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(tone);
      osc.start(t);
      osc.stop(t + decay + 0.05);
      osc.onended = () => gain.disconnect();
    }

    // The breath: a few milliseconds of the world's noise.
    const breath = ctx.createBufferSource();
    breath.buffer = this.white;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = lerpFreq(click.noiseFreq[0], click.noiseFreq[1], night);
    band.Q.value = 1.2;
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.6, t);
    breathGain.gain.exponentialRampToValueAtTime(1e-4, t + 0.03);
    breath.connect(band).connect(breathGain).connect(out);
    breath.start(t, Math.random() * (NOISE_SECONDS - 1), 0.05);
    breath.onended = () => {
      breathGain.disconnect();
      window.setTimeout(() => {
        tone.disconnect();
        pan.disconnect();
      }, (decay + 0.1) * 1000);
    };

    // And it stirs the ambience for a moment.
    this.clickStir = Math.max(this.clickStir, click.stir);
  }
}

/**
 * The engine lives on globalThis, so a hot reload of this module in
 * development finds the one that is playing instead of starting a second.
 */
const holder = globalThis as typeof globalThis & {
  __ambientEngine?: Pick<AmbientEngine, "dispose" | "setEnabled">;
};

/**
 * Turns the ambient sound on or off. Must first be called from a user
 * gesture (e.g. a click), since browsers only allow audio after one.
 */
export function setSoundEnabled(enabled: boolean) {
  useSoundStore.getState().setEnabled(enabled);
  if (enabled && !(holder.__ambientEngine instanceof AmbientEngine)) {
    // An engine from before a hot reload is a different class; replace it.
    holder.__ambientEngine?.dispose();
    holder.__ambientEngine = new AmbientEngine();
  }
  holder.__ambientEngine?.setEnabled(enabled);
}

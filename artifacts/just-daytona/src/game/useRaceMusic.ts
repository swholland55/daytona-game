import { useRef, useCallback } from 'react';

const BPM = 148;
const B = 60 / BPM;

type N = [number, number]; // [freq_hz, beats], freq=0 → rest

// 8-bar loop in G major, 4/4 time
const MELODY: N[] = [
  // Bar 1
  [392, 1], [440, 1], [494, 1], [440, 1],
  // Bar 2
  [392, 2], [0, 1], [392, 1],
  // Bar 3
  [440, 1], [494, 1], [523, 1], [494, 1],
  // Bar 4
  [440, 2], [0, 1], [440, 1],
  // Bar 5
  [587, 1], [659, 1], [587, 1], [494, 1],
  // Bar 6
  [440, 2], [392, 1], [440, 1],
  // Bar 7
  [494, 1], [440, 1], [392, 1], [370, 1],
  // Bar 8
  [392, 3], [0, 1],
];

// Harmony — a third below the melody
const HARMONY: N[] = [
  [294, 1], [330, 1], [392, 1], [330, 1],
  [294, 2], [0, 1], [294, 1],
  [330, 1], [392, 1], [440, 1], [392, 1],
  [330, 2], [0, 1], [330, 1],
  [494, 1], [523, 1], [494, 1], [392, 1],
  [330, 2], [294, 1], [330, 1],
  [392, 1], [330, 1], [294, 1], [277, 1],
  [294, 3], [0, 1],
];

// Bass — root/fifth pattern
const BASS: N[] = [
  [196, 2], [147, 2],
  [196, 2], [147, 2],
  [131, 2], [196, 2],
  [131, 2], [196, 2],
  [165, 2], [247, 2],
  [165, 2], [247, 2],
  [147, 2], [220, 2],
  [196, 4],
];

// Kick-like pulse on beats 1 and 3 (filtered noise burst)
const KICK_BEATS = [0, 2]; // within each bar

function scheduleNotes(
  ctx: AudioContext,
  dest: AudioNode,
  notes: N[],
  type: OscillatorType,
  vol: number,
  startAt: number,
): number {
  let t = startAt;
  for (const [freq, beats] of notes) {
    const dur = beats * B;
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(dest);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.setValueAtTime(vol, t + dur * 0.72);
      gain.gain.linearRampToValueAtTime(0, t + dur * 0.88);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
  return t;
}

function scheduleKicks(ctx: AudioContext, dest: AudioNode, startAt: number, barCount: number) {
  for (let bar = 0; bar < barCount; bar++) {
    for (const beat of KICK_BEATS) {
      const t = startAt + (bar * 4 + beat) * B;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(t);
    }
  }
}

export function useRaceMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const mutedRef = useRef(false);

  const scheduleLoop = useCallback((ctx: AudioContext, master: GainNode, startAt: number) => {
    const endMelody = scheduleNotes(ctx, master, MELODY, 'square', 0.10, startAt);
    scheduleNotes(ctx, master, HARMONY, 'square', 0.055, startAt);
    scheduleNotes(ctx, master, BASS, 'sawtooth', 0.07, startAt);
    scheduleKicks(ctx, master, startAt, 8);

    const msUntilLoop = (endMelody - ctx.currentTime - 0.15) * 1000;
    loopTimerRef.current = setTimeout(() => {
      if (playingRef.current) scheduleLoop(ctx, master, endMelody);
    }, Math.max(0, msUntilLoop));
  }, []);

  const start = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = mutedRef.current ? 0 : 0.7;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
    scheduleLoop(ctx, master, ctx.currentTime + 0.25);
  }, [scheduleLoop]);

  const stop = useCallback(() => {
    playingRef.current = false;
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.3);
    }
    setTimeout(() => {
      ctxRef.current?.close();
      ctxRef.current = null;
      masterRef.current = null;
    }, 1000);
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(
        mutedRef.current ? 0 : 0.7,
        ctxRef.current.currentTime,
        0.1,
      );
    }
    return mutedRef.current;
  }, []);

  return { start, stop, toggleMute };
}

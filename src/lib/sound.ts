// Pemutar nada notifikasi berbasis Web Audio API (tanpa file audio).
// Beberapa pilihan tone; dipakai untuk notifikasi pesan masuk / confidence rendah / error.

let ctx: AudioContext | null = null;
const getCtx = (): AudioContext => {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
};

// Mainkan 1 nada dengan envelope halus (tanpa "klik").
function note(freq: number, startOffset: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + startOffset;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.03);
}

type Pattern = () => void;

const patterns: Record<string, Pattern> = {
  ding: () => note(880, 0, 0.28),
  pop: () => note(620, 0, 0.12, 'triangle', 0.22),
  chime: () => { note(660, 0, 0.18); note(990, 0.11, 0.24); },
  tritone: () => { note(523, 0, 0.12); note(659, 0.1, 0.12); note(784, 0.2, 0.2); },
  blip: () => note(1000, 0, 0.08, 'square', 0.14),
  bell: () => { note(784, 0, 0.5, 'sine', 0.2); note(1175, 0, 0.4, 'sine', 0.08); },
};

/** Daftar tone untuk dropdown di Settings. `file` = pakai file audio dari /public/sounds. */
export const TONES: { id: string; label: string; file?: string }[] = [
  { id: 'alert', label: 'Alert', file: '/sounds/alert.wav' },
  { id: 'bell', label: 'Bell Notification', file: '/sounds/bell%20notification.wav' },
  { id: 'confirmation', label: 'Confirmation', file: '/sounds/confirmation.wav' },
  { id: 'interface', label: 'Interface Back', file: '/sounds/interface%20back.wav' },
  { id: 'quick', label: 'Quick Tone', file: '/sounds/quick%20tone.wav' },
  { id: 'simple', label: 'Simple Tone', file: '/sounds/simple%20tone.wav' },
  // Nada sintesis (cadangan, tanpa file)
  { id: 'tritone', label: 'Tri-tone (sintesis)' },
  { id: 'ding', label: 'Ding (sintesis)' },
  { id: 'chime', label: 'Chime (sintesis)' },
  { id: 'pop', label: 'Pop (sintesis)' },
  { id: 'blip', label: 'Blip (sintesis)' },
];

/** Mainkan tone berdasarkan id. Aman dipanggil berkali-kali. */
export function playTone(id: string) {
  const tone = TONES.find((t) => t.id === id);
  // Tone berbasis file (dari /public/sounds)
  if (tone?.file) {
    try {
      const audio = new Audio(tone.file);
      audio.volume = 0.6;
      void audio.play();
    } catch {
      /* abaikan */
    }
    return;
  }
  // Tone sintesis (Web Audio)
  const p = patterns[id] ?? patterns.tritone;
  try {
    const c = getCtx();
    if (c.state === 'suspended') void c.resume();
    p();
  } catch {
    /* abaikan: browser blokir audio sebelum interaksi user */
  }
}

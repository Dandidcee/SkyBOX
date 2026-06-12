// Preferensi notifikasi suara (per jenis event) + persist ke localStorage.
import { create } from 'zustand';
import { playTone } from './sound';

export type SoundEvent = 'incoming' | 'lowConfidence' | 'error';

export interface SoundPref {
  tone: string;
  enabled: boolean;
}

interface SoundState {
  prefs: Record<SoundEvent, SoundPref>;
  setTone: (event: SoundEvent, tone: string) => void;
  setEnabled: (event: SoundEvent, enabled: boolean) => void;
}

const DEFAULT: Record<SoundEvent, SoundPref> = {
  incoming: { tone: 'tritone', enabled: true },
  lowConfidence: { tone: 'chime', enabled: true },
  error: { tone: 'blip', enabled: true },
};

const KEY = 'skybox_sound_prefs';

const load = (): Record<SoundEvent, SoundPref> => {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...DEFAULT, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return DEFAULT;
};

const save = (prefs: Record<SoundEvent, SoundPref>) => {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
};

export const useSoundStore = create<SoundState>((set, get) => ({
  prefs: load(),
  setTone: (event, tone) => {
    const prefs = { ...get().prefs, [event]: { ...get().prefs[event], tone } };
    save(prefs);
    set({ prefs });
  },
  setEnabled: (event, enabled) => {
    const prefs = { ...get().prefs, [event]: { ...get().prefs[event], enabled } };
    save(prefs);
    set({ prefs });
  },
}));

/** Mainkan suara untuk sebuah event bila diaktifkan. Dipanggil dari hooks Realtime. */
export function playEventSound(event: SoundEvent) {
  const pref = useSoundStore.getState().prefs[event];
  if (pref?.enabled) playTone(pref.tone);
}

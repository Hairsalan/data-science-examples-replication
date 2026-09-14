// Web Audio API based sound synthesizer - zero external sound files required

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundEffects = {
  isMuted: (): boolean => !soundEnabled,
  
  toggleSound: (): boolean => {
    soundEnabled = !soundEnabled;
    return soundEnabled;
  },

  setSoundEnabled: (enabled: boolean) => {
    soundEnabled = enabled;
  },

  // Delightful harmonic chime when checking off a task
  playComplete: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.05);

        gain.gain.setValueAtTime(0, now + index * 0.05);
        gain.gain.linearRampToValueAtTime(0.08, now + index * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 0.36);
      });
    } catch (e) {
      console.warn('Audio playComplete error:', e);
    }
  },

  // Calming resonance bell when Pomodoro interval completes
  playFocusBell: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 1.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    } catch (e) {
      console.warn('Audio playFocusBell error:', e);
    }
  },

  // Subtle tactile tap when interacting with buttons/switches
  playTap: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  },
};

/**
 * Notification Sound Service using Web Audio API
 * Generates a clean, modern, subtle two-tone chime without external audio file dependencies.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a gentle, subtle notification chime
   */
  public playMessageSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: High soft bell tone (D5 to A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.22);

      // Note 2: Gentle resolving harmonic (A5 to D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);

      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.setValueAtTime(0.06, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.07);
      osc2.stop(now + 0.32);
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  }
}

export const soundService = new SoundService();

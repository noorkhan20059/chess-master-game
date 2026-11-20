// Procedural Web Audio API sound synthesizer for tactile chess feedback

class ChessSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.14,
    endFreq?: number,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playMove() {
    this.playTone(220, 0.075, 'triangle', 0.14, 110);
  }

  public playCapture() {
    this.playTone(300, 0.09, 'sawtooth', 0.12, 95);
    this.playTone(150, 0.08, 'sine', 0.14, 70, 0.015);
  }

  public playCastle() {
    this.playTone(210, 0.065, 'triangle', 0.12, 120, 0);
    this.playTone(260, 0.07, 'triangle', 0.13, 140, 0.075);
  }

  public playCheck() {
    this.playTone(587.33, 0.12, 'sine', 0.13, 520);
    this.playTone(880, 0.14, 'triangle', 0.08, 780, 0.03);
  }

  public playVictory() {
    this.playTone(523.25, 0.16, 'triangle', 0.12, undefined, 0);
    this.playTone(659.25, 0.16, 'triangle', 0.12, undefined, 0.1);
    this.playTone(783.99, 0.28, 'triangle', 0.14, undefined, 0.2);
  }

  public playDefeat() {
    this.playTone(349.23, 0.18, 'sine', 0.12, 311.13, 0);
    this.playTone(293.66, 0.28, 'sine', 0.12, 220, 0.14);
  }

  public playSelect() {
    this.playTone(320, 0.035, 'sine', 0.06, 220);
  }

  public playError() {
    this.playTone(165, 0.14, 'sawtooth', 0.09, 120);
  }
}

export const chessSounds = new ChessSoundEngine();

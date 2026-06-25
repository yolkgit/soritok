// 소리톡 미니게임 사운드 — Web Audio API 로 합성 (효과음 + 배경음, 에셋 파일 0)
//  - 브라우저 자동재생 정책: 첫 사용자 제스처 후 resume() 되어야 소리가 납니다.
//  - 음소거 상태는 localStorage 에 저장됩니다.

const KEY = 'soritok_sound'

type Sfx =
  | 'click'
  | 'point'
  | 'score'
  | 'merge'
  | 'pop'
  | 'jump'
  | 'hit'
  | 'levelup'
  | 'win'
  | 'gameover'

type Osc = OscillatorType

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private step = 0
  enabled: boolean

  constructor() {
    this.enabled = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) !== 'off' : true
  }

  /** 컨텍스트 생성/재개 (사용자 제스처 직후 호출되어야 함) */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.enabled ? 0.9 : 0
      this.master.connect(this.ctx.destination)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.55
      this.sfxGain.connect(this.master)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.16
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** 첫 제스처에 호출해 오디오 잠금 해제 */
  unlock() {
    this.ensure()
  }

  setEnabled(on: boolean) {
    this.enabled = on
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    if (this.ctx && this.master) {
      this.ensure()
      this.master.gain.value = on ? 0.9 : 0
    }
    if (!on) this.stopMusic()
  }

  private blip(freq: number, dur: number, type: Osc, when: number, vol: number, slideTo?: number) {
    const ctx = this.ctx
    const out = this.sfxGain
    if (!ctx || !out) return
    const t0 = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(out)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  }

  play(name: Sfx) {
    if (!this.enabled) return
    if (!this.ensure()) return
    switch (name) {
      case 'click':
        this.blip(520, 0.05, 'square', 0, 0.5)
        break
      case 'point':
        this.blip(680, 0.07, 'triangle', 0, 0.5, 1020)
        break
      case 'score':
        this.blip(523, 0.08, 'square', 0, 0.5)
        this.blip(784, 0.1, 'square', 0.07, 0.45)
        break
      case 'merge':
        this.blip(440, 0.09, 'triangle', 0, 0.6, 660)
        this.blip(660, 0.11, 'triangle', 0.07, 0.5, 880)
        break
      case 'pop':
        this.blip(880, 0.06, 'sine', 0, 0.5, 1400)
        break
      case 'jump':
        this.blip(320, 0.13, 'square', 0, 0.45, 760)
        break
      case 'hit':
        this.blip(180, 0.14, 'sawtooth', 0, 0.5, 70)
        break
      case 'levelup':
        ;[523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.12, 'square', i * 0.08, 0.45))
        break
      case 'win':
        ;[523, 659, 784, 1047, 1319].forEach((f, i) => this.blip(f, 0.16, 'triangle', i * 0.1, 0.5))
        break
      case 'gameover':
        ;[440, 349, 262].forEach((f, i) => this.blip(f, 0.26, 'sawtooth', i * 0.16, 0.5))
        break
    }
  }

  /** 잔잔한 펜타토닉 배경음 루프 */
  startMusic() {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx || this.musicTimer != null) return
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]
    const bass = [130.81, 146.83, 164.81, 196.0]
    const pattern = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5, 4, 2, 1, 3, 2, 0]
    this.step = 0
    const tick = () => {
      const i = this.step
      const out = this.musicGain
      if (!out) return
      this.note(scale[pattern[i % pattern.length]], 0.24, 'triangle', 0.5, out)
      if (i % 4 === 0) this.note(bass[(i / 4) % bass.length], 0.42, 'sine', 0.6, out)
      if (i % 8 === 6) this.note(scale[pattern[i % pattern.length]] * 2, 0.12, 'square', 0.22, out)
      this.step = (i + 1) % 64
    }
    tick()
    this.musicTimer = window.setInterval(tick, 250)
  }

  private note(freq: number, dur: number, type: Osc, vol: number, out: GainNode) {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.02
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(out)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
}

export const audio = new AudioEngine()

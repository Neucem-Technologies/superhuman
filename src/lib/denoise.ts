/**
 * Voice cleanup for STT — no WASM, runs on the clip we already have.
 *
 * Stack, in order:
 *   1. WebRTC APM on the mic (echo / AGC / coarse NS) — capture time
 *   2. High-pass 85 Hz + low-pass 8 kHz + light compressor — live graph
 *   3. Two-pass Wiener STFT (Boll / Lim–Oppenheim) at 16 kHz — after decode
 *
 * Neural NS (RNNoise, DeepFilterNet, FastEnhancer) is stronger on
 * non-stationary noise but needs 100KB–1MB WASM. For command-length
 * clips, a two-pass noise PSD + oversubtracted Wiener gain removes
 * AC, fans, and road rumble without smearing “nidra” / “BPC”.
 */

const HP = 85;
const WIN = 512;
const HOP = 256;
const FLOOR = 0.1;
const ALPHA_NOISE = 3.2;
const ALPHA_SPEECH = 1.6;

function audioCtor() {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
}

function highpass(x: Float32Array, fs: number, fc: number) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const a = sin / (2 * 0.707);
  const b0 = (1 + cos) / 2 / (1 + a);
  const b1 = -(1 + cos) / (1 + a);
  const b2 = (1 + cos) / 2 / (1 + a);
  const a1 = (-2 * cos) / (1 + a);
  const a2 = (1 - a) / (1 + a);
  const y = new Float32Array(x.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]!;
    const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    y[i] = yn;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
  }
  return y;
}

function rms(x: Float32Array) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / Math.max(1, x.length));
}

function peakNormalize(x: Float32Array) {
  if (rms(x) < 0.008) return x;
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]!));
  if (p < 0.12 || p > 0.92) {
    const g = Math.min(4, 0.88 / Math.max(p, 1e-6));
    if (Math.abs(g - 1) > 0.08) {
      for (let i = 0; i < x.length; i++) x[i]! *= g;
    }
  }
  return x;
}

function fft(re: Float32Array, im: Float32Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const i0 = i + j;
        const i1 = i0 + half;
        const vRe = re[i1]! * wRe - im[i1]! * wIm;
        const vIm = re[i1]! * wIm + im[i1]! * wRe;
        re[i1] = re[i0]! - vRe;
        im[i1] = im[i0]! - vIm;
        re[i0]! += vRe;
        im[i0]! += vIm;
        const nRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i]! /= n;
      im[i]! /= n;
    }
  }
}

function hann() {
  const w = new Float32Array(WIN);
  for (let i = 0; i < WIN; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / WIN);
  return w;
}

function wiener(x: Float32Array) {
  if (x.length < WIN * 2) return x;
  const win = hann();
  const nFrames = 1 + Math.floor((x.length - WIN) / HOP);
  const mags: Float32Array[] = [];
  const reS: Float32Array[] = [];
  const imS: Float32Array[] = [];
  const energy = new Float32Array(nFrames);
  const re = new Float32Array(WIN);
  const im = new Float32Array(WIN);
  const bins = WIN / 2 + 1;

  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < WIN; i++) re[i] = (x[off + i] ?? 0) * win[i]!;
    fft(re, im, false);
    const mag = new Float32Array(bins);
    let e = 0;
    for (let k = 0; k < bins; k++) {
      const p = re[k]! * re[k]! + im[k]! * im[k]!;
      mag[k] = p;
      e += p;
    }
    energy[f] = e;
    mags.push(mag);
    reS.push(re.slice());
    imS.push(im.slice());
  }

  const ranked = Array.from(energy).sort((a, b) => a - b);
  const cut = ranked[Math.max(0, Math.floor(nFrames * 0.28))] ?? ranked[0]!;
  const noise = new Float32Array(bins);
  let nCount = 0;
  for (let f = 0; f < nFrames; f++) {
    if (energy[f]! <= cut || f < 2) {
      for (let k = 0; k < bins; k++) noise[k]! += mags[f]![k]!;
      nCount++;
    }
  }
  const div = Math.max(1, nCount);
  for (let k = 0; k < bins; k++) noise[k]! = Math.max(noise[k]! / div, 1e-12);

  const speechE = ranked[Math.floor(nFrames * 0.7)] ?? ranked[ranked.length - 1]!;
  if (speechE / Math.max(cut, 1e-12) > 40) return x;

  const out = new Float32Array(x.length);
  for (let f = 0; f < nFrames; f++) {
    const mag = mags[f]!;
    const isSpeech = energy[f]! > cut * 3;
    const alpha = isSpeech ? ALPHA_SPEECH : ALPHA_NOISE;
    const reF = reS[f]!;
    const imF = imS[f]!;
    for (let k = 0; k < bins; k++) {
      const g = Math.max(FLOOR, 1 - (alpha * noise[k]!) / Math.max(mag[k]!, 1e-12));
      reF[k]! *= g;
      imF[k]! *= g;
      if (k > 0 && k < WIN / 2) {
        reF[WIN - k] = reF[k]!;
        imF[WIN - k] = -imF[k]!;
      }
    }
    fft(reF, imF, true);
    const off = f * HOP;
    for (let i = 0; i < WIN; i++) {
      const idx = off + i;
      if (idx < out.length) out[idx]! += reF[i]!;
    }
  }
  return out;
}

export function suppressNoise(samples: Float32Array, sampleRate: number) {
  const hp = highpass(samples, sampleRate, HP);
  const cleaned = wiener(hp);
  return peakNormalize(cleaned);
}

export function preprocessMic(mic: MediaStream): { stream: MediaStream; stop: () => void } {
  const fallback = { stream: mic, stop: () => mic.getTracks().forEach((t) => t.stop()) };
  try {
    const ctx = new (audioCtor())();
    const src = ctx.createMediaStreamSource(mic);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = HP;
    hp.Q.value = 0.707;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 8000;
    lp.Q.value = 0.707;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -28;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const dest = ctx.createMediaStreamDestination();
    src.connect(hp);
    hp.connect(lp);
    lp.connect(comp);
    comp.connect(dest);
    void ctx.resume();
    return {
      stream: dest.stream,
      stop: () => {
        try {
          src.disconnect();
          hp.disconnect();
          lp.disconnect();
          comp.disconnect();
        } catch {
          /* already torn down */
        }
        mic.getTracks().forEach((t) => t.stop());
        dest.stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => undefined);
      },
    };
  } catch {
    return fallback;
  }
}

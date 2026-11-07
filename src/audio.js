// Tiny WebAudio synth: soft UI sounds + gentle generative music-box lullaby.
let ctx = null, master = null, musicGain = null, delay = null, muted = false, musicTimer = null;
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

let unlocked = false;
function ensure() {
  if (ctx) return ctx;
  if (!unlocked) return null; // browsers need a user gesture first
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  delay = ctx.createDelay(1); delay.delayTime.value = 0.28;
  const fb = ctx.createGain(); fb.gain.value = 0.35; const wet = ctx.createGain(); wet.gain.value = 0.3;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master); musicGain.connect(delay);
  return ctx;
}
function tone(freq, t0, dur, { type = 'sine', vol = 0.2, dest = null, slide = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || master); if (!dest) g.connect(delay);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
const now = () => (ensure() ? ctx.currentTime : 0);

export const sfx = {
  unlock() { unlocked = true; const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  hover() { if (!muted) tone(N(88), now(), 0.12, { vol: 0.03 }); },
  pick() { if (!muted) { const t = now(); tone(N(76), t, 0.18, { vol: 0.12 }); tone(N(83), t + 0.06, 0.22, { vol: 0.1 }); } },
  click() { if (!muted) { const t = now(); tone(N(79), t, 0.15, { vol: 0.14, type: 'triangle' }); tone(N(86), t + 0.05, 0.2, { vol: 0.1 }); } },
  equip() { if (!muted) { const t = now(); [72, 76, 79, 84, 88, 91].forEach((m, i) => tone(N(m), t + i * 0.06, 0.45, { vol: 0.11 })); } },
  remove() { if (!muted) { const t = now(); tone(N(84), t, 0.2, { vol: 0.1, slide: 0.6 }); tone(N(77), t + 0.08, 0.2, { vol: 0.08, slide: 0.6 }); } },
  save() { if (!muted) { const t = now(); [72, 76, 79, 84, 79, 84, 88, 96].forEach((m, i) => tone(N(m), t + i * 0.09, 0.6, { vol: 0.12 })); } },
  back() { if (!muted) tone(N(74), now(), 0.25, { vol: 0.1, slide: 0.75 }); },
  get muted() { return muted; },
  setMuted(m) { muted = m; if (musicGain) musicGain.gain.value = m ? 0 : 0.16; },
};

export const music = {
  start() {
    const c = ensure(); if (!c || musicTimer) return;
    const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79]; // C major pentatonic
    let step = 0, idx = 4;
    const chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
    const play = () => {
      if (muted) return;
      const t = c.currentTime + 0.05;
      if (step % 8 === 0) chords[(step / 8) % 4 | 0].forEach((m, i) => tone(N(m), t + i * 0.02, 3.2, { vol: 0.5, dest: musicGain, type: 'sine' }));
      if (Math.random() < 0.82) {
        idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 0, 1, 1, 2][(Math.random() * 7) | 0]));
        tone(N(scale[idx] + 12 * (step % 16 === 0 ? 0 : 0)), t, 1.4, { vol: 0.9, dest: musicGain, type: 'triangle' });
      }
      step++;
    };
    musicTimer = setInterval(play, 520);
  },
};

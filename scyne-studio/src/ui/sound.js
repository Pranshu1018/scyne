/* Optional studio sound, generated in the browser (no audio files):
   a low room hum with soft air, small blips on hover, and a soft chime each time
   a job finishes while you stand at the automation desk. Off until the visitor turns it on. */

export function initSound() {
  const btn = document.querySelector(".sound");
  const txt = btn.querySelector(".sound__t");
  let ctx = null, master = null, on = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(master);
    [[55, 0.11, "sine"], [82.4, 0.05, "sine"], [110, 0.02, "triangle"]].forEach(([f, v, type], i) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06 + i * 0.03;
      const depth = ctx.createGain(); depth.gain.value = f * 0.006;
      lfo.connect(depth).connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = v;
      o.connect(g).connect(lp); o.start(); lfo.start();
    });
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const air = ctx.createBufferSource(); air.buffer = buf; air.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 380;
    const ag = ctx.createGain(); ag.gain.value = 0.045;
    air.connect(bp).connect(ag).connect(master); air.start();
    return true;
  }

  function blip(freq = 880, len = 0.08, vol = 0.05, type = "sine") {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(master); o.start(t); o.stop(t + len + 0.02);
  }

  function set(state) {
    if (state && !ctx && !build()) return;
    on = state;
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Turn studio sound off" : "Turn studio sound on");
    txt.textContent = on ? "Sound on" : "Sound off";
    if (ctx) { ctx.resume(); master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.4); }
  }
  btn.addEventListener("click", () => set(!on));
  document.addEventListener("visibilitychange", () => { if (ctx) document.hidden ? ctx.suspend() : on && ctx.resume(); });

  let tickTimer = null;
  return {
    hover() { blip(980, 0.06, 0.035); },
    select() { blip(520, 0.18, 0.06, "triangle"); },
    at(stop) {
      clearInterval(tickTimer);
      if (stop === "automation") tickTimer = setInterval(() => blip(1320, 0.22, 0.03), 1500);
    },
  };
}

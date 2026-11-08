/* Station 03 · AI assistants — the lounge, where a phone call is answered with nobody in the room.
   The phone on the coffee table rings and buzzes; the assistant picks up on the first ring. The
   laptop beside it shows the live call (caller, timer, both voices as waveforms, who is speaking,
   the transcript and what the assistant does: checks the calendar, books, sends a WhatsApp
   confirmation). The wall screen shows the same conversation large, and the smart speaker's ring
   glows whenever the assistant speaks. Leather lounge chair, ottoman, rug, globe pendant. */

import * as THREE from "three";
import { glow, cyl, display, rr, FONT, MONO, ease } from "../kit.js";
import { laptop, phone } from "../devices.js";

// ---------- The call, as one 18-second timeline ----------
const LOOP = 18;
const ANSWER = 2.4, END = 13.6;
const CALLER = "Priya S.", NUMBER = "+91 98••• ••210";
const LINES = [
  { who: "caller", text: "Hi, do you have anything this Saturday morning?", at: 2.9, until: 5.0 },
  { who: "ai", text: "Let me check. Yes, 10:30 or 11:15. Which works better?", at: 5.3, until: 8.0 },
  { who: "caller", text: "10:30, please. It's for a check-up.", at: 8.3, until: 9.9 },
  { who: "ai", text: "Done. You're booked for 10:30 on Saturday, and I've sent the details on WhatsApp.", at: 10.2, until: 13.2 },
];
const ACTIONS = [
  { text: "Checked the calendar: Saturday 10:30 is free", at: 5.9 },
  { text: "Booked Priya S. for Saturday 10:30", at: 10.7 },
  { text: "Sent a WhatsApp confirmation", at: 12.5 },
];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
function call(t) {
  const T = t % LOOP;
  const phase = T < ANSWER ? "ringing" : T < END ? "live" : "ended";
  const line = LINES.find((l) => T > l.at && T < l.until);
  const secs = phase === "ringing" ? 0 : Math.floor((Math.min(T, END) - ANSWER) * 5.1); // call clock runs a little faster than the loop
  return { T, phase, speaker: line ? line.who : null, secs, fade: clamp01((LOOP - T) / 0.6) };
}
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const typed = (l, T) => l.text.slice(0, Math.floor(clamp01((T - l.at) / Math.max(0.6, l.until - l.at - 0.4)) * l.text.length));

function wrap(ctx, text, max) {
  const out = []; let line = "";
  for (const w of text.split(" ")) { const tt = line ? `${line} ${w}` : w; if (ctx.measureText(tt).width > max) { out.push(line); line = w; } else line = tt; }
  out.push(line); return out;
}
/* a voice as a waveform: busy while that side speaks, a flat hairline while it listens */
function wave(ctx, x, y, w, amp, active, t, color) {
  ctx.strokeStyle = active ? color : "rgba(255,255,255,0.18)"; ctx.lineWidth = active ? 3 : 2;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 4) {
    const e = Math.sin((i / w) * Math.PI);
    const v = active ? (Math.sin(i * 0.09 + t * 15) * 0.6 + Math.sin(i * 0.031 - t * 7) * 0.4) * Math.abs(Math.sin(i * 0.013 + t * 2.3)) * amp * e : 0;
    i ? ctx.lineTo(x + i, y + v) : ctx.moveTo(x + i, y + v);
  }
  ctx.stroke();
}
function check(ctx, x, y, r) {
  ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0e2a1a"; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.35); ctx.lineTo(x + r * 0.5, y - r * 0.4); ctx.stroke();
}
/* a telephone handset: an arc with an earpiece and a mouthpiece */
function phoneIcon(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y + s * 0.18); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "round";
  ctx.lineWidth = s * 0.16; ctx.beginPath(); ctx.arc(0, 0, s * 0.42, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();
  for (const a of [Math.PI * 1.18, Math.PI * 1.82]) { ctx.save(); ctx.translate(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42); ctx.rotate(a + Math.PI / 2); rr(ctx, -s * 0.17, -s * 0.06, s * 0.34, s * 0.2, s * 0.08); ctx.fill(); ctx.restore(); }
  ctx.restore();
}

// ---------- Wall screen: the conversation, large (1280 × 720) ----------
function drawTV(ctx, t, w, h) {
  const c = call(t);
  ctx.globalAlpha = 1; ctx.fillStyle = "#0f1012"; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ece8df"; ctx.font = `600 38px ${FONT}`; ctx.fillText("Brightsmile · front desk line", 56, 64);
  ctx.globalAlpha = c.fade;
  if (c.phase === "ringing") {
    const p = (c.T * 1.6) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w / 2, 330, 70 + p * 90, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#1c1d21"; ctx.beginPath(); ctx.arc(w / 2, 330, 70, 0, Math.PI * 2); ctx.fill();
    phoneIcon(ctx, w / 2, 330, 64, "#ece8df");
    ctx.textAlign = "center"; ctx.fillStyle = "#ece8df"; ctx.font = `600 44px ${FONT}`; ctx.fillText(`Incoming call · ${CALLER}`, w / 2, 490);
    ctx.fillStyle = "#8d8b93"; ctx.font = `500 24px ${MONO}`; ctx.fillText("NOBODY AT THE DESK · ASSISTANT PICKING UP", w / 2, 548); ctx.textAlign = "left";
    ctx.globalAlpha = 1; return;
  }
  ctx.fillStyle = c.phase === "live" ? "#3ddc84" : "#8d8b93"; ctx.font = `500 22px ${MONO}`;
  ctx.fillText(c.phase === "live" ? `● ANSWERED BY YOUR ASSISTANT  ·  ${clock(c.secs)}` : `CALL ENDED  ·  ${clock(c.secs)}  ·  BOOKED`, 56, 112);
  ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(0, 146, w, 2);
  wave(ctx, 56, 206, w - 112, 34, c.speaker === "ai", c.T, "#ff3d1f");
  ctx.fillStyle = c.speaker === "ai" ? "#ff8a6a" : c.speaker === "caller" ? "#ece8df" : "#8d8b93"; ctx.font = `500 20px ${MONO}`;
  ctx.fillText(c.speaker === "ai" ? "ASSISTANT SPEAKING" : c.speaker === "caller" ? "ASSISTANT LISTENING" : c.phase === "live" ? "…" : "", 56, 262);
  let y = 320;
  for (const l of LINES.filter((l) => c.T > l.at).slice(-3)) {
    const ai = l.who === "ai";
    ctx.fillStyle = ai ? "#ff3d1f" : "#8d8b93"; ctx.font = `500 19px ${MONO}`; ctx.fillText(ai ? "ASSISTANT" : CALLER.toUpperCase(), 56, y);
    ctx.fillStyle = "#ece8df"; ctx.font = `400 31px ${FONT}`;
    const ls = wrap(ctx, typed(l, c.T), w - 120);
    ls.forEach((s, i) => ctx.fillText(s, 56, y + 40 + i * 38));
    y += 40 + ls.length * 38 + 20;
  }
  if (c.phase === "ended") {
    ctx.globalAlpha = c.fade * ease(clamp01((c.T - END) / 0.4));
    rr(ctx, 56, h - 120, 600, 70, 16); ctx.fillStyle = "#ece8df"; ctx.fill();
    ctx.fillStyle = "#121212"; ctx.font = `600 27px ${FONT}`; ctx.fillText("✓ Saturday 10:30 added to the calendar", 80, h - 85);
  }
  ctx.globalAlpha = 1;
}

// ---------- Laptop: the call app (1024 × 640) ----------
function drawCallApp(ctx, t, w, h) {
  const c = call(t);
  ctx.globalAlpha = 1; ctx.fillStyle = "#121315"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1b1c1f"; ctx.fillRect(0, 0, w, 52);
  ctx.textBaseline = "middle"; ctx.fillStyle = "#d9d6cf"; ctx.font = `600 20px ${FONT}`; ctx.fillText("Calls", 24, 27);
  rr(ctx, w - 214, 12, 194, 30, 15); ctx.fillStyle = "rgba(61,220,132,.14)"; ctx.fill();
  ctx.fillStyle = "#3ddc84"; ctx.font = `600 15px ${MONO}`; ctx.fillText("● ASSISTANT ANSWERS", w - 200, 27);
  ctx.globalAlpha = c.fade;
  // caller card
  rr(ctx, 20, 70, 420, 186, 18); ctx.fillStyle = "#1b1c20"; ctx.fill();
  const ring = c.phase === "ringing" ? (c.T * 1.6) % 1 : 0;
  if (ring) { ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ring)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(84, 130, 34 + ring * 26, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = "#3a3236"; ctx.beginPath(); ctx.arc(84, 130, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ece8df"; ctx.font = `600 24px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("PS", 84, 131); ctx.textAlign = "left";
  ctx.fillStyle = "#ece8df"; ctx.font = `600 28px ${FONT}`; ctx.fillText(CALLER, 136, 116);
  ctx.fillStyle = "#8d8b93"; ctx.font = `400 18px ${MONO}`; ctx.fillText(NUMBER, 136, 148);
  const [status, sc] = c.phase === "ringing" ? ["Incoming call · ringing", "#ece8df"] : c.phase === "live" ? [`On call · ${clock(c.secs)}`, "#3ddc84"] : [`Call ended · ${clock(c.secs)}`, "#8d8b93"];
  ctx.fillStyle = sc; ctx.font = `600 19px ${FONT}`; ctx.fillText(status, 40, 202);
  if (c.phase !== "ringing") { rr(ctx, 40, 222, 266, 26, 13); ctx.fillStyle = "rgba(255,61,31,.14)"; ctx.fill(); ctx.fillStyle = "#ff8a6a"; ctx.font = `600 14px ${MONO}`; ctx.fillText("ANSWERED BY ASSISTANT", 54, 235); }
  // both voices
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 14px ${MONO}`; ctx.fillText("CALLER", 24, 292); ctx.fillText("ASSISTANT", 24, 372);
  rr(ctx, 20, 304, 420, 48, 10); ctx.fillStyle = "#18191c"; ctx.fill();
  rr(ctx, 20, 384, 420, 48, 10); ctx.fill();
  wave(ctx, 32, 328, 396, 16, c.speaker === "caller", c.T, "#ece8df");
  wave(ctx, 32, 408, 396, 16, c.speaker === "ai", c.T, "#ff3d1f");
  const state = c.phase === "ringing" ? ["Picking up…", "#ece8df"] : c.speaker === "ai" ? ["Speaking", "#ff8a6a"] : c.phase === "live" ? ["Listening", "#3ddc84"] : ["Done", "#8d8b93"];
  ctx.fillStyle = state[1]; ctx.beginPath(); ctx.arc(34, 464, 6 + (c.phase === "live" ? Math.sin(t * 6) * 1.5 : 0), 0, Math.PI * 2); ctx.fill();
  ctx.font = `600 18px ${FONT}`; ctx.fillText(`Assistant · ${state[0]}`, 50, 465);
  // transcript
  ctx.fillStyle = "#17181b"; ctx.fillRect(460, 52, w - 460, h - 52);
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 14px ${MONO}`; ctx.fillText("LIVE TRANSCRIPT", 484, 84);
  let y = 118;
  for (const l of LINES.filter((l) => c.T > l.at).slice(-3)) {
    const ai = l.who === "ai";
    ctx.fillStyle = ai ? "#ff8a6a" : "#8d8b93"; ctx.font = `600 14px ${MONO}`; ctx.fillText(ai ? "ASSISTANT" : "CALLER", 484, y);
    ctx.fillStyle = "#ece8df"; ctx.font = `400 19px ${FONT}`;
    const ls = wrap(ctx, typed(l, c.T), w - 520);
    ls.forEach((s, i) => ctx.fillText(s, 484, y + 26 + i * 25));
    y += 26 + ls.length * 25 + 18;
  }
  // what the assistant did
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 14px ${MONO}`; ctx.fillText("DONE DURING THE CALL", 24, 512);
  ACTIONS.forEach((a, i) => {
    const k = clamp01((c.T - a.at) / 0.4);
    if (k <= 0) return;
    ctx.globalAlpha = c.fade * ease(k);
    check(ctx, 34, 544 + i * 30, 9);
    ctx.fillStyle = "#d7f5e2"; ctx.font = `400 16px ${FONT}`; ctx.fillText(a.text, 52, 545 + i * 30);
  });
  ctx.globalAlpha = 1;
}

// ---------- Phone: ringing, answered, on call (300 × 620) ----------
function drawPhoneCall(ctx, t, w, h) {
  const c = call(t);
  ctx.globalAlpha = 1; ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "middle"; ctx.textAlign = "center";
  if (c.T > END + 2.5) { ctx.fillStyle = "#ece8df"; ctx.font = `300 84px ${FONT}`; ctx.fillText("4:52", w / 2, 170); ctx.textAlign = "left"; return; }
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 18px ${MONO}`;
  ctx.fillText(c.phase === "ringing" ? "INCOMING CALL" : c.phase === "live" ? "ASSISTANT ON CALL" : "CALL ENDED", w / 2, 92);
  if (c.phase === "ringing") { const p = (c.T * 1.6) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, 210, 54 + p * 40, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = "#3a3236"; ctx.beginPath(); ctx.arc(w / 2, 210, 54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ece8df"; ctx.font = `600 34px ${FONT}`; ctx.fillText("PS", w / 2, 212);
  ctx.font = `600 34px ${FONT}`; ctx.fillText(CALLER, w / 2, 314);
  ctx.fillStyle = c.phase === "live" ? "#3ddc84" : "#8d8b93"; ctx.font = `500 22px ${MONO}`; ctx.fillText(c.phase === "ringing" ? NUMBER : clock(c.secs), w / 2, 356);
  if (c.phase === "ringing") { // answer / decline, the assistant's pick-up about to happen
    ctx.fillStyle = "#e5484d"; ctx.beginPath(); ctx.arc(80, 520, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(w - 80, 520, 34 + Math.sin(c.T * 10) * 2, 0, Math.PI * 2); ctx.fill();
  } else { ctx.textAlign = "left"; wave(ctx, 40, 470, w - 80, 22, c.speaker !== null, c.T, c.speaker === "ai" ? "#ff3d1f" : "#ece8df"); }
  ctx.textAlign = "left";
}

function rug() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const r = c.getContext("2d");
  r.fillStyle = "#d8cfbf"; r.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) { r.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "80,60,40"},${Math.random() * 0.06})`; r.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  r.strokeStyle = "#a8957c"; r.lineWidth = 6; r.strokeRect(26, 26, 460, 460);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.3), new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: "#a69f94" }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}

export function buildAssistant(A) {
  const g = new THREE.Group();
  g.position.set(4.9, 0, -3.2);

  const r = rug(); r.position.set(-0.2, 0.004, 0.25); g.add(r);
  g.add(A.place("mid_century_lounge_chair", 0.15, 0, -0.35, -25));
  g.add(A.place("Ottoman_01", 0.0, 0, 0.75, -10, 0.85));
  g.add(A.place("side_table_01", 1.0, 0, -0.55, 10));
  g.add(A.place("coffee_table_round_01", -1.2, 0, 0.45, 0, 0.8));
  g.add(A.place("potted_plant_02", 1.55, 0, -1.3, 70, 1.25));

  // on the coffee table: the laptop with the call app, and the phone that rings
  const TOP = 0.39;
  const lap = laptop(drawCallApp, { fps: 15, scale: 1.25 }); lap.group.position.set(-1.3, TOP, 0.36); lap.group.rotation.y = -0.1; g.add(lap.group);
  const ph = phone(drawPhoneCall, { fps: 12 }); ph.group.position.set(-0.96, TOP, 0.6); ph.group.rotation.y = -0.35; ph.group.scale.setScalar(1.15);
  ph.group.userData.dynamic = true; g.add(ph.group);
  const phoneBase = ph.group.rotation.y;

  // smart speaker on the side table: its ring glows while the assistant talks
  const top = 0.55;
  const speaker = new THREE.Group(); speaker.position.set(0.95, top, -0.6);
  const body = cyl(0.06, 0.065, 0.17, new THREE.MeshStandardMaterial({ color: "#3a3835", roughness: 1 }), 40); body.position.y = 0.085;
  const cap = cyl(0.058, 0.058, 0.012, new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.15, metalness: 0.3 }), 40); cap.position.y = 0.176;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 8, 48), glow("#ff3d1f", 2.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.184;
  speaker.add(body, cap, ring); speaker.userData.dynamic = true;
  g.add(speaker);

  // globe pendant over the chair, with a warm pool of light
  g.add(A.place("modern_ceiling_lamp_01", 0.15, 3.2 - 1.17, -0.2));
  const bulbLight = new THREE.SpotLight("#ffcf98", 9, 6, 1.0, 0.6, 1.6); bulbLight.position.set(0.15, 2.3, -0.2); bulbLight.target.position.set(0.1, 0, 0);
  bulbLight.castShadow = true; bulbLight.shadow.mapSize.set(1024, 1024); bulbLight.shadow.bias = -0.0004; bulbLight.shadow.normalBias = 0.02;
  g.add(bulbLight, bulbLight.target);
  const glowBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), glow("#ffe0b8", 1.6)); glowBall.position.set(0.15, 2.36, -0.2); g.add(glowBall);

  // wall screen with the conversation
  const tv = display(1.4, 0.788, drawTV, { px: 1280, fps: 15, res: 0.8 });
  tv.group.position.set(0.0, 1.75, -1.77);
  g.add(tv.group);

  return {
    group: g,
    anchor: new THREE.Vector3(0.0, 2.35, -1.7),
    update(t) {
      tv.screen.update(t); lap.screen.update(t); ph.screen.update(t);
      const c = call(t);
      // the phone buzzes in short bursts while it rings
      const buzz = c.phase === "ringing" && (c.T % 0.9) < 0.45;
      ph.group.rotation.y = phoneBase + (buzz ? Math.sin(t * 90) * 0.025 : 0);
      ph.group.position.x = -0.96 + (buzz ? Math.sin(t * 77) * 0.0015 : 0);
      // speaker ring: a slow breath while ringing, bright and lively while the assistant talks
      const k = c.speaker === "ai" ? 2 + Math.abs(Math.sin(t * 9)) * 2.5 : c.phase === "ringing" ? 0.6 + Math.sin(t * 5) * 0.4 : 0.5;
      ring.material.color.setRGB(1, 0.24, 0.12).multiplyScalar(k);
    },
  };
}

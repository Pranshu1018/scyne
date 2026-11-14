/* Station 01 · Websites
   A design desk where a website builds itself. The laptop runs the builder: the brief is typed,
   seven steps tick off while the code is written, checks pass, the site is published. The big
   monitor shows the page being assembled piece by piece (an "AI" cursor places each part, with a
   selection outline, like a design tool), and the portrait monitor shows the mobile layout taking
   shape in step. Once it is live, a visitor books a check-up on both. One 20-second loop. */

import * as THREE from "three";
import { mats, box, display, rr, FONT, MONO, ease } from "../kit.js";
import { laptop, mug, bakedMug, deskKeyboard, deskMouse, deskMat } from "../devices.js";

// ---------- One timeline for all three screens ----------
const LOOP = 20;
const BRIEF = "Website for Brightsmile Dental. Four clinics, online booking, clear prices.";
const STEPS = [
  { k: "grid", label: "Layout and grid", code: ['<main class="page">', '  <div class="grid cols-12">', ".grid { display: grid;", "  grid-template-columns: repeat(12, 1fr); }"] },
  { k: "nav", label: "Header and menu", code: ['<header class="nav">', '  <a class="logo">Brightsmile Dental</a>', "  <nav>Treatments  Prices  Clinics</nav>", '  <a class="btn">Book a visit</a>', "</header>"] },
  { k: "hero", label: "Hero and booking button", code: ['<section class="hero">', "  <h1>Book a check-up in three taps.</h1>", "  <p>Same-week appointments at four clinics.</p>", '  <button class="cta">Book a visit</button>', "</section>"] },
  { k: "cards", label: "Treatments and times", code: ['<ul class="treatments">', "  <li>Check-up <span>30 min</span></li>", "  <li>Cleaning <span>45 min</span></li>", "  <li>Whitening <span>60 min</span></li>", "</ul>"] },
  { k: "book", label: "Booking form", code: ['<form class="booking">', '  <input type="date" name="day">', '  <select name="time">10:30</select>', "  <button>Confirm</button>", "</form>"] },
  { k: "mobile", label: "Mobile layout", code: ["@media (max-width: 640px) {", "  .hero { grid-template-columns: 1fr; }", "  .treatments { flex-direction: column; }", "}"] },
  { k: "checks", label: "Speed and search checks", code: ["✓ images compressed to WebP", "✓ title and description set", "✓ 4 clinic pages ready for Google", "✓ text contrast passes"] },
];
const S0 = 1.9, SD = 1.15;                       // first step starts, seconds per step
const PUBLISH = S0 + STEPS.length * SD + 0.15;   // ≈ 10.1
const LIVE = PUBLISH + 1.2;                      // ≈ 11.3
const VISIT = LIVE + 0.5;                        // a visitor arrives
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const stepStart = (i) => S0 + i * SD;
const shown = (T, i, lag = 0) => ease(clamp01((T - stepStart(i) - 0.35 - lag) / 0.55)); // part i fades/slides in
const placing = (T, i) => T >= stepStart(i) && T < stepStart(i) + SD;
const fadeAll = (T) => clamp01((LOOP - T) / 0.7); // everything fades before the loop restarts

/* dashed selection outline with a name tag, as in a design tool */
function select(ctx, x, y, w, h, name, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.setLineDash([10, 6]); ctx.lineWidth = 3; ctx.strokeStyle = "#ff3d1f"; ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
  ctx.font = `600 18px ${MONO}`; const tw = ctx.measureText(name).width;
  rr(ctx, x, y - 30, tw + 20, 26, 6); ctx.fillStyle = "#ff3d1f"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(name, x + 10, y - 17);
  ctx.restore();
}
/* the builder's own cursor, labelled, gliding to the part it is placing */
function aiCursor(ctx, x, y) {
  ctx.fillStyle = "#ff3d1f";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.lineTo(x + 8, y + 21); ctx.lineTo(x + 20, y + 21); ctx.closePath(); ctx.fill();
  rr(ctx, x + 16, y + 24, 42, 24, 12); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 15px ${MONO}`; ctx.textBaseline = "middle"; ctx.fillText("AI", x + 28, y + 37);
}
function visitorCursor(ctx, x, y) {
  ctx.fillStyle = "#121212"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.lineTo(x + 8, y + 22); ctx.lineTo(x + 20, y + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// ---------- Big monitor: the page being assembled (1280 × 720) ----------
const PARTS = { // where each part sits on the desktop page, for its outline and the AI cursor
  grid: [24, 72, 1232, 632], nav: [24, 66, 1232, 70], hero: [36, 150, 700, 330], cards: [36, 500, 1208, 196], book: [790, 168, 446, 300],
};
function drawSiteBuild(ctx, t, w, h) {
  const T = t % LOOP;
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#e4e0d8"; ctx.fillRect(0, 0, w, 56);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(28 + i * 22, 28, 7, 0, Math.PI * 2); ctx.fill(); });
  rr(ctx, 380, 12, 520, 32, 16); ctx.fillStyle = "#f6f3ee"; ctx.fill();
  ctx.fillStyle = "#555"; ctx.font = `500 17px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillText(T >= LIVE ? "🔒 brightsmile.co" : "preview · building", 640, 29); ctx.textAlign = "left";
  if (T >= LIVE) { rr(ctx, w - 110, 14, 86, 28, 14); ctx.fillStyle = "#1d6b45"; ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `600 15px ${MONO}`; ctx.fillText("● LIVE", w - 96, 29); }
  const A = fadeAll(T);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 56, w, h - 56);
  ctx.globalAlpha = A;
  // 0 grid: twelve faint columns, gone once the content is in
  const g = shown(T, 0) * (1 - clamp01((T - stepStart(3)) / 0.8));
  if (g > 0) { ctx.globalAlpha = A * g * 0.5; ctx.fillStyle = "rgba(255,61,31,0.12)"; for (let i = 0; i < 12; i++) ctx.fillRect(36 + i * 102, 60, 86, h - 64); ctx.globalAlpha = A; }
  if (T < stepStart(0) + 0.3) { ctx.fillStyle = "#b9b4ab"; ctx.font = `500 22px ${MONO}`; ctx.textAlign = "center"; ctx.fillText("Waiting for the brief…", w / 2, h / 2); ctx.textAlign = "left"; }
  // 1 header
  let a = shown(T, 1);
  if (a > 0) {
    ctx.globalAlpha = A * a; const dy = (1 - a) * -12;
    ctx.fillStyle = "#121212"; ctx.font = `700 26px ${FONT}`; ctx.fillText("Brightsmile Dental", 48, 100 + dy);
    ctx.font = `400 19px ${FONT}`; ctx.fillStyle = "#555"; ["Treatments", "Prices", "Clinics"].forEach((s, i) => ctx.fillText(s, 610 + i * 130, 100 + dy));
    rr(ctx, w - 196, 80 + dy, 150, 40, 20); ctx.fillStyle = "#121212"; ctx.fill();
    ctx.fillStyle = "#f2efe8"; ctx.font = `500 17px ${FONT}`; ctx.fillText("Book a visit", w - 168, 100 + dy);
    ctx.fillStyle = "rgba(0,0,0,.07)"; ctx.fillRect(0, 136, w, 2);
  }
  // 2 hero: headline types itself in while it is being placed
  a = shown(T, 2);
  if (a > 0) {
    ctx.globalAlpha = A * a; const dy = (1 - a) * 16;
    const head = "Book a check-up in three taps.";
    const n = Math.floor(clamp01((T - stepStart(2) - 0.3) / 0.8) * head.length);
    ctx.fillStyle = "#121212"; ctx.font = `700 62px ${FONT}`; ctx.textBaseline = "alphabetic";
    let line = "", y = 250 + dy;
    for (const wd of head.slice(0, n).split(" ")) { const tt = line ? `${line} ${wd}` : wd; if (ctx.measureText(tt).width > 640) { ctx.fillText(line, 48, y); line = wd; y += 70; } else line = tt; }
    ctx.fillText(line, 48, y);
    ctx.textBaseline = "middle"; ctx.font = `400 22px ${FONT}`; ctx.fillStyle = "#666"; ctx.fillText("Same-week appointments at four clinics.", 48, 368 + dy);
    const press = T > VISIT + 2 && T < VISIT + 2.3;
    rr(ctx, 48, 404 + dy, 240, 62, 31); ctx.fillStyle = press ? "#c92f15" : "#ff3d1f"; ctx.fill();
    ctx.fillStyle = "#121212"; ctx.font = `600 21px ${FONT}`; ctx.fillText("Book a visit  →", 84, 435 + dy);
    const gr = ctx.createRadialGradient(1010, 320, 20, 1010, 320, 260); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.55, "#cdd9e1"); gr.addColorStop(1, "#7f97a8");
    rr(ctx, 790, 168, 446, 300, 26); ctx.fillStyle = gr; ctx.fill();
  }
  // 3 treatment cards
  a = shown(T, 3);
  if (a > 0) {
    [["Check-up", "30 minutes"], ["Cleaning", "45 minutes"], ["Whitening", "60 minutes"]].forEach(([n1, n2], i) => {
      const ai = ease(clamp01((T - stepStart(3) - 0.35 - i * 0.15) / 0.5));
      ctx.globalAlpha = A * ai; const x = 36 + i * 408, y = 506 + (1 - ai) * 20;
      rr(ctx, x, y, 388, 184, 20); ctx.fillStyle = "#f4f1eb"; ctx.fill();
      ctx.fillStyle = "#121212"; ctx.font = `600 28px ${FONT}`; ctx.fillText(n1, x + 28, y + 54);
      ctx.fillStyle = "#777"; ctx.font = `400 20px ${FONT}`; ctx.fillText(n2, x + 28, y + 92);
      ctx.fillStyle = "#ff3d1f"; ctx.font = `600 18px ${FONT}`; ctx.fillText("Book  →", x + 28, y + 146);
    });
  }
  // 4 booking widget over the photo
  a = shown(T, 4);
  if (a > 0) {
    ctx.globalAlpha = A * a; const x = 850, y = 200 + (1 - a) * 18;
    // a soft shadow from a few offset layers (a canvas blur would be redrawn on the CPU 15 times a second)
    for (let i = 3; i >= 1; i--) { rr(ctx, x - i * 4, y + i * 5, 330 + i * 8, 238 + i * 6, 20 + i * 4); ctx.fillStyle = "rgba(0,0,0,.035)"; ctx.fill(); }
    rr(ctx, x, y, 330, 238, 20); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = "#121212"; ctx.font = `600 24px ${FONT}`; ctx.fillText("Book a visit", x + 26, y + 40);
    ["Thu", "Fri", "Sat"].forEach((d, i) => { const on = i === 2 && T > VISIT + 1.2; rr(ctx, x + 26 + i * 96, y + 72, 84, 48, 12); ctx.fillStyle = on ? "#121212" : "#f1eee8"; ctx.fill(); ctx.fillStyle = on ? "#fff" : "#333"; ctx.font = `500 19px ${FONT}`; ctx.fillText(d, x + 50 + i * 96, y + 96); });
    rr(ctx, x + 26, y + 136, 278, 40, 10); ctx.strokeStyle = "#ddd"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#333"; ctx.font = `400 18px ${FONT}`; ctx.fillText("10:30", x + 42, y + 156);
    rr(ctx, x + 26, y + 188, 278, 34, 17); ctx.fillStyle = "#ff3d1f"; ctx.fill(); ctx.fillStyle = "#121212"; ctx.font = `600 16px ${FONT}`; ctx.fillText("Confirm", x + 136, y + 205);
  }
  // selection outline + AI cursor on the part being placed (desktop parts only)
  for (let i = 0; i < 5; i++) {
    if (!placing(T, i)) continue;
    const [x, y, pw, ph] = PARTS[STEPS[i].k];
    const k = (T - stepStart(i)) / SD;
    select(ctx, x, y, pw, ph, STEPS[i].label, Math.min(1, k * 4) * Math.min(1, (1 - k) * 4));
  }
  if (T > S0 && T < PUBLISH) {
    // the cursor glides from one part to the next
    const i = Math.min(4, Math.floor((T - S0) / SD));
    const kk = ease(clamp01((T - S0 - i * SD) / 0.45));
    const p0 = PARTS[STEPS[Math.max(0, i - 1)].k], p1 = PARTS[STEPS[i].k];
    const cx = p0[0] + p0[2] * 0.5 + (p1[0] + p1[2] * 0.5 - (p0[0] + p0[2] * 0.5)) * kk, cy = p0[1] + p0[3] * 0.5 + (p1[1] + p1[3] * 0.5 - (p0[1] + p0[3] * 0.5)) * kk;
    ctx.globalAlpha = A; aiCursor(ctx, cx, cy);
  }
  // publishing bar, then a visitor books
  if (T >= PUBLISH && T < LIVE + 0.4) {
    const k = clamp01((T - PUBLISH) / (LIVE - PUBLISH));
    ctx.globalAlpha = A; rr(ctx, w / 2 - 220, h - 120, 440, 74, 18); ctx.fillStyle = "#121212"; ctx.fill();
    ctx.fillStyle = "#f2efe8"; ctx.font = `500 21px ${FONT}`; ctx.fillText(k < 1 ? "Publishing to brightsmile.co…" : "✓  Live on brightsmile.co", w / 2 - 190, h - 94);
    rr(ctx, w / 2 - 190, h - 68, 380, 6, 3); ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fill();
    rr(ctx, w / 2 - 190, h - 68, 380 * k, 6, 3); ctx.fillStyle = k < 1 ? "#ff5a3a" : "#3ddc84"; ctx.fill();
  }
  if (T > VISIT) {
    const v = T - VISIT, k = ease(clamp01(v / 1.8));
    const cx = 700 - (700 - 200) * k, cy = 640 - (640 - 440) * k;
    ctx.globalAlpha = A; visitorCursor(ctx, cx, cy);
    if (v > 2.4) {
      ctx.globalAlpha = A * ease(clamp01((v - 2.4) / 0.5));
      rr(ctx, w / 2 - 210, h - 110, 420, 70, 18); ctx.fillStyle = "#121212"; ctx.fill();
      ctx.fillStyle = "#f2efe8"; ctx.font = `500 22px ${FONT}`; ctx.fillText("✓  Booked: Saturday, 10:30", w / 2 - 170, h - 75);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- Portrait monitor: the mobile layout, in step (540 × 960) ----------
function drawMobileBuild(ctx, t, w, h) {
  const T = t % LOOP, A = fadeAll(T);
  ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = A; ctx.textBaseline = "middle";
  let a = shown(T, 1, 0.25);
  if (a > 0) { ctx.globalAlpha = A * a; ctx.fillStyle = "#121212"; ctx.font = `700 30px ${FONT}`; ctx.fillText("Brightsmile", 34, 70); ctx.fillRect(w - 76, 60, 40, 4); ctx.fillRect(w - 76, 74, 40, 4); }
  a = shown(T, 2, 0.25);
  if (a > 0) {
    ctx.globalAlpha = A * a; const dy = (1 - a) * 16;
    ctx.font = `700 58px ${FONT}`; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#121212";
    ["Book a", "check-up in", "three taps."].forEach((l, i) => ctx.fillText(l, 34, 210 + i * 66 + dy));
    ctx.textBaseline = "middle";
    const g2 = ctx.createRadialGradient(w / 2, 520, 10, w / 2, 520, 220); g2.addColorStop(0, "#fff"); g2.addColorStop(1, "#8ea3b3");
    rr(ctx, 34, 400, w - 68, 230, 26); ctx.fillStyle = g2; ctx.fill();
    rr(ctx, 34, 656, w - 68, 84, 42); ctx.fillStyle = T > VISIT + 2 && T < VISIT + 2.3 ? "#c92f15" : "#ff3d1f"; ctx.fill();
    ctx.fillStyle = "#121212"; ctx.font = `600 28px ${FONT}`; ctx.fillText("Book a visit  →", 128, 698);
  }
  a = shown(T, 3, 0.25);
  if (a > 0) { ctx.globalAlpha = A * a; ["Check-up · 30 min", "Cleaning · 45 min"].forEach((s, i) => { rr(ctx, 34, 770 + i * 76, w - 68, 64, 16); ctx.fillStyle = "#f4f1eb"; ctx.fill(); ctx.fillStyle = "#121212"; ctx.font = `500 24px ${FONT}`; ctx.fillText(s, 58, 802 + i * 76); }); }
  if (placing(T, 5)) { const k = (T - stepStart(5)) / SD; ctx.globalAlpha = A; select(ctx, 18, 40, w - 36, h - 60, "Mobile layout", Math.min(1, k * 4) * Math.min(1, (1 - k) * 4)); }
  if (T > VISIT + 2.4) { ctx.globalAlpha = A * ease(clamp01((T - VISIT - 2.4) / 0.5)); rr(ctx, 34, h - 130, w - 68, 86, 22); ctx.fillStyle = "#121212"; ctx.fill(); ctx.fillStyle = "#f2efe8"; ctx.font = `500 28px ${FONT}`; ctx.fillText("✓ Booked: Sat 10:30", 70, h - 87); }
  ctx.globalAlpha = 1;
}

// ---------- Laptop: the builder (1024 × 640) ----------
function drawBuilder(ctx, t, w, h) {
  const T = t % LOOP, A = fadeAll(T);
  ctx.globalAlpha = 1; ctx.fillStyle = "#121315"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1b1c1f"; ctx.fillRect(0, 0, w, 52);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(24 + i * 20, 26, 6, 0, Math.PI * 2); ctx.fill(); });
  ctx.textBaseline = "middle"; ctx.fillStyle = "#d9d6cf"; ctx.font = `600 20px ${FONT}`; ctx.fillText("Builder  ·  brightsmile.co", 96, 27);
  const done = STEPS.filter((_, i) => T >= stepStart(i) + SD).length;
  const [chip, col] = T >= LIVE ? ["● LIVE", "#3ddc84"] : T >= PUBLISH ? ["PUBLISHING", "#ffb000"] : T >= S0 ? [`BUILDING ${Math.min(done + 1, 7)}/7`, "#ff8a6a"] : ["READING BRIEF", "#9a978f"];
  ctx.font = `600 16px ${MONO}`; const cw = ctx.measureText(chip).width + 28;
  rr(ctx, w - cw - 20, 12, cw, 30, 15); ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fill(); ctx.fillStyle = col; ctx.fillText(chip, w - cw - 6, 27);
  ctx.globalAlpha = A;
  // brief, typed
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 15px ${MONO}`; ctx.fillText("BRIEF", 24, 82);
  rr(ctx, 20, 96, 380, 108, 14); ctx.fillStyle = "#1d1e22"; ctx.fill();
  const nb = Math.floor(clamp01(T / 1.6) * BRIEF.length);
  ctx.fillStyle = "#ece8df"; ctx.font = `400 19px ${FONT}`;
  wrapText(ctx, BRIEF.slice(0, nb) + (T < 1.7 && Math.floor(T * 3) % 2 ? "▍" : ""), 36, 124, 350, 26);
  // steps
  ctx.fillStyle = "#8d8b93"; ctx.font = `500 15px ${MONO}`; ctx.fillText("STEPS", 24, 232);
  STEPS.forEach((s, i) => {
    const y = 266 + i * 44, st = T >= stepStart(i) + SD ? "done" : placing(T, i) ? "now" : "todo";
    if (st === "now") { rr(ctx, 16, y - 18, 388, 36, 10); ctx.fillStyle = "rgba(255,61,31,.12)"; ctx.fill(); }
    if (st === "done") { ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(36, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#0e2a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(31, y); ctx.lineTo(35, y + 4); ctx.lineTo(42, y - 4); ctx.stroke(); }
    else if (st === "now") { ctx.strokeStyle = "#ff5a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(36, y, 9, t * 6, t * 6 + 4.2); ctx.stroke(); }
    else { ctx.strokeStyle = "#3a3b40"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(36, y, 8, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = st === "todo" ? "#6d6b72" : "#ece8df"; ctx.font = `${st === "now" ? 600 : 400} 18px ${FONT}`; ctx.fillText(s.label, 58, y);
  });
  // code editor: the lines for each step are written as the step runs
  ctx.fillStyle = "#17181b"; ctx.fillRect(420, 52, w - 420, h - 52);
  rr(ctx, 432, 62, 128, 28, 8); ctx.fillStyle = "#222327"; ctx.fill(); ctx.fillStyle = "#c9c6bf"; ctx.font = `500 15px ${MONO}`; ctx.fillText("index.html", 446, 76);
  const lines = [];
  STEPS.forEach((s, i) => {
    const k = clamp01((T - stepStart(i)) / (SD * 0.9));
    if (k <= 0) return;
    const total = s.code.join("").length; let budget = Math.floor(k * total);
    for (const l of s.code) { if (budget <= 0) break; lines.push({ text: l.slice(0, budget), check: i === 6 }); budget -= l.length; }
    lines.push({ text: "" });
  });
  const view = lines.slice(-12);
  view.forEach((l, i) => {
    const y = 120 + i * 36;
    ctx.fillStyle = "#4a4b52"; ctx.font = `400 15px ${MONO}`; ctx.textAlign = "right"; ctx.fillText(String(lines.length - view.length + i + 1), 470, y); ctx.textAlign = "left";
    codeLine(ctx, l.text, 488, y, l.check);
  });
  if (T >= S0 && T < PUBLISH && Math.floor(t * 2.5) % 2) { const y = 120 + (view.length - 2) * 36; ctx.fillStyle = "#ff5a3a"; ctx.fillRect(488 + Math.min(480, ctx.measureText((view[view.length - 2] || {}).text || "").width + 2), y - 11, 9, 22); }
  // checks, publish, first booking
  if (T >= stepStart(6) + 0.5) {
    ctx.globalAlpha = A * ease(clamp01((T - stepStart(6) - 0.5) / 0.4));
    [["Speed", "99"], ["Search", "100"], ["Access", "98"]].forEach(([n, v], i) => { const x = 20 + i * 128; rr(ctx, x, h - 92, 118, 66, 12); ctx.fillStyle = "#1d2a22"; ctx.fill(); ctx.fillStyle = "#3ddc84"; ctx.font = `700 26px ${FONT}`; ctx.fillText(v, x + 14, h - 68); ctx.fillStyle = "#8fd4aa"; ctx.font = `500 14px ${MONO}`; ctx.fillText(n.toUpperCase(), x + 14, h - 40); });
    ctx.globalAlpha = A;
  }
  if (T > VISIT + 2.6) {
    ctx.globalAlpha = A * ease(clamp01((T - VISIT - 2.6) / 0.4));
    rr(ctx, 436, h - 70, 572, 48, 12); ctx.fillStyle = "#1d2a22"; ctx.fill();
    ctx.fillStyle = "#3ddc84"; ctx.font = `600 18px ${FONT}`; ctx.fillText("First booking from the new site: Saturday 10:30", 456, h - 46);
  }
  ctx.globalAlpha = 1;
}
function wrapText(ctx, text, x, y, max, lh) {
  let line = "", yy = y;
  for (const wd of text.split(" ")) { const tt = line ? `${line} ${wd}` : wd; if (ctx.measureText(tt).width > max) { ctx.fillText(line, x, yy); line = wd; yy += lh; } else line = tt; }
  ctx.fillText(line, x, yy);
}
/* a little syntax colouring: tags, attribute names, strings, text */
function codeLine(ctx, s, x, y, check) {
  ctx.font = `400 17px ${MONO}`;
  if (check) { ctx.fillStyle = "#3ddc84"; ctx.fillText(s, x, y); return; }
  const parts = s.split(/(<\/?[a-z0-9]+|"[^"]*"?|[a-z-]+=|>|\{|\}|:)/i).filter(Boolean);
  let cx = x;
  for (const p of parts) {
    ctx.fillStyle = /^<\/?[a-z]/i.test(p) || p === ">" ? "#ff8a6a" : /^"/.test(p) ? "#98c379" : /=$/.test(p) ? "#e6c07b" : /^[{}:]$/.test(p) ? "#8d8b93" : "#d7d4cc";
    ctx.fillText(p, cx, y); cx += ctx.measureText(p).width;
  }
}

/* Solid veneered top (one continuous sheet of grain, eased edges, satin lacquer) on slim
   powder-coated steel sled legs. wood: "oak" or "walnut". */
const powderCoat = new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.62, metalness: 0.35 });
const veneers = {};
function veneer(A, wood) {
  if (veneers[wood]) return veneers[wood];
  const id = wood === "walnut" ? "american_walnut_veneer" : "white_oak_veneer";
  const t = (map, srgb) => { if (!A.textures[id][map]) return null; const x = A.textures[id][map].clone(); x.repeat.set(0.55, 0.55); x.offset.set(0.2, 0.1); if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.needsUpdate = true; return x; };
  veneers[wood] = new THREE.MeshPhysicalMaterial({
    map: t("Diffuse", true), normalMap: t("nor_gl"), roughnessMap: t("arm"), normalScale: new THREE.Vector2(0.6, 0.6),
    color: wood === "walnut" ? "#cc9468" : "#e7c9a2", roughness: 0.75, metalness: 0,
    clearcoat: 0.35, clearcoatRoughness: 0.32,
  });
  return veneers[wood];
}
export function oakTable(A, w, d, h = 0.74, legInset = 0.06, wood = "oak") {
  const g = new THREE.Group();
  const T = 0.03, e = 0.006, r = 0.012;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: T - e * 2, bevelEnabled: true, bevelThickness: e, bevelSize: e - 0.001, bevelSegments: 3, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, h - T + e, 0);
  const top = new THREE.Mesh(geo, veneer(A, wood)); top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  [-1, 1].forEach((sx) => {
    const x = sx * (w / 2 - legInset);
    [-1, 1].forEach((t) => { const post = box(0.03, h - T, 0.03, powderCoat, 0.004); post.position.set(x, (h - T) / 2, t * (d / 2 - 0.07)); g.add(post); });
    const foot = box(0.03, 0.022, d - 0.1, powderCoat, 0.004); foot.position.set(x, 0.011, 0); g.add(foot);
    const under = box(0.03, 0.03, d - 0.12, powderCoat, 0.004); under.position.set(x, h - T - 0.015, 0); g.add(under);
  });
  const rail = box(w - legInset * 2 - 0.03, 0.03, 0.02, powderCoat, 0.004); rail.position.set(0, h - T - 0.015, -d / 2 + 0.07); g.add(rail);
  return g;
}

/* Framed print: oak frame, white mat, an abstract print in the studio colours */
function framedPrint(w, h, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const c = document.createElement("canvas"); c.width = 512; c.height = Math.round((512 * h) / w);
  const p = c.getContext("2d");
  p.fillStyle = "#efe8dc"; p.fillRect(0, 0, c.width, c.height);
  p.fillStyle = "#d9cbb4"; p.fillRect(60, 60, c.width - 120, c.height - 120);
  p.fillStyle = "#ff3d1f"; p.beginPath(); p.arc(c.width * 0.62, c.height * 0.48, 70, 0, Math.PI * 2); p.fill();
  p.fillStyle = "#1d1d20"; p.fillRect(60, c.height * 0.62, c.width - 120, c.height * 0.38 - 60);
  p.fillStyle = "#b48c62"; p.fillRect(120, c.height * 0.3, 18, c.height * 0.45);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  art.position.z = 0.018;
  const frame = box(w, h, 0.03, mats.oak); frame.position.z = 0.0;
  g.add(frame, art);
  return g;
}

function monitorStand(g, x, z, height, deskH) {
  const neck = box(0.035, height, 0.025, mats.blackSteel); neck.position.set(x, deskH + height / 2, z - 0.05);
  const foot = box(0.22, 0.01, 0.16, mats.blackSteel); foot.position.set(x, deskH + 0.005, z - 0.02);
  g.add(neck, foot);
}

export function buildWeb(A) {
  const g = new THREE.Group();
  g.position.set(-3.4, 0, -4.35);
  const H = 0.74;
  g.add(oakTable(A, 1.8, 0.8, H));

  const main = display(0.7, 0.394, drawSiteBuild, { px: 1280, fps: 15, res: 0.8 });
  main.group.position.set(-0.18, H + 0.43, -0.16); main.group.rotation.y = 0.05;
  monitorStand(g, -0.18, -0.12, 0.24, H);
  const side = display(0.3, 0.533, drawMobileBuild, { px: 540, fps: 12 });
  side.group.position.set(0.48, H + 0.42, -0.12); side.group.rotation.y = -0.35;
  monitorStand(g, 0.48, -0.08, 0.16, H);
  g.add(main.group, side.group);

  // the first keyboard and mouse were plain boxes: kept for the lighting bake, hidden once it is applied
  mats.matteWhite.userData.retire = true;
  const kb = box(0.42, 0.014, 0.13, mats.matteWhite, 0.005); kb.position.set(-0.18, H + 0.007, 0.16); g.add(kb);
  const mouse = box(0.06, 0.022, 0.1, mats.matteWhite, 0.011); mouse.position.set(0.18, H + 0.011, 0.18); g.add(mouse);
  // a felt mat under the keyboard and mouse (it also covers the old props' baked shadows)
  const MAT = 0.003;
  const pad = deskMat(0.7, 0.3, MAT); pad.position.set(-0.05, H, 0.175); g.add(pad);
  const keys = deskKeyboard(); keys.position.set(-0.18, H + MAT, 0.16); g.add(keys);
  const mse = deskMouse(); mse.position.set(0.18, H + MAT, 0.18); mse.rotation.y = -0.08; g.add(mse);
  // the laptop running the builder, turned a little towards the chair
  const lap = laptop(drawBuilder, { fps: 15, scale: 1.15 }); lap.group.position.set(-0.6, H, 0.13); lap.group.rotation.y = 0.32; g.add(lap.group);
  const cup0 = bakedMug(); cup0.position.set(0.36, H, 0.24); cup0.rotation.y = 0.8; g.add(cup0);
  const cup = mug(); cup.position.set(0.36, H, 0.24); cup.rotation.y = 0.8; g.add(cup);

  g.add(A.place("desk_lamp_arm_01", -0.74, H, -0.22, 25));
  g.add(A.place("potted_plant_04", 0.8, H, -0.28, 0, 1.15));
  g.add(A.place("standing_picture_frame_02", -0.45, H, -0.3, 160, 0.9));
  g.add(A.place("modern_arm_chair_01", 0.78, 0, 0.95, 215)); // pushed back from the desk: nobody needs to sit here
  g.add(framedPrint(0.72, 0.52, -0.1, 1.95, -0.62));
  // steel-frame shelving to the left, with books and vases
  g.add(A.place("steel_frame_shelves_03", -2.25, 0, -0.29));
  g.add(A.place("book_encyclopedia_set_01", -2.9, 1.27, -0.32, 0, 0.8));
  g.add(A.place("ceramic_vase_01", -2.45, 1.27, -0.3, 0, 0.9));
  g.add(A.place("ceramic_vase_04", -1.85, 1.77, -0.3, 0, 0.8));
  g.add(A.place("potted_plant_04", -1.6, 1.77, -0.3, 40, 1.2));


  return {
    group: g,
    anchor: new THREE.Vector3(0, 1.75, -0.3),
    update(t) { lap.screen.update(t); main.screen.update(t); side.screen.update(t); },
  };
}

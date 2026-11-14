/* Station 04 · Google & Meta Ads — the leads wall.
   One story, readable from across the room: how many enquiries a business got before Scyne ran
   its ads, and how many after. The six screens act as one video wall (a single picture split
   across them, the bezels hiding a sliver as on a real one): a thin trickle of people on the left
   (12 leads a month), through the ×6 in the middle, and a crowd on the right (74 a month).
   Underneath: the ad itself on a phone turning into an enquiry, and twelve weeks of leads climbing
   from where they were. A ticker of new leads runs below, and on the bench two glass jars fill
   with little figures, one per lead: one drops into "before" for every six into "with Scyne".
   (An example client: the figures are illustrative.) */

import * as THREE from "three";
import { mats, box, display, Screen, rr, FONT, MONO, ease } from "../kit.js";
import { live, contactShadow } from "../devices.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const C = { bg: "#0c0d0f", ink: "#ece8df", dim: "#8d8a84", mute: "#45464c", red: "#ff3d1f", green: "#3ddc84" };
const L = 14; // one telling of the story, in seconds
const BEFORE = 12, AFTER = 74; // leads a month
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/* ---------- The video wall: one 2361 × 892 picture, six 768 × 432 screens ---------- */
const TW = 0.95, TH = 0.534, GAP = 0.035, PPM = 768 / TW;
const MW = Math.round((3 * TW + 2 * GAP) * PPM), MH = Math.round((2 * TH + GAP) * PPM);
const TX = [0, 1, 2].map((c) => Math.round(c * (TW + GAP) * PPM)), TY = [0, 1].map((r) => Math.round(r * (TH + GAP) * PPM));
let wallCanvas = null, wallT = -1;
function wall(t) {
  if (!wallCanvas) { wallCanvas = document.createElement("canvas"); wallCanvas.width = MW; wallCanvas.height = MH; }
  // drawn once per moment and shared by the six screens, so they never disagree
  if (wallT < 0 || t < wallT || t - wallT >= 0.08) { wallT = t; drawWall(wallCanvas.getContext("2d"), t); }
  return wallCanvas;
}
const tile = (i) => (ctx, t, w, h) => ctx.drawImage(wall(t), TX[i % 3], TY[Math.floor(i / 3)], w, h, 0, 0, w, h);

/* a person: one lead */
function person(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.55, s * 0.72, s * 0.62, 0, Math.PI, 0); ctx.fill();
}
function label(ctx, text, x, y, color = C.dim, size = 22, align = "left") {
  ctx.fillStyle = color; ctx.font = `500 ${size}px ${MONO}`; ctx.textAlign = align; ctx.fillText(text, x, y); ctx.textAlign = "left";
}
function text(ctx, s, x, y, size, color = C.ink, align = "left", weight = 600) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = "left";
}

// leads per week: about 3 before, climbing as the ads are tested and the winners kept
const WEEKS = [4, 5, 7, 8, 10, 11, 13, 14, 15, 17, 18, 19];

function drawWall(ctx, t) {
  const T = t % L, k = ease(clamp01(T / 10)); // the counters run for ten seconds, then hold
  ctx.textBaseline = "middle";
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, MW, MH);
  ctx.fillStyle = "rgba(255,255,255,.028)";
  for (let x = 0; x < MW; x += 48) ctx.fillRect(x, 0, 1, MH);
  for (let y = 0; y < MH; y += 48) ctx.fillRect(0, y, MW, 1);

  /* --- top row: before → ×6 → with Scyne --- */
  const NX = TX[1] + 384, NY = 300, NR = 104, SY = 318;
  const halo = ctx.createRadialGradient(NX, NY, NR * 0.6, NX, NY, NR * 3);
  halo.addColorStop(0, "rgba(255,61,31,.28)"); halo.addColorStop(1, "rgba(255,61,31,0)");
  ctx.fillStyle = halo; ctx.fillRect(TX[1], 0, 768, 432);

  // before: a thin trickle of people, far apart
  const x0 = TX[0] + 56, xin = NX - NR;
  ctx.strokeStyle = "rgba(236,232,223,.14)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, SY); ctx.lineTo(xin, SY); ctx.stroke();
  for (let j = 0; j < 3; j++) { const x = x0 + ((T * 70 + j * 330) % (xin - x0)); person(ctx, x, SY, 15, C.dim); }
  // after: six lanes, a crowd
  const xo = NX + NR, xend = TX[2] + 712, lanes = [266, 288, 310, 332, 354, 376];
  lanes.forEach((ly, li) => {
    const yAt = (x) => { const u = clamp01((x - xo) / 150); const s = u * u * (3 - 2 * u); return SY + (ly - SY) * s; };
    ctx.strokeStyle = "rgba(61,220,132,.16)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = xo; x <= xend; x += 12) { x === xo ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x)); } ctx.stroke();
    for (let j = 0; j < 7; j++) { const x = xo + ((T * 110 + j * 150 + li * 47) % (xend - xo)); person(ctx, x, yAt(x), 8.5, C.green); }
  });
  // the middle: what we do
  label(ctx, "WHAT WE DO", NX, 62, C.dim, 22, "center");
  text(ctx, "Test ads. Keep winners. Cut the rest.", NX, 116, 33, C.ink, "center");
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.strokeStyle = `rgba(255,61,31,${0.25 + pulse * 0.25})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(NX, NY, NR + 10 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#15161a"; ctx.beginPath(); ctx.arc(NX, NY, NR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.stroke();
  text(ctx, "×6", NX, NY - 10, 84, C.ink, "center");
  label(ctx, "MORE LEADS", NX, NY + 50, C.red, 18, "center");
  // left: before
  label(ctx, "BEFORE SCYNE", x0, 62);
  text(ctx, String(BEFORE), x0, 152, 110, C.dim);
  ctx.font = `600 110px ${FONT}`; const bw = ctx.measureText(String(BEFORE)).width;
  text(ctx, "leads a month", x0 + bw + 18, 176, 30, C.dim, "left", 500);
  label(ctx, "A FEW ENQUIRIES, NOW AND THEN", x0, 384, C.mute, 20);
  // right: with Scyne
  const xr = TX[2] + 56, n = String(Math.round(BEFORE + (AFTER - BEFORE) * k));
  label(ctx, "WITH SCYNE", xr, 62);
  text(ctx, n, xr, 152, 110, C.green);
  ctx.font = `600 110px ${FONT}`; const aw = ctx.measureText(n).width;
  text(ctx, "leads a month", xr + aw + 18, 176, 30, C.ink, "left", 500);
  text(ctx, "Same business. Far more enquiries.", xr, 414, 26, C.dim, "left", 500);

  /* --- bottom left: the ad, on a phone, turning into an enquiry --- */
  const by = TY[1], ph = T % 7;
  const px = TX[0] + 60, py = by + 22, pw = 200, phh = 388;
  rr(ctx, px - 8, py - 8, pw + 16, phh + 16, 36); ctx.fillStyle = "#26272b"; ctx.fill();
  rr(ctx, px, py, pw, phh, 28); ctx.fillStyle = "#fafafa"; ctx.fill();
  ctx.save(); rr(ctx, px, py, pw, phh, 28); ctx.clip();
  if (ph < 3.4) {
    ctx.translate(0, (1 - ease(ph / 0.5)) * 60);
    // header
    const av = ctx.createLinearGradient(px + 14, py + 22, px + 38, py + 46); av.addColorStop(0, "#ff8a3d"); av.addColorStop(1, "#ff3d1f");
    ctx.fillStyle = av; ctx.beginPath(); ctx.arc(px + 26, py + 34, 12, 0, Math.PI * 2); ctx.fill();
    text(ctx, "kaya.interiors", px + 46, py + 28, 15, "#111");
    ctx.fillStyle = "#777"; ctx.font = `400 12px ${FONT}`; ctx.fillText("Sponsored", px + 46, py + 45);
    // the photo: a finished living room, a lamp lit on a warm wall
    const iy = py + 60, is = pw;
    const bg = ctx.createLinearGradient(0, iy, 0, iy + is); bg.addColorStop(0, "#e9c9a4"); bg.addColorStop(1, "#c98f5e");
    ctx.fillStyle = bg; ctx.fillRect(px, iy, is, is);
    const lg = ctx.createRadialGradient(px + 140, iy + 60, 4, px + 140, iy + 60, 100); lg.addColorStop(0, "rgba(255,240,200,.85)"); lg.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = lg; ctx.fillRect(px, iy, is, is);
    ctx.fillStyle = "#7b8a72"; rr(ctx, px + 16, iy + 112, 112, 44, 12); ctx.fill(); // sofa back
    rr(ctx, px + 10, iy + 140, 124, 32, 10); ctx.fillStyle = "#6c7b64"; ctx.fill(); // seat
    ctx.fillStyle = "#3a2a1e"; ctx.fillRect(px + 138, iy + 64, 4, 108); // lamp stem
    ctx.fillStyle = "#f6efe2"; ctx.beginPath(); ctx.ellipse(px + 140, iy + 64, 30, 22, 0, Math.PI, 0); ctx.fill(); // shade
    ctx.fillStyle = "#5a3e2a"; ctx.fillRect(px, iy + 172, is, is - 172); // floor
    // the button
    const tapping = ph > 2.3 && ph < 3.0, cy = iy + is;
    ctx.fillStyle = tapping ? "#d6d6d6" : "#efefef"; ctx.fillRect(px, cy, pw, 34);
    text(ctx, "Get a free quote", px + 14, cy + 17, 14, "#111"); text(ctx, "›", px + pw - 18, cy + 16, 18, "#111");
    ctx.fillStyle = "#111"; ctx.font = `600 13px ${FONT}`; ctx.fillText("♥ 2,184 likes", px + 14, cy + 56);
    ctx.font = `400 13px ${FONT}`; ctx.fillText("Your 2BHK, designed and", px + 14, cy + 76); ctx.fillText("done in 45 days.", px + 14, cy + 94);
    if (tapping) {
      const u = (ph - 2.3) / 0.7;
      ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - u)})`; ctx.beginPath(); ctx.arc(px + pw * 0.62, cy + 17, 8 + u * 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(px + pw * 0.62, cy + 17, 9, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    const pop = ease((ph - 3.4) / 0.35), cx = px + pw / 2;
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(cx, py + 120, 38 * pop, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(cx - 16 * pop, py + 121); ctx.lineTo(cx - 4 * pop, py + 133); ctx.lineTo(cx + 18 * pop, py + 109); ctx.stroke(); ctx.lineCap = "butt";
    ctx.globalAlpha = pop;
    text(ctx, "Request sent", cx, py + 190, 22, "#111", "center");
    ctx.fillStyle = "#555"; ctx.font = `400 14px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText("We’ll call you back", cx, py + 222); ctx.fillText("in 10 minutes.", cx, py + 242); ctx.textAlign = "left";
    rr(ctx, px + 18, py + 276, pw - 36, 64, 12); ctx.fillStyle = "#f0efec"; ctx.fill();
    ctx.fillStyle = "#111"; ctx.font = `600 14px ${FONT}`; ctx.fillText("Priya S.", px + 32, py + 298);
    ctx.fillStyle = "#777"; ctx.font = `400 13px ${FONT}`; ctx.fillText("2BHK · Andheri West", px + 32, py + 320);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // the three steps beside it
  const step = ph < 2.3 ? 0 : ph < 3.4 ? 1 : 2;
  ["Your ad shows up", "They tap “Get a quote”", "You get the lead."].forEach((s, i) => {
    const y = by + 92 + i * 92, on = i === step;
    label(ctx, `0${i + 1}`, TX[0] + 312, y, on ? C.red : C.mute, 22);
    text(ctx, s, TX[0] + 358, y, 29, on ? (i === 2 ? C.green : C.ink) : C.mute);
  });
  label(ctx, "EXAMPLE · AN INTERIOR DESIGN STUDIO", TX[0] + 312, by + 372, C.dim, 18);

  /* --- bottom middle and right: leads per week, from where they were --- */
  text(ctx, "Before: 3 leads a week.", TX[1] + 56, by + 56, 34, C.dim);
  text(ctx, "Now: 19 a week.", TX[2] + 56, by + 56, 34, C.green);
  const base = by + 390, unit = 13, slot = (768 - 112) / 6;
  // where they were: a dashed line at three a week, right across
  ctx.strokeStyle = "rgba(236,232,223,.4)"; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(TX[1] + 56, base - 3 * unit); ctx.lineTo(TX[2] + 712, base - 3 * unit); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, "BEFORE", TX[2] + 712, base - 3 * unit - 16, C.dim, 15, "right");
  WEEKS.forEach((m, i) => {
    const tx = TX[i < 6 ? 1 : 2] + 56 + (i % 6) * slot, g = ease(clamp01(k * 13 - i));
    const hh = Math.max(2, m * unit * g);
    rr(ctx, tx + 30, base - hh, 50, hh, 6); ctx.fillStyle = C.green; ctx.fill();
    label(ctx, `W${i + 1}`, tx + 55, base + 22, C.dim, 16, "center");
    if (g > 0.9) label(ctx, String(m), tx + 55, base - hh - 16, C.ink, 17, "center");
  });
}

/* ---------- Ticker: leads as they come in ---------- */
const FEED = [["NEW LEAD", "Priya S. · Instagram ad · Andheri"], ["NEW LEAD", "Rahul M. · Google search · Pune"], ["CALL BOOKED", "Anita K. · Facebook ad · Thane"],
  ["NEW LEAD", "Vikram P. · Google search · Bandra"], ["NEW LEAD", "Neha R. · Instagram ad · Powai"], ["CALL BOOKED", "Sameer D. · Google search · Navi Mumbai"]];
let feedW = 0;
function drawTicker(ctx, t, w, h) {
  ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "middle";
  const piece = (x, draw) => {
    for (const [tag, rest] of FEED) {
      ctx.font = `600 40px ${MONO}`; if (draw) { ctx.fillStyle = tag === "NEW LEAD" ? C.green : "#f2c14e"; ctx.fillText(tag, x, h / 2 + 2); } x += ctx.measureText(tag + "  ").width;
      ctx.font = `500 40px ${MONO}`; if (draw) { ctx.fillStyle = C.ink; ctx.fillText(rest, x, h / 2 + 2); } x += ctx.measureText(rest).width;
      if (draw) { ctx.fillStyle = C.red; ctx.fillText("  ●  ", x, h / 2 + 2); } x += ctx.measureText("  ●  ").width;
    }
    return x;
  };
  if (!feedW) feedW = piece(0, false);
  const x = -((t * 110) % feedW);
  for (let k = 0; k < 3 && x + k * feedW < w; k++) piece(x + k * feedW, true);
}

/* ---------- On the bench: two jars of leads, before and with Scyne ---------- */
function card(top, big, color) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 192;
  const x = c.getContext("2d");
  x.fillStyle = "#141417"; x.beginPath(); x.roundRect(0, 0, 512, 192, 24); x.fill();
  x.textBaseline = "middle"; x.fillStyle = "#9a978f"; x.font = `500 30px ${MONO}`; x.fillText(top, 34, 52);
  x.fillStyle = color; x.font = `600 76px ${FONT}`; x.fillText(big, 30, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.0975), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }));
}
function jar(r, h) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: "#e6eef2", roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), glass); wall.position.y = h / 2;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.008, 64), glass); floor.position.y = 0.004;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 10, 64), new THREE.MeshPhysicalMaterial({ color: "#f2f7f9", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false }));
  lip.rotation.x = Math.PI / 2; lip.position.y = h;
  wall.renderOrder = floor.renderOrder = lip.renderOrder = 2;
  g.add(floor, wall, lip, contactShadow(r * 2.6, r * 2.6, 0.5));
  return g;
}

function leadJars() {
  const g = new THREE.Group();
  const Y = 0.475, Z = 0.48;
  const A = { x: -0.42, r: 0.09, h: 0.3, per: 3, ring: 0.035, n: 6 }, B = { x: 0.32, r: 0.13, h: 0.34, per: 5, ring: 0.06, n: 36 };
  [A, B].forEach((j) => { const m = jar(j.r, j.h); m.position.set(j.x, Y, Z); g.add(m); });
  const cards = [[A, card("BEFORE SCYNE", "12 / month", "#ece8df")], [B, card("WITH SCYNE", "74 / month", C.green)]];
  const stand = new THREE.MeshStandardMaterial({ color: "#141417", roughness: 0.6 });
  cards.forEach(([j, c]) => {
    c.position.set(j.x, Y + 0.05, Z + 0.15); c.rotation.x = -0.35; g.add(c);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.006, 0.035), stand); s.position.set(j.x, Y + 0.003, Z + 0.16); g.add(s);
  });

  // one figure per lead (glossy plastic, grey before, green with Scyne): each falls in and lies on the pile
  const body = new THREE.CylinderGeometry(0.011, 0.019, 0.036, 20).translate(0, -0.012, 0);
  const head = new THREE.SphereGeometry(0.0125, 20, 14).translate(0, 0.019, 0);
  const geo = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()]);
  const TK = 0.034; // a figure lying down is about this deep
  const token = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const sets = [A, B].map((j, ji) => {
    const mesh = new THREE.InstancedMesh(geo, token(ji ? "#3ddc84" : "#9c9890"), j.n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; g.add(mesh);
    const slots = Array.from({ length: j.n }, (_, i) => {
      const layer = Math.floor(i / j.per), a = ((i % j.per) / j.per) * Math.PI * 2 + layer * 0.7 + rnd(i + ji * 50) * 0.4;
      const rr2 = (i % j.per === 0 && j.per > 3 ? 0.15 : 1) * j.ring * (0.85 + rnd(i + 7) * 0.3);
      return { p: new THREE.Vector3(j.x + Math.cos(a) * rr2, Y + 0.008 + 0.017 + layer * TK * 0.8, Z + Math.sin(a) * rr2), tx: Math.PI / 2 + (rnd(i + 3) - 0.5) * 0.5, ty: rnd(i + 9) * Math.PI * 2 };
    });
    return { j, mesh, slots, every: 11.5 / j.n };
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  const FALL = 0.45;

  function update(t) {
    const T = t % L;
    for (const { j, mesh, slots, every } of sets) {
      const top = Y + j.h + 0.08;
      for (let i = 0; i < j.n; i++) {
        const s = slots[i], d = 0.3 + i * every, gone = 12.6 + (j.n - 1 - i) * (1 / j.n);
        let size = 0;
        if (T >= d) {
          const u = clamp01((T - d) / FALL);
          v.set(s.p.x, top + (s.p.y - top) * u * u, s.p.z);
          e.set(s.tx + (1 - u) * 2.4, s.ty, 0, "YXZ"); size = 1 - clamp01((T - gone) / 0.3);
        }
        q.setFromEuler(e); sc.setScalar(size); m4.compose(size ? v : s.p, q, sc); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  update(0);
  g.userData.dynamic = true;
  return { group: live(g), update };
}

export function buildAds(A) {
  const g = new THREE.Group();
  g.position.set(6.98, 0, 0.9);
  g.rotation.y = -Math.PI / 2;

  // oak slat panel behind the screens
  const slat = A.surface("white_oak_veneer", 0.12, 1.2, { color: "#c4976c", metalness: 0 });
  for (let i = 0; i < 44; i++) { const s = box(0.06, 2.3, 0.03, slat); s.position.set(-1.72 + i * 0.08, 1.6, 0.015); g.add(s); }

  // six screens, one picture
  const screens = [];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const s = display(TW, TH, tile(i), { px: 768, depth: 0.04, bezel: 0.006, fps: 12, res: 0.8 });
    s.group.position.set((col - 1) * (TW + GAP), 2.05 - row * (TH + GAP), 0.06);
    g.add(s.group); screens.push(s.screen);
  }
  const ticker = new Screen(1536, 64, 3 * TW + 2 * GAP, 0.1, drawTicker, { brightness: 1.05, fps: 24 });
  ticker.mesh.position.set(0, 2.05 - TH * 1.5 - GAP - 0.1, 0.065);
  const tickerBack = box(3 * TW + 2 * GAP, 0.13, 0.03, mats.blackSteel); tickerBack.position.set(0, ticker.mesh.position.y, 0.045);
  g.add(tickerBack, ticker.mesh);
  const wash = new THREE.RectAreaLight("#e8edf6", 3.5, 3.0, 1.1); wash.position.set(0, 1.75, 0.12); wash.rotation.y = Math.PI; g.add(wash);

  // a bench below for people to sit and review
  const bench = box(1.6, 0.05, 0.38, A.surface("white_oak_veneer", 0.8, 0.2, { color: "#d8b48a", metalness: 0 })); bench.position.set(0, 0.45, 0.5);
  [-0.7, 0.7].forEach((x) => { const leg = box(0.04, 0.43, 0.32, mats.blackSteel); leg.position.set(x, 0.215, 0.5); g.add(leg); });
  g.add(bench);

  // and on it, the same story in two jars
  const jars = leadJars(); g.add(jars.group);

  return {
    group: g,
    anchor: new THREE.Vector3(0, 2.75, 0.1),
    update(t) { screens.forEach((s) => s.update(t)); ticker.update(t); jars.update(t); },
  };
}

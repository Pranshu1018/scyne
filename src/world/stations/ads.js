/* Station 04 · Google & Meta Ads — the results wall.
   Six screens on an oak-slatted panel: three ad versions being tested (one gets stopped),
   enquiries per week, cost per customer, and this week's decision. A red ticker underneath. */

import * as THREE from "three";
import { mats, box, display, Screen, rr, FONT, MONO, ease } from "../kit.js";

const ADS = [
  { tag: "Ad A · Search", line: "New 2 & 3-bed homes, 6 minutes from the metro.", keep: true },
  { tag: "Ad B · Instagram", line: "Luxury living, redefined.", keep: false },
  { tag: "Ad C · Facebook", line: "Visit this Saturday. Prices inside.", keep: true },
];
const ENQ = [12, 15, 14, 21, 26, 31, 38, 44];
const CPC = [100, 92, 95, 78, 66, 58, 51, 46];

function adScreen(i) {
  return (ctx, t, w, h) => {
    const ad = ADS[i], loop = t % 9;
    ctx.fillStyle = i === 1 ? "#d9d4cb" : "#ece8df"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#121212"; ctx.font = `600 26px ${MONO}`; ctx.textBaseline = "middle"; ctx.fillText(ad.tag.toUpperCase(), 40, 46);
    ctx.font = `600 56px ${FONT}`;
    let line = "", y = 140;
    for (const wd of ad.line.split(" ")) { const tt = line ? `${line} ${wd}` : wd; if (ctx.measureText(tt).width > w - 90) { ctx.fillText(line, 40, y); line = wd; y += 58; } else line = tt; }
    ctx.fillText(line, 40, y);
    if (loop > 3 + i * 1.2) {
      ctx.globalAlpha = ease((loop - 3 - i * 1.2) / 0.4);
      rr(ctx, 40, h - 100, 190, 60, 30); ctx.fillStyle = ad.keep ? "#121212" : "#ff3d1f"; ctx.fill();
      ctx.fillStyle = ad.keep ? "#ece8df" : "#121212"; ctx.font = `600 28px ${FONT}`; ctx.fillText(ad.keep ? "✓ Keep" : "✕ Stop", 70, h - 70);
      ctx.globalAlpha = 1;
    }
  };
}

function chart(kind) {
  return (ctx, t, w, h) => {
    const grow = ease((t % 9) / 4);
    ctx.fillStyle = "#101113"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = kind === "enq" ? "#ece8df" : "#ff3d1f"; ctx.font = `600 40px ${FONT}`; ctx.textBaseline = "middle";
    ctx.fillText(kind === "enq" ? "Enquiries per week" : "Cost per customer", 40, 50);
    const x0 = 40, y0 = 95, cw = w - 80, ch = h - 160, bw = cw / 8;
    if (kind === "enq") {
      ENQ.forEach((v, i) => {
        const bh = Math.max(1, (v / 44) * ch * Math.min(1, Math.max(0, grow * 8 - i)));
        rr(ctx, x0 + i * bw + 7, y0 + ch - bh, bw - 14, bh, 7); ctx.fillStyle = i === 7 ? "#ece8df" : "#3a3a42"; ctx.fill();
      });
    } else {
      ctx.strokeStyle = "#ff3d1f"; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.beginPath();
      CPC.slice(0, Math.max(1, Math.ceil(grow * 8))).forEach((v, i) => { const x = x0 + i * bw + bw / 2, y = y0 + (1 - v / 100) * ch; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    ctx.fillStyle = "#9a989f"; ctx.font = `500 22px ${MONO}`;
    for (let i = 0; i < 8; i++) ctx.fillText(`W${i + 1}`, x0 + i * bw + bw / 2 - 14, h - 32);
  };
}

function decision(ctx, t, w, h) {
  ctx.fillStyle = "#101113"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#a7a5ac"; ctx.font = `500 26px ${MONO}`; ctx.textBaseline = "middle"; ctx.fillText("THIS WEEK", 40, 50);
  [["Ads tested", "3"], ["Kept", "A, C"], ["Stopped", "B"], ["Cost per customer", "−54% since week 1"]].forEach(([k, v], i) => {
    ctx.fillStyle = "#ece8df"; ctx.font = `500 33px ${FONT}`; ctx.fillText(k, 40, 118 + i * 62);
    ctx.fillStyle = i === 3 ? "#ff3d1f" : "#ece8df"; ctx.font = `600 33px ${FONT}`;
    ctx.fillText(v, w - 40 - ctx.measureText(v).width, 118 + i * 62);
    ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fillRect(40, 146 + i * 62, w - 80, 2);
  });
}

const TICKER = "TESTING 3 ADS  ·  KEEP A AND C  ·  STOP B  ·  ENQUIRIES UP 3.7× IN 8 WEEKS  ·  COST PER CUSTOMER DOWN 54%  ·  ";
function drawTicker(ctx, t, w, h) {
  ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
  ctx.font = `500 44px ${MONO}`; ctx.textBaseline = "middle";
  const tw = ctx.measureText(TICKER).width, x = -((t * 120) % tw);
  ctx.fillStyle = "#ff3d1f";
  for (let k = 0; k < 3; k++) ctx.fillText(TICKER, x + k * tw, h / 2 + 2);
}

export function buildAds(A) {
  const g = new THREE.Group();
  g.position.set(6.98, 0, 0.9);
  g.rotation.y = -Math.PI / 2;

  // oak slat panel behind the screens
  const slat = A.surface("white_oak_veneer", 0.12, 1.2, { color: "#c4976c", metalness: 0 });
  for (let i = 0; i < 44; i++) { const s = box(0.06, 2.3, 0.03, slat); s.position.set(-1.72 + i * 0.08, 1.6, 0.015); g.add(s); }

  const TW = 0.95, TH = 0.534, GAP = 0.035;
  const draws = [adScreen(0), adScreen(1), adScreen(2), chart("enq"), chart("cpc"), decision];
  const screens = [];
  draws.forEach((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const s = display(TW, TH, d, { px: 768, depth: 0.04, bezel: 0.006, fps: 8, res: 0.8 });
    s.group.position.set((col - 1) * (TW + GAP), 2.05 - row * (TH + GAP), 0.06);
    g.add(s.group); screens.push(s.screen);
  });
  const ticker = new Screen(1536, 64, 3 * TW + 2 * GAP, 0.1, drawTicker, { brightness: 1.05, fps: 24 });
  ticker.mesh.position.set(0, 2.05 - TH * 1.5 - GAP - 0.1, 0.065);
  const tickerBack = box(3 * TW + 2 * GAP, 0.13, 0.03, mats.blackSteel); tickerBack.position.set(0, ticker.mesh.position.y, 0.045);
  g.add(tickerBack, ticker.mesh);
  const wash = new THREE.RectAreaLight("#e8edf6", 3.5, 3.0, 1.1); wash.position.set(0, 1.75, 0.12); wash.rotation.y = Math.PI; g.add(wash);

  // a bench below for people to sit and review
  const bench = box(1.6, 0.05, 0.38, A.surface("white_oak_veneer", 0.8, 0.2, { color: "#d8b48a", metalness: 0 })); bench.position.set(0, 0.45, 0.5);
  [-0.7, 0.7].forEach((x) => { const leg = box(0.04, 0.43, 0.32, mats.blackSteel); leg.position.set(x, 0.215, 0.5); g.add(leg); });
  g.add(bench);

  return {
    group: g,
    anchor: new THREE.Vector3(0, 2.75, 0.1),
    update(t) { screens.forEach((s) => s.update(t)); ticker.update(t); },
  };
}

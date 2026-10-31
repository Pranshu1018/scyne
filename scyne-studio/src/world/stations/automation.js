/* Station 02 · Automation — he sits back, the work gets done.
   A man leans back in an ergonomic chair, hands behind his head, at an oak desk with an open
   laptop he isn't touching. Around him, glass cards show the jobs running on their own
   (an email answered, a meeting booked, a support chat closed, an invoice sent, a lead saved),
   each one fed by a thin line of light from the laptop. On the wall, the day's board moves
   cards to "Invoiced" by itself. */

import * as THREE from "three";
import { box, display, Screen, rr, FONT, MONO, ease } from "../kit.js";
import { oakTable } from "./web.js";
import { officeChair } from "../chair.js";
import { laptop, plate, phone, mug, notebook } from "../devices.js";

// ---------- Wall board: today's work, moving by itself ----------
const COLS = ["New enquiry", "Saved to CRM", "Replied", "Booked", "Invoiced"];
const CARDS = [
  "Priya S. · Website form", "Dental clinic · WhatsApp", "R. Mehta · Google Ads", "Café Lumen · Instagram",
  "J. Fernandes · Call back", "Studio Nine · Website form", "A. Khan · Meta lead", "Oakfield Homes · Email",
];
const STEP = 1.6; // seconds per card move

function cardState(i, t) {
  const age = (t / STEP + CARDS.length * 10 - i) % CARDS.length;
  const col = Math.floor(age);
  return { col, k: ease((age - col) / 0.35) };
}

function drawBoard(ctx, t, w, h) {
  ctx.fillStyle = "#101113"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ece8df"; ctx.font = `600 36px ${FONT}`; ctx.textBaseline = "middle";
  ctx.fillText("Today's work", 44, 52);
  ctx.fillStyle = "#3ddc84"; ctx.font = `500 20px ${MONO}`;
  ctx.fillText(`● RUNNING ON ITS OWN  ·  ${23 + Math.floor(t / STEP)} TASKS DONE  ·  0 BY HAND`, 44, 94);
  const cw = (w - 88) / COLS.length;
  COLS.forEach((c, i) => {
    const x = 44 + i * cw;
    rr(ctx, x + 6, 130, cw - 12, h - 160, 18); ctx.fillStyle = "#17181b"; ctx.fill();
    ctx.fillStyle = i === COLS.length - 1 ? "#3ddc84" : "#8d8b93"; ctx.font = `500 18px ${MONO}`; ctx.fillText(c.toUpperCase(), x + 24, 160);
  });
  CARDS.forEach((name, i) => {
    const { col, k } = cardState(i, t);
    if (col >= COLS.length) return;
    const fromX = 44 + Math.max(0, col - 1) * cw, toX = 44 + col * cw;
    const x = col === 0 ? toX : fromX + (toX - fromX) * k;
    const y = 190 + (i % 3) * 96;
    const last = col === COLS.length - 1;
    ctx.globalAlpha = col === 0 ? k : 1;
    rr(ctx, x + 16, y, cw - 32, 80, 12); ctx.fillStyle = last ? "#1f3a2a" : "#ece8df"; ctx.fill();
    ctx.fillStyle = last ? "#d7f5e2" : "#121212"; ctx.font = `600 20px ${FONT}`;
    ctx.fillText(name.split(" · ")[0], x + 32, y + 28);
    ctx.font = `400 16px ${FONT}`; ctx.fillStyle = last ? "#8fd4aa" : "#666";
    ctx.fillText(last ? "✓ Paid invoice sent" : name.split(" · ")[1], x + 32, y + 56);
    ctx.globalAlpha = 1;
  });
}

// ---------- The jobs running around him ----------
const JOBS = [
  { icon: "mail", title: "Email answered", sub: "Priya S. asked about prices", doing: "Replying", pos: [-0.9, 1.74, 1.15] },
  { icon: "cal", title: "Meeting booked", sub: "Thu 3:00 pm · in both calendars", doing: "Booking", pos: [-1.12, 1.36, 1.4] },
  { icon: "chat", title: "Support chat closed", sub: "Order #2381 · tracking sent", doing: "Replying", pos: [0.95, 1.78, 1.0] },
  { icon: "doc", title: "Invoice sent", sub: "Oakfield Homes · reminder set", doing: "Sending", pos: [1.05, 1.36, 1.3] },
  { icon: "user", title: "New lead saved", sub: "From Google Ads · call at 5 pm", doing: "Saving", pos: [-0.95, 0.98, 1.6] },
];
const CYCLE = 7.5; // each job runs, finishes, rests, then runs again
const RUN = 0.32;  // share of the cycle spent "running"

function icon(ctx, kind, x, y, s) {
  ctx.strokeStyle = "#f2efe8"; ctx.lineWidth = s * 0.07; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "mail") { ctx.rect(x - s * 0.36, y - s * 0.25, s * 0.72, s * 0.5); ctx.moveTo(x - s * 0.36, y - s * 0.25); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x + s * 0.36, y - s * 0.25); }
  if (kind === "cal") { ctx.rect(x - s * 0.34, y - s * 0.26, s * 0.68, s * 0.58); ctx.moveTo(x - s * 0.34, y - s * 0.08); ctx.lineTo(x + s * 0.34, y - s * 0.08); ctx.moveTo(x - s * 0.16, y - s * 0.36); ctx.lineTo(x - s * 0.16, y - s * 0.18); ctx.moveTo(x + s * 0.16, y - s * 0.36); ctx.lineTo(x + s * 0.16, y - s * 0.18); }
  if (kind === "chat") { rr(ctx, x - s * 0.36, y - s * 0.3, s * 0.72, s * 0.48, s * 0.12); ctx.moveTo(x - s * 0.16, y + s * 0.18); ctx.lineTo(x - s * 0.26, y + s * 0.34); ctx.lineTo(x + s * 0.02, y + s * 0.18); }
  if (kind === "doc") { ctx.moveTo(x - s * 0.26, y - s * 0.36); ctx.lineTo(x + s * 0.12, y - s * 0.36); ctx.lineTo(x + s * 0.26, y - s * 0.22); ctx.lineTo(x + s * 0.26, y + s * 0.36); ctx.lineTo(x - s * 0.26, y + s * 0.36); ctx.closePath(); ctx.moveTo(x - s * 0.13, y - s * 0.05); ctx.lineTo(x + s * 0.13, y - s * 0.05); ctx.moveTo(x - s * 0.13, y + s * 0.12); ctx.lineTo(x + s * 0.13, y + s * 0.12); }
  if (kind === "user") { ctx.arc(x, y - s * 0.14, s * 0.15, 0, Math.PI * 2); ctx.moveTo(x - s * 0.3, y + s * 0.34); ctx.quadraticCurveTo(x, y - s * 0.02, x + s * 0.3, y + s * 0.34); }
  ctx.stroke();
}

function drawJob(job, i) {
  return (ctx, t, w, h) => {
    const p = ((t + i * 1.45) % CYCLE) / CYCLE;
    const running = p < RUN, k = Math.min(1, p / RUN);
    ctx.clearRect(0, 0, w, h);
    rr(ctx, 4, 4, w - 8, h - 8, 34); ctx.fillStyle = "rgba(22,22,25,0.82)"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = running ? "rgba(255,255,255,0.16)" : `rgba(61,220,132,${0.25 + 0.5 * Math.max(0, 1 - (p - RUN) * 6)})`; ctx.stroke();
    rr(ctx, 30, h / 2 - 50, 100, 100, 24); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
    icon(ctx, job.icon, 80, h / 2, 76);
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f2efe8"; ctx.font = `600 38px ${FONT}`; ctx.fillText(job.title, 158, h / 2 - 24);
    ctx.fillStyle = "#9a978f"; ctx.font = `400 26px ${FONT}`; ctx.fillText(job.sub, 158, h / 2 + 24);
    if (running) {
      ctx.fillStyle = "#c9c6bf"; ctx.font = `500 22px ${MONO}`; ctx.textAlign = "right";
      ctx.fillText(`${job.doing.toUpperCase()}${".".repeat(1 + Math.floor(t * 3) % 3)}`, w - 34, 44); ctx.textAlign = "left";
      rr(ctx, 158, h - 34, w - 196, 6, 3); ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fill();
      rr(ctx, 158, h - 34, (w - 196) * ease(k), 6, 3); ctx.fillStyle = "#ff5a3a"; ctx.fill();
    } else {
      ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(w - 58, 46, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#0e2a1a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w - 67, 46); ctx.lineTo(w - 60, 53); ctx.lineTo(w - 48, 39); ctx.stroke();
      ctx.fillStyle = "#8fd4aa"; ctx.font = `500 22px ${MONO}`; ctx.textAlign = "right"; ctx.fillText("DONE", w - 88, 46); ctx.textAlign = "left";
    }
  };
}

function drawLaptop(ctx, t, w, h) {
  ctx.fillStyle = "#f3f0ea"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#121212"; ctx.font = `600 40px ${FONT}`; ctx.textBaseline = "middle"; ctx.fillText("Automations", 44, 64);
  ctx.fillStyle = "#1d6b45"; ctx.font = `500 22px ${MONO}`; ctx.fillText("● ALL RUNNING", 44, 110);
  JOBS.forEach((j, i) => {
    const y = 180 + i * 64;
    ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.fillRect(44, y + 30, w - 88, 2);
    ctx.fillStyle = "#121212"; ctx.font = `500 28px ${FONT}`; ctx.fillText(j.title, 44, y);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(61,220,132,${0.55 + pulse * 0.45})`; ctx.beginPath(); ctx.arc(w - 60, y, 10, 0, Math.PI * 2); ctx.fill();
  });
}

function drawPhone(ctx, t, w, h) {
  ctx.fillStyle = "#0c0c0e"; ctx.fillRect(0, 0, w, h);
  const p = (t % CYCLE) / CYCLE;
  ctx.fillStyle = "#ece8df"; ctx.font = `300 96px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("4:52", w / 2, 150); ctx.textAlign = "left";
  const a = p < 0.5 ? ease(p / 0.08) : Math.max(0, 1 - (p - 0.5) / 0.1);
  ctx.globalAlpha = a;
  rr(ctx, 22, 260, w - 44, 120, 24); ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fill();
  ctx.fillStyle = "#ece8df"; ctx.font = `600 28px ${FONT}`; ctx.fillText("Meeting booked", 44, 300);
  ctx.fillStyle = "#b4b1aa"; ctx.font = `400 24px ${FONT}`; ctx.fillText("Thu 3:00 pm", 44, 342);
  ctx.globalAlpha = 1;
}

export function buildAutomation(A) {
  const g = new THREE.Group();
  g.position.set(1.3, 0, -4.72);
  g.updateMatrixWorld(true);

  // wall board, high enough to clear his head
  const board = display(1.5, 0.844, drawBoard, { px: 1600, fps: 12, res: 0.7 });
  board.group.position.set(0.15, 2.17, -0.215);
  g.add(board.group);
  // oak slats on black felt behind the desk, washed by a light hidden in the ceiling
  const PW = 2.1, PH = 3.2;
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ color: "#1b1918", roughness: 1 }));
  felt.position.set(0.15, PH / 2, -0.277); felt.receiveShadow = true; g.add(felt);
  const slatMat = A.surface("white_oak_veneer", 0.1, 1.5, { color: "#c4976c", metalness: 0 });
  for (let i = 0; i < 26; i++) { const s = box(0.045, PH - 0.01, 0.022, slatMat); s.position.set(0.15 - PW / 2 + 0.04 + i * 0.0805, PH / 2, -0.264); g.add(s); }
  const wash = new THREE.SpotLight("#ffd9ad", 7, 4.5, 0.95, 1, 1.6); wash.position.set(0.15, 3.12, 0.25); wash.target.position.set(0.15, 0.9, -0.28);
  g.add(wash, wash.target);
  g.add(A.place("wall_clock", 1.32, 2.2, -0.27));
  g.add(A.place("potted_plant_01", -1.5, 0, 0.05, 30));

  // desk with a leather mat, the laptop and a few things on it
  const DX = 0.15, DZ = 1.1, H = 0.74;
  const desk = oakTable(A, 1.6, 0.78, H, 0.08, "walnut"); desk.position.set(DX, 0, DZ); g.add(desk);
  // leather (sampled clear of the hide's seam)
  const hide = A.surface("fabric_leather_02", 0.35, 0.35, { color: "#3b332d", metalness: 0, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) });
  for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) hide[k].offset.set(0.65, 0.5);
  const mat = plate(0.8, 0.4, 0.0035, 0.02, hide); mat.position.set(DX, H, DZ - 0.1); g.add(mat);
  const lap = laptop(drawLaptop, { fps: 6 }); lap.group.position.set(DX, H + 0.003, DZ - 0.1); lap.group.rotation.y = Math.PI + 0.12; g.add(lap.group);
  const ph = phone(drawPhone, { fps: 6, brightness: 0.8 }); ph.group.position.set(DX + 0.5, H, DZ - 0.12); ph.group.rotation.y = -0.35; g.add(ph.group);
  const phoneScreen = ph.screen;
  const cup = mug(); cup.position.set(DX - 0.5, H, DZ - 0.18); cup.rotation.y = 2.2; g.add(cup);
  const book = notebook(hide); book.position.set(DX - 0.55, H, DZ + 0.1); book.rotation.y = 0.2; g.add(book);
  g.add(A.place("potted_plant_04", DX + 0.66, H, DZ + 0.22, 0, 1.1));

  // him, in the chair, pushed back from the desk
  const TILT = -0.15, YAW = 0.22, PIVOT = 0.42;
  const chair = officeChair(A);
  const seatPos = new THREE.Vector3(DX, 0, 0.3);
  chair.base.position.copy(seatPos); chair.base.rotation.y = YAW + 0.4; g.add(chair.base);
  const tilt = new THREE.Group(); tilt.position.set(seatPos.x, PIVOT, seatPos.z); tilt.rotation.set(TILT, YAW, 0, "YXZ");
  const sitter = new THREE.Group(); sitter.position.y = -PIVOT; tilt.add(sitter);
  sitter.add(chair.upper);
  const man = A.models.man;
  man.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; } });
  man.updateMatrixWorld(true);
  sitter.add(man);
  tilt.userData.dynamic = true; // he breathes, so his mesh stays out of the static merge
  g.add(tilt);

  // a slow breath and a little drift of the head, rotating bones about his own axes
  const bone = (n) => man.getObjectByName(n);
  const axisIn = (b, v) => { const q = new THREE.Quaternion(); b.parent.getWorldQuaternion(q); return v.clone().applyQuaternion(q.invert()).normalize(); };
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const moving = [["Bip01_Spine1", X], ["Bip01_Spine2", X], ["Bip01_Head", Y], ["Bip01_Neck", X]].map(([n, v]) => {
    const b = bone(n); return b && { b, base: b.quaternion.clone(), axis: axisIn(b, v) };
  });
  const qTmp = new THREE.Quaternion();
  const turn = (m, a) => { if (m) m.b.quaternion.copy(m.base).premultiply(qTmp.setFromAxisAngle(m.axis, a)); };

  // glass cards around him, each fed by a line of light from the laptop
  g.updateMatrixWorld(true);
  const from = lap.top.clone().applyAxisAngle(Y, Math.PI + 0.12).add(lap.group.position);
  const viewer = new THREE.Vector3(2.5, 1.55, -1.2); // the automation camera stop, in room space
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9c8").multiplyScalar(0.5), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
  const pulseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff5a3a").multiplyScalar(4), toneMapped: false });
  const jobs = JOBS.map((job, i) => {
    const s = new Screen(768, 256, 0.5, 0.1667, drawJob(job, i), { fps: 10, brightness: 0.95, res: 0.75 });
    s.material.transparent = true; s.material.depthWrite = false;
    const card = s.mesh; card.renderOrder = 2; card.userData.dynamic = true; g.add(card);
    const line = new THREE.Mesh(new THREE.BufferGeometry(), lineMat); line.renderOrder = 1; g.add(line);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), pulseMat);
    pulse.userData.dynamic = true; g.add(pulse);
    return { s, card, line, pulse, i, job };
  });
  // wide screens spread the cards around him; portrait phones pull them in and shrink them
  let narrowNow = null;
  function layout(narrow) {
    if (narrow === narrowNow) return;
    narrowNow = narrow;
    for (const j of jobs) {
      const [x, y, z] = j.job.pos;
      const nx = narrow ? DX + (x < DX ? -0.5 : 0.62) : x, ny = narrow ? 0.95 + (y - 0.98) * 0.75 : y, sc = narrow ? 0.55 : 1;
      j.card.position.set(nx, ny, z); j.card.scale.setScalar(sc); j.card.lookAt(viewer); j.y = ny;
      const side = x < DX ? 1 : -1; // join the card on the edge nearest the laptop
      const to = new THREE.Vector3(nx + side * 0.24 * sc, ny - 0.03 * sc, z);
      const mid = from.clone().lerp(to, 0.5); mid.y += 0.22; mid.z += 0.12;
      j.curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to);
      j.line.geometry.dispose(); j.line.geometry = new THREE.TubeGeometry(j.curve, 40, 0.0018, 5, false);
    }
  }
  layout(false);

  return {
    group: g,
    layout,
    anchor: new THREE.Vector3(DX, 2.75, -0.2),
    update(t) {
      board.screen.update(t);
      lap.screen.update(t);
      phoneScreen.update(t);
      const breath = Math.sin(t * 1.35);
      turn(moving[0], breath * 0.006); turn(moving[1], breath * 0.01);
      turn(moving[2], Math.sin(t * 0.21) * 0.035 + Math.sin(t * 0.57) * 0.01);
      turn(moving[3], Math.sin(t * 0.17 + 1) * 0.015);
      for (const j of jobs) {
        j.s.update(t);
        j.card.position.y = j.y + Math.sin(t * 0.8 + j.i * 1.7) * 0.012;
        const p = ((t + j.i * 1.45) % CYCLE) / CYCLE;
        // a pulse of light travels to the card while the job runs, then it rests
        const k = p / RUN;
        j.pulse.visible = k < 1;
        if (k < 1) j.curve.getPoint(ease(k), j.pulse.position);
      }
    },
  };
}

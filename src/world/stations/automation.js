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
import { laptop, plate, phone, mug, bakedMug, notebook } from "../devices.js";
import { prepareMan } from "../man.js";

// ---------- Wall board: today's work, moving by itself ----------
// Four short stages leave enough physical room for the board text to read from the tour camera.
const COLS = ["INBOX", "IN PROGRESS", "BOOKED", "PAID"];
const CARDS = [
  "Priya S. · Website enquiry", "Dental clinic · WhatsApp", "Café Lumen · Booking", "Oakfield Homes · Invoice",
];
const STEP = 1.6; // seconds per card move

function cardState(i, t) {
  const age = (t / STEP + CARDS.length * 10 - i) % CARDS.length;
  const col = Math.floor(age);
  return { col, k: ease((age - col) / 0.35) };
}

function drawBoard(ctx, t, w, h) {
  ctx.fillStyle = "#101113"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f3f0e9"; ctx.font = `600 62px ${FONT}`; ctx.textBaseline = "middle";
  ctx.fillText("Today's work", 52, 76);
  ctx.fillStyle = "#69e79a"; ctx.font = `500 30px ${MONO}`;
  ctx.fillText(`● RUNNING  ·  ${23 + Math.floor(t / STEP)} TASKS DONE  ·  0 BY HAND`, 52, 138);
  const inset = 52;
  const cw = (w - inset * 2) / COLS.length;
  COLS.forEach((c, i) => {
    const x = inset + i * cw;
    rr(ctx, x + 7, 194, cw - 14, h - 232, 18); ctx.fillStyle = "#17191b"; ctx.fill();
    ctx.fillStyle = i === COLS.length - 1 ? "#69e79a" : "#c0bdb6"; ctx.font = `600 30px ${MONO}`; ctx.fillText(c, x + 26, 233);
  });
  CARDS.forEach((name, i) => {
    const { col, k } = cardState(i, t);
    if (col >= COLS.length) return;
    const fromX = inset + Math.max(0, col - 1) * cw, toX = inset + col * cw;
    const x = col === 0 ? toX : fromX + (toX - fromX) * k;
    const y = 276 + i * 180;
    const last = col === COLS.length - 1;
    ctx.globalAlpha = col === 0 ? k : 1;
    rr(ctx, x + 18, y, cw - 36, 142, 12); ctx.fillStyle = last ? "#245136" : "#f4f1eb"; ctx.fill();
    ctx.fillStyle = last ? "#f0fff4" : "#111315"; ctx.font = `700 36px ${FONT}`;
    ctx.fillText(name.split(" · ")[0], x + 36, y + 48);
    ctx.font = `500 28px ${FONT}`; ctx.fillStyle = last ? "#b8edca" : "#494b4d";
    ctx.fillText(last ? "✓ Invoice sent" : name.split(" · ")[1], x + 36, y + 98);
    ctx.globalAlpha = 1;
  });
}

// ---------- The jobs running around him ----------
const JOBS = [
  { icon: "mail", title: "Email answered", sub: "Prices & availability", doing: "Replying", pos: [-0.9, 1.74, 1.15] },
  { icon: "cal", title: "Meeting booked", sub: "Thu 3 pm · both calendars", doing: "Booking", pos: [-1.12, 1.36, 1.4] },
  { icon: "chat", title: "Support chat closed", sub: "Order #2381 · tracking sent", doing: "Replying", pos: [0.95, 1.78, 1.0] },
  { icon: "doc", title: "Invoice sent", sub: "Oakfield Homes · reminder set", doing: "Sending", pos: [1.05, 1.36, 1.3] },
  { icon: "user", title: "New lead saved", sub: "Google Ads · call at 5 pm", doing: "Saving", pos: [-0.95, 0.98, 1.6] },
];
const BLINK = 1.5; // how far the upper lids slide down to close, in the avatar's units (cm)
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
    ctx.fillStyle = "#f2efe8"; ctx.font = `600 42px ${FONT}`; ctx.fillText(job.title, 158, h / 2 - 28);
    ctx.fillStyle = "#c8c5be"; ctx.font = `400 28px ${FONT}`; ctx.fillText(job.sub, 158, h / 2 + 30);
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
  const board = display(1.98, 1.114, drawBoard, { px: 1920, fps: 12, res: 1, brightness: 1 });
  board.group.position.set(0.15, 2.12, -0.215);
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
  const cup0 = bakedMug(); cup0.position.set(DX - 0.5, H, DZ - 0.18); cup0.rotation.y = 2.2; g.add(cup0);
  const cup = mug(); cup.position.set(DX - 0.5, H + 0.0035, DZ - 0.18); cup.rotation.y = 2.2; g.add(cup);
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
  sitter.add(man);
  g.add(tilt);
  // A soft neutral key from the camera side brings out the face and shirt texture.
  const faceKey = new THREE.SpotLight("#f2e5d7", 5, 4.2, 0.72, 0.82, 2);
  faceKey.position.set(0.2, 2.65, 2.45);
  faceKey.target.position.set(0.15, 1.55, 0.28);
  faceKey.castShadow = false;
  g.add(faceKey, faceKey.target);
  // sat in the chair (the sitter's space), elbows out, hands clasped behind his neck (see man.js)
  const body = prepareMan(man);
  tilt.userData.dynamic = true; // he breathes, so his mesh stays out of the static merge

  // a slow breath and a little drift of the head, rotating bones about his own axes
  const axisIn = (b, v) => { const q = new THREE.Quaternion(); b.parent.getWorldQuaternion(q); return v.clone().applyQuaternion(q.invert()).normalize(); };
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const moving = (body ? [[body.spine[0], X], [body.spine[1], X], [body.head, Y], [body.neck, X]] : []).map(([b, v]) =>
    b && { b, base: b.quaternion.clone(), axis: axisIn(b, v) });
  const qTmp = new THREE.Quaternion(), qTmp2 = new THREE.Quaternion();
  const turn = (m, a) => { if (m) m.b.quaternion.copy(m.base).premultiply(qTmp.setFromAxisAngle(m.axis, a)); };
  // eyes and lids turn about two axes: left-right (yaw) and up-down (pitch)
  const two = (b) => b && { b, base: b.quaternion.clone(), yaw: axisIn(b, Y), pitch: axisIn(b, X) };
  const turn2 = (m, yaw, pitch) => { if (m) m.b.quaternion.copy(m.base).premultiply(qTmp.setFromAxisAngle(m.yaw, yaw)).premultiply(qTmp2.setFromAxisAngle(m.pitch, pitch)); };
  const eyes = (body ? body.eyes : []).map(two);
  // the upper lids close by sliding down (this avatar's lid bones are moved, not turned)
  const lids = (body ? body.lids : []).map((b) => ({ b, base: b.position.clone(), down: axisIn(b, Y).negate() }));
  const gaze = { x: 0, y: 0 }; // where he is looking, easing towards the pointer
  let nextBlink = 2.5, blinkAt = -1;

  // glass cards around him, each fed by a line of light from the laptop
  g.updateMatrixWorld(true);
  const from = lap.top.clone().applyAxisAngle(Y, Math.PI + 0.12).add(lap.group.position);
  const viewer = new THREE.Vector3(2.35, 2.05, -1.65); // the automation camera stop, in room space
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
    update(t, dt, state) {
      board.screen.update(t);
      lap.screen.update(t);
      phoneScreen.update(t);
      const breath = Math.sin(t * 1.35);
      turn(moving[0], breath * 0.006); turn(moving[1], breath * 0.01);
      // he glances towards the pointer: the eyes lead, the head follows a little
      const k = Math.min(1, (dt || 0.016) * 2.2), p = state ? state.pointer : gaze;
      gaze.x += (p.x - gaze.x) * k; gaze.y += (p.y - gaze.y) * k;
      turn(moving[2], Math.sin(t * 0.21) * 0.035 + Math.sin(t * 0.57) * 0.01 + gaze.x * 0.2);
      turn(moving[3], Math.sin(t * 0.17 + 1) * 0.015 - gaze.y * 0.06);
      for (const e of eyes) turn2(e, gaze.x * 0.3, -gaze.y * 0.16);
      // a blink every few seconds: lids down in 70 ms, up in 110
      if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.4 + Math.random() * 3.6; }
      const b = t - blinkAt, shut = b < 0 || b > 0.18 ? 0 : b < 0.07 ? b / 0.07 : 1 - (b - 0.07) / 0.11;
      for (const l of lids) l.b.position.copy(l.base).addScaledVector(l.down, shut * BLINK);
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

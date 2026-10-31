import "./styles/main.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { initForm } from "./ui/form.js";
import { initDrawer } from "./ui/drawer.js";
import { initCursor } from "./ui/cursor.js";
import { initSound } from "./ui/sound.js";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduce = root.classList.contains("rm");
const still = new URLSearchParams(location.search).has("still"); // snap the camera (screenshots, slow devices)

/* ---------- What this device gets ---------- */
// The page (text, captions, scrolling) never waits for the 3D studio. A photo of the studio shows
// at once; the 3D world is a separate download that fades in over it when it is ready.
//   lite:   Data Saver, 2G, or ≤ 2 GB memory → photos only, nothing 3D is downloaded
//           (also, when the 3D is about to start: no WebGL, or WebGL drawn in software)
//   phones: the first screen is the photo; the 3D starts on the first scroll or tap, and until it
//           is ready the photos follow the stops (it also spares a cellular plan until they engage)
//   others: the 3D starts once the page has loaded and the browser is idle
const conn = navigator.connection || {};
const lite = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") || (navigator.deviceMemory || 8) <= 2;
/* Can this device draw the studio? Asked only when the 3D is about to start (creating a WebGL
   context is not free): no WebGL, or WebGL drawn in software, means photos instead. */
function canDraw3D() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
    if (!gl) return false;
    const e = gl.getExtension("WEBGL_debug_renderer_info");
    const name = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch { return false; }
}
const coarse = matchMedia("(pointer: coarse)").matches;
const phone = coarse && Math.min(innerWidth, innerHeight) < 700;
if (lite) root.classList.add("lite");

/* Photos of each stop (the instant first paint, and the whole tour on lite devices):
   AVIF, then WebP, with portrait crops for phones */
const POSTER_W = { land: [960, 1440, 1920], port: [480, 720, 840, 1080] };
function posterHTML(id) {
  const set = (o, ext) => POSTER_W[o].map((w) => `/posters/${id}-${o}-${w}.${ext} ${w}w`).join(", ");
  return `<picture class="poster" data-stop="${id}">` +
    `<source media="(max-aspect-ratio: 4/5)" type="image/avif" srcset="${set("port", "avif")}" sizes="100vw">` +
    `<source media="(max-aspect-ratio: 4/5)" type="image/webp" srcset="${set("port", "webp")}" sizes="100vw">` +
    `<source type="image/avif" srcset="${set("land", "avif")}" sizes="100vw">` +
    `<source type="image/webp" srcset="${set("land", "webp")}" sizes="100vw">` +
    `<img src="/posters/${id}-land-1440.webp" alt="" width="1920" height="1200" decoding="async"></picture>`;
}
const postersEl = document.querySelector(".posters");
function showPoster(id) {
  if (!postersEl) return;
  let p = postersEl.querySelector(`.poster[data-stop="${id}"]`);
  if (!p) { postersEl.insertAdjacentHTML("beforeend", posterHTML(id)); p = postersEl.lastElementChild; }
  postersEl.querySelectorAll(".poster").forEach((el) => el.classList.toggle("is-on", el === p));
}

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, touchMultiplier: 1.2 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function goTo(target) {
  if (lenis) lenis.scrollTo(target, { duration: 2 });
  else (typeof target === "number" ? window.scrollTo(0, target) : target.scrollIntoView());
}
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.querySelector(a.getAttribute("href"));
  if (!el) return;
  e.preventDefault();
  goTo(el);
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
});

const drawer = initDrawer({ lenis, goTo });
const cursor = initCursor(gsap);
const sound = initSound();

/* ---------- Progress pill while the 3D studio loads (never blocks the page) ---------- */
const loader = document.querySelector(".loader");
const countEl = loader.querySelector(".loader__count");
let loadProgress = 0, worldReady = false, shown = 0, loaderOn = false;
function loaderTick() {
  if (!loaderOn) return;
  const goal = Math.min(100, loadProgress * 90 + (worldReady ? 10 : 0));
  shown += (goal - shown) * 0.12;
  const n = Math.round(shown);
  countEl.textContent = `${n}%`;
  loader.style.setProperty("--p", n / 100);
  if (worldReady && n >= 99) { loaderOn = false; loader.classList.remove("is-on"); return; }
  requestAnimationFrame(loaderTick);
}

/* ---------- The studio (loaded on demand, in its own chunk) ---------- */
const canvas = document.querySelector(".world");
const tagsEl = document.querySelector(".tags");
const stops = [...document.querySelectorAll(".stop")];
const stopById = Object.fromEntries(stops.map((s) => [s.dataset.stop, s]));
let studio = null, started = false, progress = 0, current = "intro";

const TAGS = [["websites", "01", "Websites"], ["automation", "02", "Automation"], ["assistants", "03", "AI assistants"], ["ads", "04", "Ads"], ["contact", "→", "Contact"]];
const tags = TAGS.map(([id, n, label]) => {
  const el = document.createElement("button");
  el.type = "button"; el.className = "tag"; el.tabIndex = -1;
  el.innerHTML = `<b>${n}</b>${label}`;
  el.addEventListener("click", () => goTo(stopById[id]));
  el.addEventListener("pointerenter", () => { document.body.style.cursor = "pointer"; });
  tagsEl.appendChild(el);
  return { id, el };
});

function noWorld() { root.classList.add("no-webgl"); canvas.remove(); loaderOn = false; loader.classList.remove("is-on"); showPoster(current); }

async function startWorld() {
  if (started || lite) return;
  started = true;
  if (!canDraw3D()) return noWorld();
  loaderOn = true; loader.classList.add("is-on"); requestAnimationFrame(loaderTick);
  try {
    const { createStudio } = await import("./world/studio.js");
    studio = createStudio(canvas, {
      reduce, still,
      onProgress: (p) => (loadProgress = p),
      onTooSlow: () => {
        // the device could not keep up even on the lightest setting: switch to the photo tour
        gsap.ticker.remove(frame); gsap.ticker.remove(placeTags);
        studio.dispose(); studio = null;
        root.classList.remove("world-on");
        noWorld();
      },
      onReady: (ok) => {
        worldReady = true; loadProgress = 1;
        if (!ok) return noWorld();
        root.classList.add("world-on"); // the canvas fades in over the photo
      },
      onHover: (id) => {
        document.body.style.cursor = id ? "pointer" : "";
        tags.forEach((t) => t.el.classList.toggle("is-hover", t.id === id));
        cursor.station(id ? (id !== current ? "Go there" : id === "contact" ? "Write to us" : "Open") : null);
        if (id) sound.hover();
      },
      onSelect: (id) => {
        sound.select();
        if (id === current && drawer.has(id)) drawer.open(id);
        else if (id === current && id === "contact") goTo(document.getElementById("contact"));
        else if (stopById[id]) goTo(stopById[id]);
      },
    });
  } catch (err) {
    console.error(err);
    studio = null;
    return noWorld();
  }
  studio.setProgress(progress);
  studio.setActive(root.classList.contains("in-tour"));
  // The 3D frame runs on the same ticker as smooth scrolling, right after it, so the camera
  // and the page always move in the same frame (no second animation loop).
  gsap.ticker.add(frame);
  gsap.ticker.add(placeTags);
}
function frame(time, deltaTime) { studio && studio.tick(time, deltaTime / 1000); }
/* Floating tags, one per station, pinned to the 3D anchors */
function placeTags() {
  if (!studio || !root.classList.contains("in-tour") || !worldReady) return;
  for (const t of tags) {
    const p = studio.project(t.id);
    t.el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - 30).toFixed(1)}px) translate(-50%, -100%)`;
    t.el.classList.toggle("is-off", !p.visible || p.dist > 13);
    t.el.classList.toggle("is-here", t.id === current);
  }
}

if (lite) showPoster("intro");
else if (phone) {
  // phones: the visitor reads the first screen, the 3D starts as soon as they move
  const go = () => { ["scroll", "pointerdown", "keydown"].forEach((e) => removeEventListener(e, go)); startWorld(); };
  ["scroll", "pointerdown", "keydown"].forEach((e) => addEventListener(e, go, { passive: true, once: true }));
} else {
  const whenIdle = () => ("requestIdleCallback" in window ? requestIdleCallback(startWorld, { timeout: 1500 }) : setTimeout(startWorld, 300));
  if (document.readyState === "complete") whenIdle(); else addEventListener("load", whenIdle, { once: true });
}

/* Scroll drives the camera; each stop fades its caption in and updates the progress label */
const progN = document.querySelector(".progress__n"), progT = document.querySelector(".progress__t"), progBar = document.querySelector(".progress__bar");
ScrollTrigger.create({
  trigger: ".tour", start: "top top", end: "bottom bottom",
  onUpdate(self) {
    progress = self.progress;
    studio && studio.setProgress(progress);
    progBar.style.setProperty("--p", progress);
  },
});
ScrollTrigger.create({
  trigger: ".tour", start: "top top", end: "bottom 30%",
  onToggle(self) {
    root.classList.toggle("in-tour", self.isActive);
    studio && studio.setActive(self.isActive);
  },
});
stops.forEach((s, i) => {
  ScrollTrigger.create({
    trigger: s, start: "top 60%", end: "bottom 60%",
    onToggle(self) {
      s.classList.toggle("is-on", self.isActive);
      if (self.isActive) {
        current = s.dataset.stop;
        sound.at(current);
        progN.textContent = String(i).padStart(2, "0");
        progT.textContent = s.dataset.name;
        if (!root.classList.contains("world-on")) showPoster(current); // photos stand in until the 3D is ready
      }
    },
  });
});
if (window.scrollY < 10) { root.classList.add("in-tour"); stops[0].classList.add("is-on"); }

/* ---------- Real / Machine ---------- */
document.querySelectorAll(".mode__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const wire = btn.dataset.wire === "1";
    document.querySelectorAll(".mode__btn").forEach((b) => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
    startWorld();
    studio && studio.setWire(wire);
    if (!root.classList.contains("in-tour")) goTo(0);
  });
});

/* ---------- Plain section motion ---------- */
// One observer and a CSS transition (no per-element scroll triggers measuring the layout)
if (!reduce && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".block__head, .svc, .work__row, .steps li, .promises > div, .form").forEach((el) => { el.classList.add("rv"); io.observe(el); });
}

initForm();
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

if (import.meta.env.DEV) {
  root.classList.add("dev-placeholders");
  console.info("[scyne] Placeholder projects and social links are outlined. Replace them before launch.");
}

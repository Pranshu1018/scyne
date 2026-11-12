/* Extra interactions for the page after the tour (styles: the "Extras" part of sections.css).
   - About: the statement lights up word by word as it scrolls through the screen
   - Reel: the projects' screenshots, wiping from one to the next while the section is in view
   - Contact: a field of dots behind the form that parts around the pointer
   - Magnetic buttons: buttons lean towards the pointer when it is near
   - Easter egg: type "scyne" (or the Konami code) to flip the studio into its Machine view
   All of it is skipped with reduced motion; the content reads complete without it. */

export function initExtras({ gsap, ScrollTrigger, reduce }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- About: words light up with the scroll ---------- */
  const say = $(".about__say");
  if (say && !reduce) {
    const words = say.textContent.trim().split(/\s+/);
    say.setAttribute("aria-label", words.join(" "));
    say.replaceChildren(...words.flatMap((w, i) => {
      const s = document.createElement("span"); s.textContent = w; s.setAttribute("aria-hidden", "true");
      return i ? [" ", s] : [s];
    }));
    const spans = $$("span", say);
    say.classList.add("is-live");
    ScrollTrigger.create({
      trigger: say, start: "top 78%", end: "bottom 45%",
      onUpdate: (st) => { const lit = Math.round(st.progress * spans.length); spans.forEach((s, i) => s.classList.toggle("is-lit", i < lit)); },
    });
  }

  /* ---------- Reel: project screenshots, one wiping over the last ---------- */
  const reel = $(".reel");
  const shots = $$(".dcard").map((c) => ({ name: c.querySelector(".dcard__name")?.textContent.trim(), what: c.querySelector(".dcard__what")?.textContent.trim(), src: c.querySelector("img")?.getAttribute("src"), color: getComputedStyle(c).getPropertyValue("--c").trim() })).filter((s) => s.src);
  if (reel && shots.length > 1) {
    reel.hidden = false;
    const frame = $(".reel__frame", reel), name = $(".reel__name", reel), what = $(".reel__what", reel), count = $(".reel__count", reel), bar = $(".reel__bar i", reel);
    let i = -1, timer = 0, visible = false;
    const show = (k) => {
      i = (k + shots.length) % shots.length;
      const s = shots[i], img = new Image();
      img.src = s.src; img.alt = ""; img.className = "reel__img"; img.decoding = "async";
      frame.append(img);
      const old = $$(".reel__img", frame).slice(0, -1);
      old.forEach((o) => o.classList.add("is-out"));
      setTimeout(() => old.forEach((o) => o.remove()), 1300);
      name.textContent = s.name; what.textContent = s.what;
      count.textContent = `${String(i + 1).padStart(2, "0")} / ${String(shots.length).padStart(2, "0")}`;
      reel.style.setProperty("--rc", s.color || "#ff3d1f");
      bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
      clearTimeout(timer);
      if (visible && !reduce) timer = setTimeout(() => show(i + 1), 4200);
    };
    show(0);
    $(".reel__next", reel)?.addEventListener("click", () => show(i + 1));
    if (reduce) reel.classList.add("no-auto");
    else new IntersectionObserver(([e]) => { visible = e.isIntersecting; clearTimeout(timer); if (visible) timer = setTimeout(() => show(i + 1), 4200); }, { threshold: 0.35 }).observe(reel);
  }

  /* ---------- Contact: dots that part around the pointer ---------- */
  const field = $(".dots");
  if (field && fine && !reduce) {
    const ctx = field.getContext("2d"), host = field.parentElement;
    let w = 0, h = 0, pts = [], mx = -1e4, my = -1e4, on = false, raf = 0;
    const GAP = 34, R = 130;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = host.clientWidth; h = host.clientHeight;
      field.width = w * dpr; field.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) pts.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 });
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 2.2; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
        p.vx += (p.ox - p.x) * 0.06; p.vy += (p.oy - p.y) * 0.06; // spring home
        p.vx *= 0.82; p.vy *= 0.82; p.x += p.vx; p.y += p.vy;
        const moved = Math.min(1, Math.hypot(p.x - p.ox, p.y - p.oy) / 26);
        ctx.fillStyle = moved > 0.04 ? `rgba(255,${Math.round(61 + 120 * (1 - moved))},${Math.round(31 + 100 * (1 - moved))},${0.35 + 0.65 * moved})` : "rgba(236,232,223,.16)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + moved * 2.2, 0, 6.283); ctx.fill();
      }
      if (on) raf = requestAnimationFrame(draw);
    };
    size();
    addEventListener("resize", size);
    host.addEventListener("pointermove", (e) => { const r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener("pointerleave", () => { mx = my = -1e4; });
    new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) raf = requestAnimationFrame(draw); if (!on) cancelAnimationFrame(raf); }).observe(host);
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) {
    for (const el of $$(".btn, .contact__mail, .corridor__view, .reel__next")) {
      const to = gsap.quickTo ? { x: gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" }), y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" }) } : null;
      if (!to) break;
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); to.x((e.clientX - r.left - r.width / 2) * 0.28); to.y((e.clientY - r.top - r.height / 2) * 0.4); });
      el.addEventListener("pointerleave", () => { to.x(0); to.y(0); });
    }
  }

  /* ---------- Easter egg: type "scyne", or the Konami code ---------- */
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let typed = "", kon = 0;
  const toast = $(".egg");
  const flip = () => {
    const btn = $$(".mode__btn").find((b) => !b.classList.contains("is-on"));
    if (!btn) return;
    btn.click();
    if (toast) { toast.textContent = btn.dataset.wire === "1" ? "Machine view on. You found it." : "Back to the real world."; toast.classList.add("is-on"); setTimeout(() => toast.classList.remove("is-on"), 2600); }
  };
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    kon = e.key === KONAMI[kon] ? kon + 1 : e.key === KONAMI[0] ? 1 : 0;
    typed = (typed + (e.key.length === 1 ? e.key.toLowerCase() : "")).slice(-5);
    if (kon === KONAMI.length || typed === "scyne") { kon = 0; typed = ""; flip(); }
  });
}

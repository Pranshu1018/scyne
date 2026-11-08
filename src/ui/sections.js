/* Motion for the page after the 3D tour (styles: src/styles/sections.css).
   Every effect is an extra: without JavaScript, or with reduced motion, each section shows
   complete and still. While scrolling, only transforms, opacity and CSS variables change. */

export function initSections({ gsap, ScrollTrigger, lenis, reduce, drawer }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const touch = matchMedia("(hover: none)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Marquee: two bands, leaning with the speed of the scroll ---------- */
  const tracks = $$(".marquee__track");
  if (tracks.length && lenis && !reduce) {
    let want = 0, skew = 0;
    lenis.on("scroll", ({ velocity }) => { want = Math.max(-16, Math.min(16, velocity * 0.55)); });
    gsap.ticker.add(() => {
      skew += (want - skew) * 0.12; want *= 0.9;
      if (Math.abs(skew) > 0.01 || Math.abs(want) > 0.01) tracks.forEach((t, i) => t.style.setProperty("--skew", ((i ? 1 : -1) * skew).toFixed(2)));
    });
  }

  /* ---------- Titles rise letter by letter; mono labels decode ---------- */
  if (!reduce) {
    for (const title of $$(".block__title")) {
      const chars = splitLetters(title);
      gsap.from(chars, {
        yPercent: 115, rotate: 10, opacity: 0, duration: 1.15, ease: "expo.out", stagger: 0.022,
        scrollTrigger: { trigger: title, start: "top 86%" },
      });
    }
    // only the words decode: the red number in front of them stays as it is
    const labels = $$(".kicker").map((k) => {
      const t = [...k.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).pop();
      if (!t) return null;
      const span = document.createElement("span");
      span.textContent = t.textContent;
      t.replaceWith(span);
      return span;
    }).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); scramble(e.target); }
    }, { threshold: 1 });
    labels.forEach((l) => io.observe(l));
  }

  /* ---------- Services: hover (or tap) opens a row; a picture of it follows the pointer ---------- */
  const float = $(".svc-float"), panes = float ? $$(".svc-float__pane", float) : [];
  for (const row of $$(".svc")) {
    const id = row.id.replace("svc-", "");
    const open = () => {
      if (touch && !row.classList.contains("is-open")) { $$(".svc.is-open").forEach((r) => r.classList.remove("is-open")); row.classList.add("is-open"); return; }
      if (drawer && drawer.has(id)) drawer.open(id);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    if (float && finePointer && !reduce) {
      row.addEventListener("pointerenter", () => {
        float.classList.add("is-on");
        panes.forEach((p, i) => p.classList.toggle("is-on", i === +row.dataset.i));
      });
      row.addEventListener("pointerleave", () => float.classList.remove("is-on"));
    }
  }
  if (float && finePointer && !reduce) {
    let x = innerWidth / 2, y = innerHeight / 2, fx = x, fy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      if (!float.classList.contains("is-on") && Math.abs(fx - x) < 0.5) return;
      const dx = x - fx;
      fx += dx * 0.14; fy += (y - fy) * 0.14;
      float.style.transform = `translate(${(fx + 28).toFixed(1)}px, ${(fy - float.offsetHeight / 2).toFixed(1)}px)`;
      float.style.setProperty("--tilt", `${Math.max(-10, Math.min(10, dx * 0.08)).toFixed(2)}deg`); // leans into the motion
    });
  }

  /* ---------- Work: the fly-through ---------- */
  initDeck({ gsap, ScrollTrigger, lenis, reduce, $, $$ });

  /* ---------- Numbers count up when they come into view ---------- */
  const fmt = (el, v) => {
    const d = +(el.dataset.decimals || 0);
    el.textContent = v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    if (el.dataset.suffix) { const u = document.createElement("small"); u.textContent = el.dataset.suffix.trim(); el.append(u); }
  };
  const nums = $$(".stats [data-count]");
  nums.forEach((el) => fmt(el, +el.dataset.count)); // the real figure, whatever happens next
  if (!reduce && "IntersectionObserver" in window && nums.length) {
    nums.forEach((el) => fmt(el, 0));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target, o = { v: 0 };
        gsap.to(o, { v: +el.dataset.count, duration: 1.8, ease: "expo.out", onUpdate: () => fmt(el, o.v) });
      }
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---------- Process: steps light up as you pass them; the line fills ---------- */
  const process = $(".process"), line = $(".process__line");
  if (process && !reduce) {
    process.classList.add("process--live");
    for (const li of $$(".steps li", process)) {
      ScrollTrigger.create({ trigger: li, start: "top 62%", onEnter: () => li.classList.add("is-lit"), onLeaveBack: () => li.classList.remove("is-lit") });
    }
    if (line) {
      line.style.setProperty("--p", 0);
      ScrollTrigger.create({ trigger: ".steps", start: "top 62%", end: "bottom 62%", onUpdate: (s) => line.style.setProperty("--p", s.progress.toFixed(3)) });
    }
  }

  /* ---------- Quotes: one at a time, changing every 7 s while in view ---------- */
  const quotes = $$(".quote"), dots = $$(".quotes__dots button");
  if (quotes.length > 1) {
    let i = 0, timer = 0, visible = false;
    const show = (k) => {
      i = (k + quotes.length) % quotes.length;
      quotes.forEach((q, j) => q.classList.toggle("is-on", j === i));
      dots.forEach((d, j) => { d.classList.remove("is-on"); if (j === i) { void d.offsetWidth; d.classList.add("is-on"); } }); // restart the bar
      clearTimeout(timer);
      if (!reduce && visible) timer = setTimeout(() => show(i + 1), 7000);
    };
    dots.forEach((d, j) => d.addEventListener("click", () => show(j)));
    if (reduce) $(".quotes")?.classList.add("no-auto");
    else new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) show(i); else clearTimeout(timer); }, { threshold: 0.3 }).observe($(".quotes"));
  }

  /* ---------- Promises: a glow that follows the pointer ---------- */
  for (const card of $$(".promises > div")) {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  /* ---------- "Let's talk.": letters thicken near the pointer and jump on hover ---------- */
  const title = $(".contact__title");
  if (title && !reduce) {
    const words = title.textContent.trim().split(/\s+/);
    title.textContent = "";
    words.forEach((word, i) => {
      const w = document.createElement("span"); // a word never breaks between its letters
      w.className = "w"; w.setAttribute("aria-hidden", "true");
      for (const ch of word) {
        const c = document.createElement(ch === "." ? "em" : "span");
        c.className = "ch"; c.textContent = ch;
        w.append(c);
      }
      title.append(w);
      if (i < words.length - 1) title.append(" ");
    });
    const letters = $$(".ch", title);
    gsap.from(letters, { yPercent: 110, opacity: 0, rotate: 8, stagger: 0.04, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: title, start: "top 85%" } });
    if (finePointer) {
      // Geist is a variable font: each letter's weight eases towards 800 as the pointer comes near
      let px = -1e4, py = -1e4, live = false;
      const weights = letters.map(() => 400);
      letters.forEach((l) => l.style.setProperty("--wg", 400));
      title.closest("section").addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; live = true; });
      title.closest("section").addEventListener("pointerleave", () => { px = py = -1e4; });
      gsap.ticker.add(() => {
        if (!live) return;
        let moving = false;
        letters.forEach((l, i) => {
          const r = l.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
          const want = 400 + 500 * Math.exp(-(d * d) / (2 * 170 * 170));
          weights[i] += (want - weights[i]) * 0.15;
          if (Math.abs(want - weights[i]) > 0.5) moving = true;
          l.style.setProperty("--wg", weights[i].toFixed(0));
        });
        if (!moving && px < -1e3) live = false;
      });
    }
  }

  /* ---------- Footer: the name fills with red as you reach the bottom ---------- */
  const big = $(".footer__big");
  if (big && !reduce) {
    big.style.setProperty("--p", 0);
    ScrollTrigger.create({ trigger: ".footer", start: "top bottom", end: "bottom bottom", onUpdate: (s) => big.style.setProperty("--p", s.progress.toFixed(3)) });
  }
}

/* The projects corridor (src/ui/corridor.js, loaded only when it will run). Scrolling walks
   down a wireframe tunnel past the projects; the one beside you is the current one, named in
   the corner and marked in the index. Clicking a project peels it off the wall to face you,
   with its details beside it. Phones and reduced motion get the plain list of cards; there a
   card opens its case study directly. */
function initDeck({ gsap, ScrollTrigger, lenis, reduce, $, $$ }) {
  const section = $(".block--deck");
  if (!section) return;
  const deck = $(".deck", section), cards = $$(".dcard", section), n = cards.length;
  const view = initCaseView({ lenis, $ });
  const text = (card, sel) => card.querySelector(sel).textContent.trim();
  const colorOf = (card) => getComputedStyle(card).getPropertyValue("--c").trim();
  cards.forEach((card) => card.querySelector(".dcard__hit").addEventListener("click", () => view.open(card)));

  const mm = gsap.matchMedia();
  // "any" always matches: gsap only runs a callback when some condition does, and phones need it too
  mm.add({ any: "all", wide: "(min-width: 900px) and (min-height: 560px)", still: "(prefers-reduced-motion: reduce)" }, (ctx) => {
    if (!ctx.conditions.wide || ctx.conditions.still || reduce) return undefined;
    let corridor = null, st = null, alive = true, want = 0, at = 0, shown = -1, active = 0, opened = -1, inView = false;
    const hud = { count: $(".deck__count b", section), name: $(".deck__name", section), text: $(".deck__meta span", section) };
    const ticks = $$(".deck__ticks button", section);
    const pill = $(".corridor__pill", section), info = $(".corridor__info", section);
    section.classList.add("deck--live");

    const setActive = (i) => {
      if (i === shown) return;
      shown = active = i;
      const card = cards[i];
      hud.count.textContent = String(i + 1).padStart(2, "0");
      scramble(hud.name, text(card, ".dcard__name"));
      hud.text.textContent = `${text(card, ".dcard__what")} · ${text(card, ".dcard__year")}`;
      section.style.setProperty("--dc", colorOf(card));
      ticks.forEach((t, j) => t.classList.toggle("is-on", j === i));
    };
    const travelTo = (i) => {
      if (!st || !corridor) return;
      const y = st.start + corridor.progressFor(i) * (st.end - st.start);
      lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: "smooth" });
    };
    ticks.forEach((t) => t.addEventListener("click", () => travelTo(+t.dataset.i)));

    // the details beside an open project
    const fill = (i) => {
      const card = cards[i], story = [...card.querySelectorAll(".dcard__story dd")].map((d) => d.textContent);
      info.style.setProperty("--pc", colorOf(card));
      $(".corridor__k span", info).textContent = `${text(card, ".dcard__what")} · ${text(card, ".dcard__year")}`;
      $(".corridor__title", info).textContent = text(card, ".dcard__name");
      $(".corridor__for", info).textContent = card.dataset.for || "";
      $(".corridor__p", info).textContent = story[1] || "";
      const stamp = card.querySelector(".case__stamp");
      const rows = [["Services", text(card, ".dcard__what")], ["Result", `${stamp.firstChild.textContent.trim()} ${stamp.querySelector("small").textContent}`], ["Year", text(card, ".dcard__year")]];
      $(".corridor__spec", info).replaceChildren(...rows.map(([k, v]) => { const d = document.createElement("div"); d.innerHTML = "<dt></dt><dd></dd>"; d.firstChild.textContent = k; d.lastChild.textContent = v; return d; }));
      $(".corridor__next span", info).textContent = text(cards[(i + 1) % n], ".dcard__name");
    };
    const openProject = (i) => {
      if (!corridor) return;
      opened = i;
      fill(i);
      corridor.open(i);
      deck.classList.add("is-open");
      info.hidden = false;
      requestAnimationFrame(() => info.classList.add("is-on"));
      pill.classList.remove("is-on");
      lenis && lenis.stop();
      $(".corridor__x", info).focus({ preventScroll: true });
    };
    const closeProject = () => {
      if (opened < 0) return;
      opened = -1;
      corridor.close();
      deck.classList.remove("is-open");
      info.classList.remove("is-on");
      setTimeout(() => { if (opened < 0) info.hidden = true; }, 500);
      lenis && lenis.start();
    };
    $(".corridor__x", info).addEventListener("click", closeProject);
    $(".corridor__view", info).addEventListener("click", () => { const i = opened; closeProject(); view.open(cards[i]); });
    $(".corridor__next", info).addEventListener("click", () => {
      const next = (opened + 1) % n;
      closeProject();
      travelTo(next);
      setTimeout(() => { if (alive) openProject(next); }, 1700);
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && opened >= 0) closeProject(); });

    // the pill that names the project under the pointer
    let px = 0, py = 0;
    deck.addEventListener("pointermove", (e) => {
      const r = deck.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      pill.style.transform = `translate(${px + 16}px, ${py + 14}px)`;
    });
    const onHover = (i, on) => {
      if (opened >= 0) return;
      pill.style.setProperty("--pc", colorOf(cards[i]));
      $("span", pill).textContent = `Open ${text(cards[i], ".dcard__name")}`;
      pill.classList.toggle("is-on", on);
    };

    st = ScrollTrigger.create({
      trigger: section, start: "top top", end: () => `+=${innerHeight * 0.9 * n}`,
      pin: deck, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (s) => { want = s.progress; },
    });
    // render while the corridor is on screen (a little before and after the pinned stretch too)
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: "20% 0px" });
    io.observe(deck);

    import("./corridor.js").then(({ createCorridor }) => {
      if (!alive) return;
      corridor = createCorridor({ host: $(".corridor", section), cards, onHover, onOpen: (i) => (i === active ? openProject(i) : travelTo(i)) });
      setActive(corridor.render(at, 0.016));
    }).catch((err) => { console.error("[scyne] corridor failed", err); section.classList.remove("deck--live"); });

    let last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!corridor || !inView) return;
      at += (want - at) * Math.min(1, dt * 5);
      setActive(corridor.render(at, dt));
    };
    gsap.ticker.add(tick);
    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      io.disconnect();
      closeProject();
      corridor && corridor.dispose();
      section.classList.remove("deck--live");
      st = null;
    };
  });
}

/* The case study overlay: the card's picture, title and story, rising in */
function initCaseView({ lenis, $ }) {
  const el = $(".caseview");
  if (!el) return { open() {} };
  document.body.append(el); // out of the page's stacking layer, so it covers the nav too
  const k = $(".caseview__k", el), title = $(".caseview__title", el), art = $(".caseview__art", el), story = $(".caseview__story", el), close = $(".caseview__close", el), cta = $(".caseview__cta", el);
  [k, title, art, story, cta].forEach((x) => x.classList.add("rise"));
  let last = null;
  const shut = () => {
    el.classList.remove("is-open");
    lenis && lenis.start();
    setTimeout(() => { el.hidden = true; }, 450);
    last && last.focus({ preventScroll: true });
  };
  close.addEventListener("click", shut);
  cta.addEventListener("click", shut);
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); });
  return {
    open(card) {
      last = card.querySelector(".dcard__hit");
      el.style.setProperty("--c", getComputedStyle(card).getPropertyValue("--c"));
      k.textContent = `${card.querySelector(".dcard__what").textContent} · ${card.querySelector(".dcard__year").textContent}`;
      title.textContent = card.querySelector(".dcard__name").textContent;
      art.replaceChildren(card.querySelector(".case__art").cloneNode(true));
      story.replaceChildren(...card.querySelector(".dcard__story").cloneNode(true).childNodes);
      el.hidden = false;
      el.scrollTop = 0;
      lenis && lenis.stop();
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
      close.focus({ preventScroll: true });
    },
  };
}

/* Split a heading into words and letters (keeping inline elements such as <em> around their
   letters) and return the letters. Screen readers keep reading the original text. */
function splitLetters(el) {
  const label = el.textContent.replace(/\s+/g, " ").trim();
  const out = [];
  const walk = (node, into) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { into.append(" "); continue; }
          const w = document.createElement("span"); w.className = "w";
          for (const ch of part) { const c = document.createElement("span"); c.className = "c"; c.textContent = ch; w.append(c); out.push(c); }
          into.append(w);
        }
      } else if (child.nodeType === 1) {
        const copy = child.cloneNode(false);
        walk(child, copy);
        into.append(copy);
      }
    }
  };
  const frag = document.createDocumentFragment();
  walk(el, frag);
  el.replaceChildren(frag);
  el.classList.add("split");
  el.setAttribute("aria-label", label);
  for (const w of el.querySelectorAll(".w")) w.setAttribute("aria-hidden", "true");
  return out;
}

/* Swap an element's text in through random glyphs, settling left to right */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*/<>0123456789";
function scramble(el, to = el.textContent) {
  if (el._scr) cancelAnimationFrame(el._scr);
  const from = el.textContent, len = Math.max(from.length, to.length), t0 = performance.now(), dur = 520 + len * 12;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    let s = "";
    for (let i = 0; i < len; i++) {
      const settle = i / len;
      if (i >= to.length) s += k > settle * 0.8 ? "" : from[i] ?? ""; // a longer old text falls away
      else if (k >= settle + 0.25 || k === 1) s += to[i];
      else if (k > settle * 0.6) s += to[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else s += from[i] ?? "";
    }
    el.textContent = s;
    if (k < 1) el._scr = requestAnimationFrame(step);
  };
  el._scr = requestAnimationFrame(step);
}

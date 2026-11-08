/* Detail drawer: opens from a station (click it, or "Open details" in its caption).
   Content comes from the readable section below the tour, plus where we start. */

const START = {
  websites: "Your current site, and the one action you want every visitor to take.",
  automation: "One process your team repeats every day, mapped from first step to last.",
  assistants: "The questions your customers ask most, and where the answers live today.",
  ads: "What a new customer is worth to you, so we know what we can spend to win one.",
};
const NEED = { websites: "Website", automation: "Automation", assistants: "AI assistant", ads: "Ads" };

export function initDrawer({ lenis, goTo }) {
  const drawer = document.getElementById("drawer");
  const shade = document.querySelector(".drawer-shade");
  const body = drawer.querySelector(".drawer__body");
  const closeBtn = drawer.querySelector(".drawer__close");
  let lastFocus = null, openId = null;

  function fill(id) {
    const src = document.getElementById(`svc-${id}`);
    if (!src) return false;
    const n = src.querySelector(".svc__n").textContent;
    const title = src.querySelector("h3").textContent;
    const lead = src.querySelector("p").textContent;
    const items = [...src.querySelectorAll("li")].map((li) => `<li>${li.textContent}</li>`).join("");
    body.innerHTML = `
      <p class="drawer__k">${n} · In the studio</p>
      <h2 class="drawer__title" id="drawer-title">${title}</h2>
      <p class="drawer__lead">${lead}</p>
      <ul class="drawer__list">${items}</ul>
      <div class="drawer__note"><b>Where we start</b><p>${START[id]}</p></div>
      <div class="drawer__cta">
        <a class="btn btn--red" href="#contact" data-need="${NEED[id]}">Start a ${title.toLowerCase()} project</a>
        <button type="button" class="btn btn--ghost" data-close>Keep exploring</button>
      </div>`;
    return true;
  }

  function open(id) {
    if (!fill(id)) return;
    openId = id;
    lastFocus = document.activeElement;
    drawer.hidden = false; shade.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add("is-open"); shade.classList.add("is-open"); });
    lenis && lenis.stop();
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    if (!openId) return;
    openId = null;
    drawer.classList.remove("is-open"); shade.classList.remove("is-open");
    lenis && lenis.start();
    setTimeout(() => { if (!openId) { drawer.hidden = true; shade.hidden = true; } }, 700);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }

  closeBtn.addEventListener("click", close);
  shade.addEventListener("click", close);
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) close();
    const cta = e.target.closest("[data-need]");
    if (cta) {
      e.preventDefault();
      e.stopPropagation();
      const box = document.querySelector(`.picks input[value="${cta.dataset.need}"]`);
      if (box) box.checked = true;
      close();
      setTimeout(() => goTo(document.getElementById("contact")), 250);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!openId) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { // keep focus inside the drawer
      const f = [...drawer.querySelectorAll("a, button")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // "Open details" buttons in each station caption
  Object.keys(START).forEach((id) => {
    const cap = document.querySelector(`#stop-${id} .cap`);
    const more = cap && cap.querySelector(".cap__more");
    if (!more) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "cap__open";
    btn.innerHTML = `<i aria-hidden="true">+</i>Open details`;
    btn.addEventListener("click", () => open(id));
    more.before(btn);
  });

  return { open, close, has: (id) => id in START, isOpen: () => !!openId };
}

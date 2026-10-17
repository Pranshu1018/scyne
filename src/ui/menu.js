// Scyne Full-screen Menu Controller

export function initMenu(lenis) {
  const menuBtn = document.querySelector("#menu-toggle");
  const menuOverlay = document.querySelector("#menu-overlay");
  const menuClose = document.querySelector("#menu-close");
  const menuLinks = document.querySelectorAll(".menu-nav-link");

  if (!menuBtn || !menuOverlay) return;

  let isOpen = false;

  const toggle = (force) => {
    isOpen = typeof force === "boolean" ? force : !isOpen;
    menuOverlay.classList.toggle("is-open", isOpen);
    menuBtn.setAttribute("aria-expanded", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (lenis) {
      if (isOpen) lenis.stop();
      else lenis.start();
    }
  };

  menuBtn.addEventListener("click", () => toggle());
  if (menuClose) menuClose.addEventListener("click", () => toggle(false));

  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        e.preventDefault();
        toggle(false);
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          if (lenis) {
            lenis.scrollTo(targetEl, { offset: -60, duration: 1.2 });
          } else {
            targetEl.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggle(false);
    }
  });
}

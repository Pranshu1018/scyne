/* A small ring that follows the pointer. Over links it grows; over a station in the room
   it becomes a red disc saying what a click will do. Fine pointers only. */

export function initCursor(gsap) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return { station() {} };
  const el = document.querySelector(".cursor");
  const label = el.querySelector(".cursor__label");
  document.documentElement.classList.add("has-cursor");
  const xTo = gsap.quickTo(el, "x", { duration: 0.3, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.3, ease: "power3" });
  let overStation = false;

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    el.classList.add("is-on");
    xTo(e.clientX); yTo(e.clientY);
    const link = e.target.closest("a, button, label, summary");
    el.classList.toggle("is-link", !!link && !overStation);
    el.classList.toggle("is-on", !e.target.closest("input, textarea"));
  });
  document.documentElement.addEventListener("pointerleave", () => el.classList.remove("is-on"));

  return {
    station(text) {
      overStation = !!text;
      el.classList.toggle("is-station", overStation);
      if (text) { label.textContent = text; el.classList.remove("is-link"); }
    },
  };
}

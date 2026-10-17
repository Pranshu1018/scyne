// Scyne Custom Interactive Cursor with Magnetic Snap and Mode Badges

export class CustomCursor {
  constructor() {
    this.cursor = document.querySelector(".custom-cursor");
    this.dot = document.querySelector(".custom-cursor-dot");
    this.badge = document.querySelector(".custom-cursor-badge");
    if (!this.cursor) return;

    this.pos = { x: -100, y: -100 };
    this.target = { x: -100, y: -100 };
    this.isHovered = false;

    this.init();
  }

  init() {
    window.addEventListener("pointermove", (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
    }, { passive: true });

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        const text = el.getAttribute("data-cursor");
        if (text) {
          this.badge.textContent = text;
          this.cursor.classList.add("has-badge");
        } else {
          this.cursor.classList.add("hovered");
        }
      });
      el.addEventListener("mouseleave", () => {
        this.cursor.classList.remove("has-badge");
        this.cursor.classList.remove("hovered");
        this.badge.textContent = "";
      });
    });

    const update = () => {
      const dt = 0.18;
      this.pos.x += (this.target.x - this.pos.x) * dt;
      this.pos.y += (this.target.y - this.pos.y) * dt;

      this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}

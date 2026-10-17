import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SculptureScene } from "./gl/sculpture.js";
import { CaseRingScene } from "./gl/caseRing.js";
import { CustomCursor } from "./ui/cursor.js";
import { initMenu } from "./ui/menu.js";

gsap.registerPlugin(ScrollTrigger);

// --------------------------------------------------
// 1. Lenis Smooth Scroll
// --------------------------------------------------
const lenis = new Lenis({
  lerp: 0.08,
  wheelMultiplier: 0.95,
  smoothWheel: true,
  touchMultiplier: 1.5
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// --------------------------------------------------
// 2. Preloader
// --------------------------------------------------
window.addEventListener("load", () => {
  setTimeout(() => {
    const preloader = document.querySelector("#preloader");
    if (preloader) {
      preloader.classList.add("loaded");
    }
  }, 400);
});

// --------------------------------------------------
// 3. Custom Cursor & Menu
// --------------------------------------------------
new CustomCursor();
initMenu(lenis);

// --------------------------------------------------
// 4. 3D Raymarched Metal Sculpture (Hero & Studio)
// --------------------------------------------------
const sculptureCanvas = document.querySelector("#sculpture-canvas");
const sculptureContainer = document.querySelector("#sculpture-container");
let sculpture = null;

if (sculptureCanvas) {
  sculpture = new SculptureScene(sculptureCanvas, {
    svgUrl: "/images/YwaEu83bwCHpgz1o29HBxX43MNc.svg",
    metal: "#10131a",
    light: "#c8d2e2",
    accent: "#fc201f",
    specular: "#ffffff",
    shine: 1.6,
    depth: 0.26,
    bevel: 0.012,
    size: 1.55, // Larger 3D sculpture filling hero viewport
    speed: 0.85,
    horizontalPosition: window.innerWidth > 900 ? 73 : 50,
    dragEnabled: true
  });

  // Track scroll rotation through Hero -> Studio -> Vision -> Approach
  ScrollTrigger.create({
    trigger: "#intro",
    start: "top top",
    endTrigger: "#approach",
    end: "bottom center",
    scrub: 1.2,
    onUpdate: (self) => {
      sculpture.setProgress(self.progress);
    }
  });

  // Fade out sculpture after Approach section so works & services have clean contrast
  ScrollTrigger.create({
    trigger: "#work",
    start: "top 80%",
    end: "top 20%",
    scrub: true,
    onUpdate: (self) => {
      sculptureContainer.style.opacity = (1 - self.progress).toString();
      sculptureContainer.style.pointerEvents = self.progress > 0.5 ? "none" : "auto";
    }
  });
}

// --------------------------------------------------
// 5. Section 04: Horizontal Pinned Works Slider
// --------------------------------------------------
const worksSection = document.querySelector(".works-pinned-section");
const worksSidebar = document.querySelector(".works-pinned-sidebar");
const worksTrack = document.querySelector(".works-slider-track");
const currIdxEl = document.querySelector(".curr-idx");
const progressFill = document.querySelector(".works-progress-fill");

if (worksSection && worksTrack && window.innerWidth > 1024) {
  const getScrollDistance = () => {
    const sidebarWidth = worksSidebar ? worksSidebar.offsetWidth : 440;
    return Math.max(0, worksTrack.scrollWidth - (window.innerWidth - sidebarWidth - 120));
  };

  const tween = gsap.to(worksTrack, {
    x: () => -getScrollDistance(),
    ease: "none"
  });

  ScrollTrigger.create({
    trigger: worksSection,
    start: "top top",
    end: () => `+=${getScrollDistance() + 500}`,
    pin: true,
    animation: tween,
    scrub: 0.8,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      // 4 primary projects: 01 to 04
      const idx = Math.min(4, Math.max(1, Math.floor(self.progress * 3.99) + 1));
      if (currIdxEl) currIdxEl.textContent = `0${idx}`;
      if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(15, self.progress * 100))}%`;
    }
  });
}

// --------------------------------------------------
// 6. Section 07: 3D WebGL Case Ring (Cinematic Scale)
// --------------------------------------------------
const ringCanvas = document.querySelector("#ring-canvas");
if (ringCanvas) {
  new CaseRingScene(ringCanvas, {
    items: [
      { image: "/images/7hQXtXjg3yy0QIhemR4kqWrrym8.png", title: "Forma" },
      { image: "/images/D1CBoYc3kNJHhe3eu88zsNWxxk.png", title: "Nacre" },
      { image: "/images/sj95tWRAXBuppq5to5qxG4SH2w.png", title: "Arc Finance" },
      { image: "/images/ws4amg82ncHwc5izuYrR6m7k3c.png", title: "Aether" },
      { image: "/images/Y8CuMjp97ZIPwsYO7FCiwfWCuw.png", title: "Noct" },
      { image: "/images/2qCpz8LhSsfuwNGPFUJWJDsT8A.png", title: "Sora Living" }
    ],
    radius: 4.4,
    cardArc: 0.96,
    tilt: -13.0,
    scale: 1.18,
    vertical: -0.17,
    initialAngle: 0.0,
    darkness: 0.82,
    speed: 0.18
  });
}

// --------------------------------------------------
// 7. Services Accordion
// --------------------------------------------------
const serviceItems = document.querySelectorAll(".service-item");
serviceItems.forEach((item) => {
  const summary = item.querySelector(".service-summary");
  if (summary) {
    summary.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      serviceItems.forEach((other) => other.classList.remove("open"));
      if (!wasOpen) {
        item.classList.add("open");
      }
    });
  }
});

// --------------------------------------------------
// 8. Smooth Internal Link Scrolling with Lenis
// --------------------------------------------------
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const targetId = anchor.getAttribute("href");
    if (targetId && targetId !== "#") {
      e.preventDefault();
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        lenis.scrollTo(targetEl, { offset: -40, duration: 1.4 });
      }
    }
  });
});

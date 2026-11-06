"use strict";
document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const menu = document.getElementById("menu");
const mobileMenu = window.matchMedia("(max-width: 780px)");
const menuBackdrop = document.querySelector(".menu-backdrop");
function setMenu(open) {
  open = open && mobileMenu.matches;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
  menu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  menu.inert = mobileMenu.matches && !open;
  document.querySelectorAll("main, footer, .skip").forEach(element => { element.inert = open; });
}
setMenu(false);
mobileMenu.addEventListener("change", () => setMenu(false));
menuBackdrop.addEventListener("click", () => { setMenu(false); menuButton.focus(); });
menuButton.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.closest("header").addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || !mobileMenu.matches) return;
  setMenu(false);
  if (link.hash) {
    const target = document.querySelector(link.hash);
    if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }
});
document.addEventListener("keydown", event => {
  if (event.key !== "Tab" || !menu.classList.contains("open")) return;
  const links = Array.from(document.querySelectorAll("header a, .menu-toggle"));
  const first = links[0], last = links[links.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const aiButton = document.querySelector(".ai");
const aiInfo = document.getElementById("ai-info");
function setInfo(open) {
  aiButton.setAttribute("aria-expanded", String(open));
  aiInfo.hidden = !open;
}
aiButton.addEventListener("click", () => setInfo(aiInfo.hidden));
document.addEventListener("click", event => {
  if (!event.target.closest(".ai, .tooltip")) setInfo(false);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (menu.classList.contains("open")) {
    setMenu(false);
    menuButton.focus();
  }
  if (!aiInfo.hidden) {
    setInfo(false);
    aiButton.focus();
  }
});

for (const carousel of document.querySelectorAll("[data-carousel]")) {
  const slides = Array.from(carousel.querySelectorAll("[data-slide]"));
  let index = 0;
  let changing = false;
  const position = carousel.querySelector("[data-position]");
  // Fetch the neighbouring photos ahead of time so the change is instant.
  function warmNeighbours() {
    for (const step of [1, -1]) {
      const slide = slides[(index + step + slides.length) % slides.length];
      if (slide instanceof HTMLImageElement && slide.loading !== "eager") {
        slide.loading = "eager";
        slide.decode().catch(() => {});
      }
    }
  }
  async function advance(step) {
    if (changing) return;
    changing = true;
    const previous = slides[index];
    const nextIndex = (index + step + slides.length) % slides.length;
    const next = slides[nextIndex];
    if (next instanceof HTMLImageElement) {
      next.loading = "eager";
      await next.decode().catch(() => {});
    }
    const oldHeight = surface.getBoundingClientRect().height;
    previous.classList.add("slide-leaving");
    previous.setAttribute("aria-hidden", "true");
    previous.inert = true;
    next.hidden = false;
    index = nextIndex;
    if (position) {
      position.textContent = String(index + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
    }
    warmNeighbours();
    const newHeight = surface.getBoundingClientRect().height;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timing = { duration: 420, easing: "cubic-bezier(.25,.7,.3,1)" };
      const animations = [
        previous.animate([{ opacity: 1 }, { opacity: 0 }], timing),
        next.animate([{ opacity: 0 }, { opacity: 1 }], timing),
        surface.animate([{ height: oldHeight + "px" }, { height: newHeight + "px" }], timing)
      ];
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    }
    previous.hidden = true;
    previous.classList.remove("slide-leaving");
    previous.removeAttribute("aria-hidden");
    previous.inert = false;
    changing = false;
  }
  carousel.querySelector(".controls").addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (button) advance(Number(button.dataset.step));
  });
  const surface = carousel.querySelector("[aria-live]");
  if ("IntersectionObserver" in window) {
    const nearby = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      nearby.disconnect();
      warmNeighbours();
    }, { rootMargin: "400px" });
    nearby.observe(carousel);
  }
  let start;
  surface.addEventListener("touchstart", event => { start = event.touches[0]; }, {passive:true});
  surface.addEventListener("touchend", event => {
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.clientX;
    const dy = event.changedTouches[0].clientY - start.clientY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) advance(dx < 0 ? 1 : -1);
    start = null;
  }, {passive:true});
}

const track = document.querySelector(".project-track");
let requestedPosition = null;
track.addEventListener("scrollend", () => { requestedPosition = null; });
track.addEventListener("touchstart", () => { requestedPosition = null; }, { passive: true });
track.addEventListener("wheel", () => { requestedPosition = null; }, { passive: true });
document.querySelector(".other .controls").addEventListener("click", event => {
  const button = event.target.closest("[data-step]");
  if (!button) return;
  const left = track.getBoundingClientRect().left;
  const maxScroll = track.scrollWidth - track.clientWidth;
  const positions = [...new Set(Array.from(track.children, card =>
    Math.min(maxScroll, Math.max(0, Math.round(card.getBoundingClientRect().left - left + track.scrollLeft)))
  ))];
  const current = requestedPosition ?? track.scrollLeft;
  const nearest = positions.reduce((best, position, index) =>
    Math.abs(position - current) < Math.abs(positions[best] - current) ? index : best, 0);
  const nextIndex = (nearest + Number(button.dataset.step) + positions.length) % positions.length;
  requestedPosition = positions[nextIndex];
  track.scrollTo({
    left: requestedPosition,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
  });
});

// Play each entrance once. Without animation support, the page stays visible.
if ("IntersectionObserver" in window) {
  const revealTargets = [
    ".wrap > h2", ".scenes + .center",
    ".team-grid > *", ".review-head", ".review-card", ".case-head",
    ".flat-gallery", ".story > *", ".case-foot", ".other > h3", ".project-track",
    ".scope-head", ".keys", "section:not(#proces) .rows > li", ".samples",
    ".budget-grid > *", ".faq-grid > .stack", ".closing", ".footer-grid"
  ];
  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entrances.unobserve(entry.target);
        entry.target.classList.add("reveal-in");
      }
    }
  });
  for (const element of document.querySelectorAll(revealTargets.join(", "))) {
    entrances.observe(element);
  }

  // Staged entrances wait until a good part of the element is on screen.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function countUp(element) {
    const target = Number(element.dataset.count);
    const duration = Math.min(1800, 900 + target / 4);
    const started = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - started) / duration);
      element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) requestAnimationFrame(frame);
    }
    element.textContent = "0";
    requestAnimationFrame(frame);
  }
  const stages = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      stages.unobserve(entry.target);
      entry.target.classList.add("is-in");
      if (!reducedMotion.matches) entry.target.querySelectorAll("[data-count]").forEach(countUp);
    }
  }, { threshold: .3 });
  document.documentElement.classList.add("motion");
  for (const element of document.querySelectorAll(".scene, .facts")) {
    stages.observe(element);
  }
}

// The process line fills up to a reading line a little below the middle of the screen.
const steps = Array.from(document.querySelectorAll("#proces .rows > li"));
let stepsUpdatePending = false;
function updateSteps() {
  const readingLine = document.documentElement.clientHeight * .65;
  const tops = steps.map(step => step.getBoundingClientRect().top);
  steps.forEach((step, index) => {
    step.classList.toggle("is-active", tops[index] <= readingLine);
    if (index + 1 < steps.length) {
      const fill = (readingLine - tops[index]) / (tops[index + 1] - tops[index]);
      step.style.setProperty("--fill", Math.min(1, Math.max(0, fill)).toFixed(3));
    }
  });
  stepsUpdatePending = false;
}
function requestStepsUpdate() {
  if (stepsUpdatePending) return;
  stepsUpdatePending = true;
  requestAnimationFrame(updateSteps);
}
window.addEventListener("scroll", requestStepsUpdate, { passive: true });
window.addEventListener("resize", requestStepsUpdate);
updateSteps();

// Photos drift slightly inside their frames as the page scrolls.
const driftingPhotos = Array.from(document.querySelectorAll(
  ".hero-photo .cover, .team-photo img, .keys img, .samples img, .project-track figure img, .plan"
));
let driftUpdatePending = false;
function updateDrift() {
  const screenHeight = document.documentElement.clientHeight;
  for (const photo of driftingPhotos) {
    const frame = photo.parentElement.getBoundingClientRect();
    if (frame.bottom < 0 || frame.top > screenHeight) continue;
    const offset = (frame.top + frame.height / 2 - screenHeight / 2) / screenHeight;
    photo.style.setProperty("--drift", Math.max(-1, Math.min(1, -offset)).toFixed(3));
  }
  driftUpdatePending = false;
}
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("scroll", () => {
    if (driftUpdatePending) return;
    driftUpdatePending = true;
    requestAnimationFrame(updateDrift);
  }, { passive: true });
  window.addEventListener("resize", updateDrift);
  updateDrift();
}

// Separate thresholds prevent flicker while the header changes height.
const pageHeader = document.querySelector("header");
let headerUpdatePending = false;
function updateHeader() {
  if (window.scrollY > 96) pageHeader.classList.add("is-scrolled");
  if (window.scrollY < 24) pageHeader.classList.remove("is-scrolled");
  headerUpdatePending = false;
}
window.addEventListener("scroll", () => {
  if (headerUpdatePending) return;
  headerUpdatePending = true;
  requestAnimationFrame(updateHeader);
}, { passive: true });
window.addEventListener("pageshow", updateHeader);
updateHeader();

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TEXT_SELECTORS = [
  "main h1",
  "main section[id] h2",
  "main section[id] .grid.items-start > p",
  "main section article h3",
  "main section article p.text-sm",
];

let scrollCtx: gsap.Context | null = null;

function resetScrollSplitElements() {
  document.querySelectorAll<HTMLElement>("[data-scroll-split='true']").forEach((element) => {
    const words = element.querySelectorAll<HTMLElement>(".scroll-word");

    if (words.length > 0) {
      element.textContent = Array.from(words)
        .map((word) => word.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    }

    delete element.dataset.scrollSplit;
  });
}

function splitTextIntoWords(element: HTMLElement): HTMLElement[] {
  if (element.dataset.scrollSplit === "true") {
    return Array.from(element.querySelectorAll<HTMLElement>(".scroll-word"));
  }

  const text = element.textContent?.trim();
  if (!text) return [];

  const words = text.split(/\s+/);
  element.textContent = "";

  const wordElements: HTMLElement[] = [];

  words.forEach((word, index) => {
    const wrapper = document.createElement("span");
    wrapper.className = "scroll-word-wrap inline-block overflow-hidden align-top";

    const inner = document.createElement("span");
    inner.className = "scroll-word inline-block";
    inner.textContent = word;

    wrapper.appendChild(inner);
    element.appendChild(wrapper);
    wordElements.push(inner);

    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(" "));
    }
  });

  element.dataset.scrollSplit = "true";
  return wordElements;
}

function getScrollTriggerBounds(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  const trigger =
    element.closest("article") ||
    element.closest("section") ||
    element.parentElement ||
    element;

  if (tag === "h1") {
    return { trigger, start: "top bottom", end: "top 62%", scrub: 0.9 };
  }

  if (tag === "h2" || tag === "h3") {
    return { trigger, start: "top bottom", end: "top 58%", scrub: 0.85 };
  }

  return { trigger, start: "top bottom", end: "top 55%", scrub: 0.95 };
}

function initStickyTextScroll() {
  const elements = gsap.utils.toArray<HTMLElement>(TEXT_SELECTORS.join(","));

  elements.forEach((element) => {
    const words = splitTextIntoWords(element);
    if (!words.length) return;

    const tag = element.tagName.toLowerCase();
    const isHeading = tag === "h1" || tag === "h2" || tag === "h3";
    const { trigger, start, end, scrub } = getScrollTriggerBounds(element);

    gsap.fromTo(
      words,
      {
        yPercent: isHeading ? 115 : 0,
        y: isHeading ? 0 : 28,
        opacity: 0,
        filter: isHeading ? "blur(0px)" : "blur(10px)",
      },
      {
        yPercent: 0,
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        ease: "none",
        stagger: isHeading ? 0.06 : 0.04,
        scrollTrigger: {
          trigger,
          start,
          end,
          scrub,
        },
      },
    );
  });
}

export function initScrollAnimations() {
  if (prefersReducedMotion()) return;

  scrollCtx?.revert();
  resetScrollSplitElements();

  scrollCtx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>("footer a, footer span").forEach((element) => {
      gsap.set(element, { clearProps: "opacity,transform,filter" });
    });

    initStickyTextScroll();

    gsap.utils.toArray<HTMLElement>("main section article").forEach((article) => {
      const media = article.querySelector<HTMLElement>("[data-portfolio-media]");

      if (media) {
        gsap.fromTo(
          media,
          { y: 80, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            ease: "none",
            scrollTrigger: {
              trigger: media,
              start: "top bottom",
              end: "top 55%",
              scrub: 0.8,
            },
          },
        );
        return;
      }

      const image = article.querySelector(":scope img");

      if (image) {
        gsap.fromTo(
          image,
          { y: 80, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            ease: "none",
            scrollTrigger: {
              trigger: image,
              start: "top bottom",
              end: "top 55%",
              scrub: 0.8,
            },
          },
        );
      }
    });

    ScrollTrigger.refresh();
  });
}

export function initPageAnimations() {
  initScrollAnimations();

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

export function refreshScrollAnimations() {
  if (document.body.classList.contains("edit-mode-active")) return;

  initPageAnimations();
}

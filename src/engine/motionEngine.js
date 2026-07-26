/* ============================================================
   Xiberlinc World — Cinematic Motion Engine
   Awwwards-grade animation primitives built on GSAP, ScrollTrigger,
   Lenis, and SplitType.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';

// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

let lenisInstance = null;
let cursorDot = null;
let cursorRing = null;
let cursorLabel = null;
let mouseX = 0;
let mouseY = 0;

/**
 * Helper to resolve the current active scroll container
 */
export function getActiveScroller() {
  const dash = document.getElementById('world-dashboard');
  if (dash && dash.style.display !== 'none') {
    return dash;
  }
  return window;
}

/**
 * Initialize Lenis Smooth Inertial Scrolling & sync with GSAP Ticker
 */
export function initLenisSmoothScroll(customWrapper = null) {
  if (lenisInstance) {
    try { lenisInstance.destroy(); } catch (e) {}
    lenisInstance = null;
  }

  const scroller = customWrapper || getActiveScroller();
  const lenisConfig = {
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.5,
  };

  if (scroller && scroller !== window) {
    lenisConfig.wrapper = scroller;
    lenisConfig.content = scroller;
  }

  lenisInstance = new Lenis(lenisConfig);
  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

/**
 * Custom Interactive Magnetic Cursor System
 */
export function initCustomCursor() {
  if (typeof window === 'undefined') return;

  cursorDot = document.getElementById('custom-cursor-dot');
  cursorRing = document.getElementById('custom-cursor-ring');
  cursorLabel = document.getElementById('custom-cursor-label');

  if (!cursorDot || !cursorRing) return;

  const xDotTo = gsap.quickTo(cursorDot, 'x', { duration: 0.1, ease: 'power3' });
  const yDotTo = gsap.quickTo(cursorDot, 'y', { duration: 0.1, ease: 'power3' });
  const xRingTo = gsap.quickTo(cursorRing, 'x', { duration: 0.45, ease: 'power3.out' });
  const yRingTo = gsap.quickTo(cursorRing, 'y', { duration: 0.45, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    xDotTo(mouseX);
    yDotTo(mouseY);
    xRingTo(mouseX);
    yRingTo(mouseY);
  });

  // Global event delegation for interactive hover states & magnetic pull
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-cursor], button, a, input, select, .wld-card, .sfx-btn');
    if (target) {
      const cursorType = target.getAttribute('data-cursor');
      gsap.to(cursorRing, {
        scale: 1.8,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(cursorDot, { scale: 0, opacity: 0, duration: 0.2 });

      if (cursorType && cursorLabel) {
        cursorLabel.textContent = cursorType;
        gsap.to(cursorLabel, { opacity: 1, scale: 1, duration: 0.25 });
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-cursor], button, a, input, select, .wld-card, .sfx-btn');
    if (target) {
      gsap.to(cursorRing, {
        scale: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'transparent',
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(cursorDot, { scale: 1, opacity: 1, duration: 0.2 });

      if (cursorLabel) {
        gsap.to(cursorLabel, { opacity: 0, scale: 0.8, duration: 0.2 });
      }
    }
  });

  // Magnetic Button Physics for marked elements
  bindMagneticElements();
}

/**
 * Bind magnetic spring physics to interactive elements
 */
export function bindMagneticElements() {
  const magneticEls = document.querySelectorAll('[data-magnetic], .magnetic-btn');
  magneticEls.forEach((el) => {
    if (el._hasMagnetic) return;
    el._hasMagnetic = true;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);

      gsap.to(el, {
        x: relX * 0.35,
        y: relY * 0.35,
        rotate: relX * 0.03,
        duration: 0.4,
        ease: 'power2.out'
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        rotate: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.3)'
      });
    });
  });
}

/**
 * Editorial Headline Reveal using SplitType line/word clip masks
 */
export function splitTextReveal(target, options = {}) {
  const elements = typeof target === 'string' ? document.querySelectorAll(target) : [target];
  const results = [];
  const scroller = options.scroller || getActiveScroller();

  elements.forEach((el) => {
    if (!el) return;
    try {
      const split = new SplitType(el, { types: 'lines,words', lineClass: 'split-line-wrapper' });

      // Wrap each line in a clip-mask container if not already
      if (split.lines) {
        split.lines.forEach((line) => {
          const parent = line.parentElement;
          if (!parent || !parent.classList.contains('clip-text-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'clip-text-container';
            wrapper.style.overflow = 'hidden';
            wrapper.style.display = 'block';
            line.parentNode.insertBefore(wrapper, line);
            wrapper.appendChild(line);
          }
        });
      }

      const tween = gsap.from(split.words || split.lines || el, {
        yPercent: 120,
        rotateX: -15,
        opacity: 0,
        stagger: options.stagger || 0.035,
        duration: options.duration || 1.1,
        ease: options.ease || 'power4.out',
        scrollTrigger: options.scrollTrigger !== false ? {
          trigger: el,
          scroller: scroller,
          start: options.start || 'top 95%',
          toggleActions: 'play none none none',
          ...options.scrollTrigger
        } : null
      });

      results.push({ split, tween });
    } catch(e) {
      console.warn("splitTextReveal fallback on element:", el, e);
      gsap.to(el, { opacity: 1, y: 0, duration: 0.5 });
    }
  });

  return results;
}

/**
 * Masked Clip-Path Container Reveal
 */
export function maskedReveal(target, options = {}) {
  const elements = typeof target === 'string' ? document.querySelectorAll(target) : [target];
  const scroller = options.scroller || getActiveScroller();

  elements.forEach((el) => {
    if (!el) return;

    const anim = gsap.fromTo(el,
      {
        clipPath: options.clipFrom || 'inset(100% 0% 0% 0%)',
        y: options.yFrom !== undefined ? options.yFrom : 40,
        scale: options.scaleFrom || 0.96,
        opacity: 0
      },
      {
        clipPath: options.clipTo || 'inset(0% 0% 0% 0%)',
        y: 0,
        scale: 1,
        opacity: 1,
        duration: options.duration || 1.2,
        ease: options.ease || 'expo.out',
        stagger: options.stagger || 0.08,
        scrollTrigger: options.scrollTrigger !== false ? {
          trigger: el,
          scroller: scroller,
          start: options.start || 'top 95%',
          toggleActions: 'play none none none',
          ...options.scrollTrigger
        } : null
      }
    );

    // Guaranteed safety fallback: reveal elements after 1.8s if ScrollTrigger hasn't fired
    setTimeout(() => {
      if (getComputedStyle(el).opacity === '0' || getComputedStyle(el).clipPath.includes('100%')) {
        gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, y: 0, scale: 1, duration: 0.4 });
      }
    }, 1800);
  });
}

/**
 * Image Parallax & Container Reveal
 */
export function imageParallaxReveal(containerTarget, imgTarget) {
  const containers = typeof containerTarget === 'string'
    ? document.querySelectorAll(containerTarget)
    : [containerTarget];
  const scroller = getActiveScroller();

  containers.forEach((container) => {
    if (!container) return;
    const img = imgTarget ? container.querySelector(imgTarget) : container.querySelector('img');

    // Container mask expansion
    gsap.fromTo(container,
      { clipPath: 'inset(15% 15% 15% 15% round 16px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px)',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: container,
          scroller: scroller,
          start: 'top 90%',
        }
      }
    );

    if (img) {
      // Inner image scaling & parallax scroll
      gsap.fromTo(img,
        { scale: 1.35, yPercent: -12 },
        {
          scale: 1.0,
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            scroller: scroller,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    }
  });
}

/**
 * 3D Card Matrix Stagger Entrance
 */
export function staggerCards3D(targets, options = {}) {
  const elements = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
  if (!elements || !elements.length) return;
  const scroller = options.scroller || getActiveScroller();

  gsap.fromTo(elements,
    {
      opacity: 0,
      y: options.y || 50,
      rotateY: options.rotateY || -8,
      rotateX: options.rotateX || 6,
      scale: options.scale || 0.94,
      transformPerspective: 1200
    },
    {
      opacity: 1,
      y: 0,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      duration: options.duration || 1.0,
      ease: options.ease || 'power4.out',
      stagger: options.stagger || 0.06,
      scrollTrigger: options.scrollTrigger !== false ? {
        trigger: elements[0].parentElement || elements[0],
        scroller: scroller,
        start: options.start || 'top 95%',
        toggleActions: 'play none none none',
        ...options.scrollTrigger
      } : null
    }
  );

  // Safety fallback: reveal after 1.8s
  setTimeout(() => {
    elements.forEach((el) => {
      if (getComputedStyle(el).opacity === '0') {
        gsap.to(el, { opacity: 1, y: 0, rotateY: 0, rotateX: 0, scale: 1, duration: 0.4 });
      }
    });
  }, 1800);
}

/**
 * Pinned Storytelling Timeline Integration
 */
export function pinnedSectionTimeline(sectionTarget, buildTimelineCallback, scrollOptions = {}) {
  const section = typeof sectionTarget === 'string' ? document.querySelector(sectionTarget) : sectionTarget;
  if (!section) return;

  const scroller = scrollOptions.scroller || getActiveScroller();
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      scroller: scroller,
      pin: true,
      scrub: scrollOptions.scrub !== undefined ? scrollOptions.scrub : 1,
      start: scrollOptions.start || 'top top',
      end: scrollOptions.end || '+=150%',
      anticipatePin: 1,
      ...scrollOptions
    }
  });

  if (typeof buildTimelineCallback === 'function') {
    buildTimelineCallback(tl);
  }

  return tl;
}

/**
 * Background Geometric & Architectural Layer Motion
 */
export function backgroundClipReveal(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  const scroller = options.scroller || getActiveScroller();

  gsap.fromTo(el,
    { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', opacity: 0 },
    {
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      opacity: 1,
      duration: options.duration || 1.6,
      ease: 'expo.inOut',
      scrollTrigger: options.scrollTrigger !== false ? {
        trigger: el,
        scroller: scroller,
        start: 'top 85%',
        ...options.scrollTrigger
      } : null
    }
  );
}

/**
 * Refresh ScrollTrigger on dynamic DOM updates
 */
export function refreshMotion() {
  ScrollTrigger.refresh();
}

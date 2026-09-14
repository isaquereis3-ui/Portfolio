import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";

const dotSpring = { damping: 30, stiffness: 400, mass: 0.4 };
const ringSpring = { damping: 22, stiffness: 180, mass: 0.6 };
const ringStickySpring = { damping: 38, stiffness: 120, mass: 0.9 };

const MAGNETIC_ENTER_PADDING = 6;
const MAGNETIC_EXIT_PADDING = 18;

const interactiveSelector =
  'a, button, [role="button"], input, textarea, select, label, summary';

const magneticSelector = "[data-cursor-magnetic]";

function getDistanceToElement(clientX: number, clientY: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const nearestX = Math.max(rect.left, Math.min(clientX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(clientY, rect.bottom));

  return {
    distance: Math.hypot(clientX - nearestX, clientY - nearestY),
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [isMagnetic, setIsMagnetic] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const stickyElementRef = useRef<HTMLElement | null>(null);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const dotX = useSpring(mouseX, dotSpring);
  const dotY = useSpring(mouseY, dotSpring);
  const ringX = useSpring(mouseX, isMagnetic ? ringStickySpring : ringSpring);
  const ringY = useSpring(mouseY, isMagnetic ? ringStickySpring : ringSpring);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateEnabled = () => {
      const enabled = finePointer.matches && !reducedMotion.matches;
      setIsEnabled(enabled);
      document.body.classList.toggle("custom-cursor-active", enabled);
    };

    updateEnabled();
    finePointer.addEventListener("change", updateEnabled);
    reducedMotion.addEventListener("change", updateEnabled);

    return () => {
      finePointer.removeEventListener("change", updateEnabled);
      reducedMotion.removeEventListener("change", updateEnabled);
      document.body.classList.remove("custom-cursor-active");
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    const applyMagneticPull = (clientX: number, clientY: number) => {
      let targetX = clientX;
      let targetY = clientY;
      let magnetic = false;

      const stickyElement = stickyElementRef.current;

      if (stickyElement) {
        const { distance, centerX, centerY } = getDistanceToElement(
          clientX,
          clientY,
          stickyElement,
        );

        if (distance > MAGNETIC_EXIT_PADDING) {
          stickyElementRef.current = null;
        } else {
          magnetic = true;
          const strength = 1 - Math.min(distance / MAGNETIC_EXIT_PADDING, 1);
          const pull = 0.2 + strength * 0.45;
          targetX = clientX + (centerX - clientX) * pull;
          targetY = clientY + (centerY - clientY) * pull;
        }
      }

      if (!stickyElementRef.current) {
        const magneticElements =
          document.querySelectorAll<HTMLElement>(magneticSelector);

        let nearest: { element: HTMLElement; distance: number } | null = null;

        magneticElements.forEach((element) => {
          const { distance } = getDistanceToElement(clientX, clientY, element);

          if (
            distance <= MAGNETIC_ENTER_PADDING &&
            (!nearest || distance < nearest.distance)
          ) {
            nearest = { element, distance };
          }
        });

        if (nearest) {
          stickyElementRef.current = nearest.element;
          magnetic = true;

          const { centerX, centerY } = getDistanceToElement(
            clientX,
            clientY,
            nearest.element,
          );
          const strength = 1 - nearest.distance / MAGNETIC_ENTER_PADDING;
          const pull = 0.18 + strength * 0.35;
          targetX = clientX + (centerX - clientX) * pull;
          targetY = clientY + (centerY - clientY) * pull;
        }
      }

      setIsMagnetic(magnetic);
      mouseX.set(targetX);
      mouseY.set(targetY);
    };

    const handleMove = (event: MouseEvent) => {
      applyMagneticPull(event.clientX, event.clientY);

      if (!isVisible) setIsVisible(true);
    };

    const handleLeave = () => {
      setIsVisible(false);
      setIsPressing(false);
      setIsMagnetic(false);
      stickyElementRef.current = null;
    };

    const handleEnter = () => setIsVisible(true);

    const handleOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      setIsHovering(Boolean(target.closest(interactiveSelector)));
    };

    const handleDown = () => setIsPressing(true);
    const handleUp = () => setIsPressing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    document.documentElement.addEventListener("mouseenter", handleEnter);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      document.documentElement.removeEventListener("mouseenter", handleEnter);
    };
  }, [isEnabled, isVisible, mouseX, mouseY]);

  if (!isEnabled) return null;

  const ringScale = isHovering || isMagnetic ? (isMagnetic ? 2 : 1.75) : 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-[9999] size-8 rounded-full border border-base-900/25 dark:border-white/25"
            style={{
              x: ringX,
              y: ringY,
              translateX: "-50%",
              translateY: "-50%",
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: ringScale,
            }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />

          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-[10000] size-1.5 rounded-full bg-base-900 dark:bg-white"
            style={{
              x: dotX,
              y: dotY,
              translateX: "-50%",
              translateY: "-50%",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: isPressing ? 3 : isHovering || isMagnetic ? 0 : 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

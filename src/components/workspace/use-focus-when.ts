import { useEffect, useRef } from "react";

// Moves keyboard focus to an element the first time `when` becomes true,
// so a step transition does not drop focus to the top of the page. An
// element taller than the viewport or partly hidden is scrolled to its top
// first, so focusing it does not land the view in its middle. `target`
// picks the element to focus inside the ref'd one; pass a stable function.
export function useFocusWhen<T extends HTMLElement>(when: boolean, target?: (el: T) => HTMLElement) {
  const ref = useRef<T | null>(null);
  const was = useRef(when);
  useEffect(() => {
    const el = ref.current && (target ? target(ref.current) : ref.current);
    if (when && !was.current && el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) el.scrollIntoView({ block: "start" });
      el.focus({ preventScroll: true });
    }
    was.current = when;
  }, [when, target]);
  return ref;
}

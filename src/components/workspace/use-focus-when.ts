import { useEffect, useRef } from "react";

// Moves keyboard focus to an element the first time `when` becomes true,
// so a step transition does not drop focus to the top of the page.
export function useFocusWhen<T extends HTMLElement>(when: boolean) {
  const ref = useRef<T | null>(null);
  const was = useRef(when);
  useEffect(() => {
    if (when && !was.current) ref.current?.focus();
    was.current = when;
  }, [when]);
  return ref;
}

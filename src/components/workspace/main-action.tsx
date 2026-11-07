"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

function shortcutLabel(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform: string } };
  return /mac/i.test(nav.userAgentData?.platform ?? nav.platform) ? "⌘ Enter" : "Ctrl+Enter";
}

// The one main action of a step, in the brand magenta. Ctrl+Enter (⌘ Enter on
// Mac) clicks it. The workspace renders at most one MainAction at a time (the
// header form until it is confirmed, then analyze until there is a selection,
// then the draft step), so the shortcut is never ambiguous.
export function MainAction({ className, ref, ...props }: React.ComponentProps<typeof Button>) {
  const own = useRef<HTMLButtonElement | null>(null);
  const shortcut = useSyncExternalStore(noSubscription, shortcutLabel, () => "Ctrl+Enter");

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      own.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
      const button = own.current;
      if (!button || button.disabled) return;
      if (event.target instanceof Element && event.target.closest('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      button.click();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Button
      title={shortcut}
      {...props}
      ref={setRef}
      className={cn("h-10 rounded-full! bg-brand-magenta-strong px-5 text-white hover:bg-brand-magenta-deep disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100", className)}
    />
  );
}

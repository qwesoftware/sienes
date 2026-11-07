"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Copies one field to the clipboard. The parent renders it only once the
// review is confirmed for the current revision.
export function CopyButton({ text, label, ariaLabel }: { text: string; label: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={text.length === 0}
      aria-label={ariaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiado" : label}
    </Button>
  );
}

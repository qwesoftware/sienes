"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Copies one field to the clipboard. The parent renders it only once the
// review is confirmed for the current revision.
export function CopyButton({ text, label, ariaLabel, variant = "outline" }: { text: string; label: string; ariaLabel?: string; variant?: "outline" | "ghost" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={text.length === 0}
      aria-label={ariaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check data-icon="inline-start" aria-hidden /> : <Copy data-icon="inline-start" aria-hidden />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

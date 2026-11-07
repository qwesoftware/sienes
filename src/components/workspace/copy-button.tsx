"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Copies one field to the clipboard. Disabled until the review is confirmed
// for the current revision; the parent decides that.
export function CopyButton({ text, label, disabled }: { text: string; label: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || text.length === 0}
      title={disabled ? "Confirmá la revisión para copiar" : undefined}
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

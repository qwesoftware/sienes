"use client";

import { CirclePlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// The recording is redacted before it lands in public/: no patient data on screen.
const VIDEO_SRC = "/help/exportar-medexis.mp4";

export function ExportHelp() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="link" className="text-muted-foreground" />}>
        <CirclePlayIcon data-icon="inline-start" aria-hidden />
        ¿Cómo exporto el PDF de Medexis?
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exportar la historia desde Medexis</DialogTitle>
          <DialogDescription>Un PDF por paciente. Después lo arrastrás acá.</DialogDescription>
        </DialogHeader>
        {/* preload="none": the file is only fetched when someone presses play. */}
        <video src={VIDEO_SRC} controls preload="none" className="aspect-video w-full rounded-lg bg-muted" />
      </DialogContent>
    </Dialog>
  );
}

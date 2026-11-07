"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/case/store";

export function SessionDialog() {
  const { notice, continueWorking, dismissNotice } = useWorkspace();
  if (!notice) return null;
  if (notice.kind === "warning") {
    const minutes = Math.max(1, Math.round(notice.remainingMs / 60_000));
    return (
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>La sesión clínica está por expirar</AlertDialogTitle>
            <AlertDialogDescription>
              Por inactividad, en {minutes} {minutes === 1 ? "minuto" : "minutos"} se borrarán los casos cargados en esta pestaña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={continueWorking}>Continuar trabajando</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>La sesión clínica expiró</AlertDialogTitle>
          <AlertDialogDescription>Los casos se borraron de esta pestaña por inactividad. Podés volver a cargar los PDF.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={dismissNotice}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

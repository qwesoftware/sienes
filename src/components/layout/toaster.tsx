"use client";

import { OctagonXIcon } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  useToastManager,
} from "@/components/ui/toast";

// Errors stay a little longer than the default and are announced assertively.
// Hovering or focusing the stack pauses the timer.
export function showError(title: string, description?: string) {
  toast.add({ type: "error", title, description, priority: "high", timeout: 8000 });
}

export function AppToaster({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider toastManager={toast}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

function ToastList() {
  const { toasts } = useToastManager();
  return toasts.map((item) => (
    <Toast key={item.id} toast={item} data-testid="toast">
      <ToastContent>
        {item.type === "error" ? <OctagonXIcon className="size-4 shrink-0 text-destructive" aria-hidden /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastClose aria-label="Cerrar" />
      </ToastContent>
    </Toast>
  ));
}

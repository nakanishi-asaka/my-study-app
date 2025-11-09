"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport
        className="
          fixed top-4 left-1/2 -translate-x-1/2
          z-[100] flex flex-col gap-2
          m-0 p-0
          [--viewport-padding:0px]
          pointer-events-none
        "
        style={{
          top: "1rem",
          bottom: "auto",
          right: "auto",
        }}
      />
    </ToastProvider>
  );
}

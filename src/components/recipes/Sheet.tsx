"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/** Bottom sheet on phones, centred dialog from `sm:`. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col rounded-t-2xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start gap-3 border-b border-border px-5 pt-4 pb-3">
            <DialogPrimitive.Title className="flex-1 text-lg leading-snug font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="btn -mr-2 -mt-1 flex h-11 w-11 shrink-0 text-ink-muted hover:bg-surface-muted hover:text-foreground active:bg-surface-muted"
              aria-label="Close"
            >
              <X size={20} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

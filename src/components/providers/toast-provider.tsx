"use client";

import { GooeyToaster, gooeyToast } from "goey-toast";
import "goey-toast/styles.css";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GooeyToaster 
        position="top-right"
        offset="24px"
        gap={14}
        duration={4000}
        closeOnEscape
        swipeToDismiss
        theme="light"
      />
    </>
  );
}

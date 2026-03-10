"use client";

import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GooeyToaster 
        position="top-right"
        expand={true}
        richColors
        preset="smooth"
      />
    </>
  );
}

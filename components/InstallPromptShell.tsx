"use client";

import { type ReactNode } from "react";
import { InstallPromptProvider } from "./InstallPromptContext";
import InstallBanner from "./InstallBanner";

/** Обёртка: триггеры установки PWA на всех страницах. */
export default function InstallPromptShell({ children }: { children: ReactNode }) {
  return (
    <InstallPromptProvider>
      {children}
      <InstallBanner />
    </InstallPromptProvider>
  );
}

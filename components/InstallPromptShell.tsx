"use client";

import { type ReactNode } from "react";
import { InstallPromptProvider } from "./InstallPromptContext";
import InstallBanner from "./InstallBanner";
import ChannelBanner from "./ChannelBanner";

/** Обёртка: триггеры установки PWA и плашка Telegram на всех страницах. */
export default function InstallPromptShell({ children }: { children: ReactNode }) {
  return (
    <InstallPromptProvider>
      {children}
      <InstallBanner />
      <ChannelBanner />
    </InstallPromptProvider>
  );
}

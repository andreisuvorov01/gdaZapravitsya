import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Golos_Text, Manrope } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import YandexMetrika from "@/components/YandexMetrika";
import YandexMetrikaHit from "@/components/YandexMetrikaHit";
import CookieNotice from "@/components/CookieNotice";
import InstallPromptShell from "@/components/InstallPromptShell";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, OG_IMAGE_PATH, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, OG_IMAGE_ALT } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo-metadata";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-golos",
  weight: ["400", "600", "700"],
});

const unbounded = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-unbounded",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Бенз-Атлас — наличие топлива на карте АЗС",
    template: "%s | Бенз-Атлас",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  keywords: [
    "бензин",
    "заправки",
    "АЗС",
    "наличие топлива",
    "очереди",
    "бенз атлас",
  ],
  openGraph: {
    title: "Бенз-Атлас — наличие топлива на АЗС",
    description: "Карта АЗС с актуальным наличием топлива, лимитами и очередями.",
    type: "website",
    siteName: SITE_NAME,
    locale: "ru_RU",
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Бенз-Атлас — наличие топлива на АЗС",
    description: "Карта АЗС с актуальным наличием топлива, лимитами и очередями.",
    images: [DEFAULT_OG_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-120.png", sizes: "120x120", type: "image/png" },
      { url: "/favicon.ico", sizes: "120x120", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  verification: {
    yandex: ["712ce168c12b9a21", "d69176b587a8847b"],
    google: "I5ugdLjeu_eBscqkxZ4ZObIpZKcOYTPXCM8JlqVZ1c4",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/blog/feed.xml", title: `${SITE_NAME} — блог` }],
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0D1F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${golos.variable} ${unbounded.variable}`}>
      <body className="h-full bg-surface-map font-sans text-ink antialiased">
        <InstallPromptShell>{children}</InstallPromptShell>
        <PWARegister />
        <YandexMetrika />
        <Suspense fallback={null}>
          <YandexMetrikaHit />
        </Suspense>
        <CookieNotice />
      </body>
    </html>
  );
}

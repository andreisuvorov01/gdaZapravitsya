import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Экспорт бренда",
  robots: { index: false, follow: false },
};

export default function BrandExportLayout({ children }: { children: React.ReactNode }) {
  return children;
}

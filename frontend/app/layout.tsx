import type { Metadata } from "next";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xynoos AI",
  description:
    "Xynoos AI v1 adalah asisten AI buatan Samuel Indra Bastian untuk tanya jawab, analisis, penulisan, belajar, dan produktivitas digital."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

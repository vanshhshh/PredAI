import "../styles/globals.css";
import React from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/Shared/Footer";
import { Navbar } from "@/components/Shared/Navbar";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata = {
  title: "MoltMarket - AI-Native Prediction Markets",
  description:
    "Prediction markets, autonomous agents, yield intelligence, and protocol governance in one interface.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen antialiased`}
      >
        <Providers>
          <a href="#main-content" className="skip-link ui-btn ui-btn-secondary">
            Skip to content
          </a>
          <div className="relative flex min-h-screen flex-col">
            <span aria-hidden="true" className="orb orb-a" />
            <span aria-hidden="true" className="orb orb-b" />
            <span aria-hidden="true" className="orb orb-c" />
            <Navbar />
            <main id="main-content" className="flex-1 page-shell">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

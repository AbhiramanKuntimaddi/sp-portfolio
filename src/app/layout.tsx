import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DesignLab, type DesignLabConfig } from "design-lab";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { SITE } from "@/lib/content";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dev-only Design Lab panel (../DesignLab). Renders nothing in production.
const labConfig: DesignLabConfig = {
  fonts: ["heading", "display", "body", "label"],
  labels: { display: "Italic lines", label: "Labels & readouts" },
  current: {
    heading: "Bodoni Moda",
    display: "Bodoni Moda",
    body: "Geist",
    label: "Geist Mono",
  },
};

export const metadata: Metadata = {
  title: `${SITE.name} — Interior Designer, Vocalist, Entrepreneur`,
  description:
    "The personal portfolio of Spandana Puppala — Hyderabad-based interior designer, Carnatic vocalist, educator and founder of Jaipuri Trunk.",
  openGraph: {
    title: SITE.name,
    description: "Interior designer, Carnatic vocalist, educator and entrepreneur.",
    images: ["/img/portrait.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#100e0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables live on <html>: the role tokens (--font-heading etc.)
    // are resolved on :root, so they must be able to see them.
    <html lang="en" className={`${bodoni.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js');if(location.pathname==='/')document.documentElement.dataset.stage='loading'",
          }}
        />
      </head>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        {process.env.NODE_ENV === "development" && <DesignLab config={labConfig} />}
      </body>
    </html>
  );
}

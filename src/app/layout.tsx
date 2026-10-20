import type { Metadata, Viewport } from "next";
import { Allura, Montserrat } from "next/font/google";
import "./globals.css";
import { DesignLab, type DesignLabConfig } from "design-lab";
import SmoothScrollProvider from "@/components/motion/SmoothScrollProvider";
import { SITE } from "@/lib/content";

// Montserrat carries everything structural: ExtraBold headlines, text, labels, readouts.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Amsterdam Four (the script) is self-hosted from /public/fonts (see globals.css).
// Allura stands in until that file is added, so nothing breaks meanwhile.
const allura = Allura({
  variable: "--font-allura",
  subsets: ["latin"],
  weight: "400",
});

// Dev-only Design Lab panel (../DesignLab). Renders nothing in production.
const labConfig: DesignLabConfig = {
  fonts: ["heading", "display", "body", "label"],
  labels: { display: "Script", label: "Labels & readouts" },
  current: {
    heading: "Montserrat",
    display: "Amsterdam Four",
    body: "Montserrat",
    label: "Montserrat",
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
    <html lang="en" className={`${montserrat.variable} ${allura.variable}`} suppressHydrationWarning>
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

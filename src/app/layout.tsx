import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FORGE - Train, Read, Learn",
    template: "%s | FORGE",
  },
  description:
    "One hub for workouts, free books and learning anything. Fitness tracking works offline, your progress stays on your device, and every counter starts at zero.",
  applicationName: "FORGE",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-180.png",
  },
  keywords: [
    "fitness tracker",
    "step counter",
    "workout log",
    "free books",
    "online reader",
    "study",
    "offline",
  ],
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* Extra display fonts. If any CDN fails, the stack falls back gracefully. */
const fontStylesheets = [
  "https://fonts.cdnfonts.com/css/burbank-big-condensed",
  "https://fonts.cdnfonts.com/css/komika-axis",
  "https://fonts.cdnfonts.com/css/cocogoose-classic",
  "https://fonts.cdnfonts.com/css/planet-comic",
  "https://fonts.cdnfonts.com/css/akira-expanded",
  "https://fonts.cdnfonts.com/css/coolvettica",
  "https://fonts.cdnfonts.com/css/obelixpro",
  "https://fonts.cdnfonts.com/css/neue-haas-grotesk-display-pro",
  "https://fonts.cdnfonts.com/css/museo-sans",
  "https://fonts.cdnfonts.com/css/gotham-black",
  "https://fonts.cdnfonts.com/css/blues-smiles",
  "https://fonts.googleapis.com/css2?family=Mont:wght@400;700;900&display=swap",
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bebas.variable} ${inter.variable} ${montserrat.variable} min-h-screen antialiased bg-background text-foreground`}
      >
        {fontStylesheets.map((href) => (
          <link
            key={href}
            rel="stylesheet"
            href={href}
            precedence="default"
            crossOrigin="anonymous"
          />
        ))}
        {children}
        <Toaster />
      </body>
    </html>
  );
}

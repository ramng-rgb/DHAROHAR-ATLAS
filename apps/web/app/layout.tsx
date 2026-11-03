import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { DemoTourOverlay } from "@/components/demo/DemoTourOverlay";

export const metadata: Metadata = {
  title: "Dharohar Atlas | Digital Revitalisation of Cultural Heritage Archives",
  description: "Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives. Solanki stepwells, Harappan citadels, Devanagari manuscripts, and 3D digital twins.",
  keywords: ["Dharohar Atlas", "Indian Heritage", "Rani ki Vav", "Stepwells", "Modhera", "Archaeological Archive", "3D Photogrammetry", "IIT Gandhinagar"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#F3E9DC" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Gujarati:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#090D16] text-indigoHeritage flex flex-col font-sans selection:bg-terracotta/20 selection:text-terracotta">
        <Navbar />
        <main className="flex-1 flex flex-col bg-sandstone-100 jali-pattern">{children}</main>
        <DemoTourOverlay />
      </body>
    </html>
  );
}

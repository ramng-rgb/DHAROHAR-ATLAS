import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#090D16] text-[#F6F1E9] flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

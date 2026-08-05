import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModeProvider } from "@/lib/mode-context";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Terminal from "@/components/Terminal";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Sargundeep Singh",
  description: "I build intelligent systems that speak, reason and act.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${serif.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ModeProvider>
          <div className="grain" aria-hidden="true" />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <Terminal />
        </ModeProvider>
      </body>
    </html>
  );
}

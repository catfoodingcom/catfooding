import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CATFOODING — Raise a cat. Let it hunt.",
  description:
    "A cat that reads the CoAgentic engine for tokenized stocks on X Layer. Live mode shows the engine's real verdicts and book, read-only; Demo mode paper-trades a simulated market. The cat places no real trades.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} dark h-full`}>
      <body className="min-h-full bg-ink text-cream font-sans antialiased">
        <ThemeProvider attribute="data-theme" themes={["green", "blue"]} defaultTheme="green" enableSystem={false} storageKey="catfood-theme">
          <TooltipProvider delay={150}>
            {children}
            <Toaster theme="dark" position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

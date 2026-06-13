import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// FIX [2]: Use `variable` so the font is available as a CSS var (--font-inter)
// that @theme can reference, rather than only as a className
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // FIX: prevents FOIT (invisible text during font load)
});

export const metadata: Metadata = {
  title: "Pyrexx AI | Dashboard",
  description:
    "Monitor your AI receptionist performance — call pickup rates, bookings, transcripts, and more.",
  robots: { index: false, follow: false }, // Private dashboard — keep off search
  // FIX: Use the real Pyrexx mark as favicon / app icon (was missing entirely before)
  icons: {
    icon: "/PyrexxAI_logo.png",
    shortcut: "/PyrexxAI_logo.png",
    apple: "/PyrexxAI_logo.png",
  },
};

// FIX: Explicit viewport export (Next.js 14+ best practice; ensures no zoom disable)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // never set maximumScale/userScalable here — that would violate WCAG 1.4.4
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // FIX [3]: No hardcoded light-mode classes on <body>.
    // bg/fg come from CSS vars (var(--background), var(--foreground)) set in globals.css
    // The `dark` class is applied by the anti-flash script below before first paint.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          FIX [5] + FIX [20]: Dark mode anti-flash script.
          Runs synchronously before the page renders, reads localStorage,
          and applies the `dark` class to <html> — zero flash of wrong theme.
          suppressHydrationWarning on <html> silences React's hydration mismatch warning.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('pyrexx-theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        // FIX [3]: bg/fg from CSS vars — no hardcoded Tailwind color overrides
      >
        {children}
      </body>
    </html>
  );
}

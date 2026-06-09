@import "tailwindcss";

/* ─── Design Tokens ─────────────────────────────────────────────── */
:root {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #ffffff;
  --card-border: #E2E8F0;
  --muted: #64748B;
}

html.dark {
  --background: #160B24;
  --foreground: #F1F5F9;
  --card: #221136;
  --card-border: rgba(137, 82, 165, 0.2);
  --muted: #94A3B8;
  color-scheme: dark;
}

/* ─── Tailwind v4 Theme Registration ────────────────────────────── */
/* FIX [2]: Reference the Inter variable correctly, not undefined Geist vars */
/* FIX [21]: Canonical border-radius token (use rounded-card everywhere) */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);

  /* Pyrexx brand tokens — canonical source of truth */
  --color-pyrexx-blue: #48C4C6;
  --color-pyrexx-purple: #8952A5;
  --color-pyrexx-darkBg: #160B24;
  --color-pyrexx-darkCard: #221136;
  --color-pyrexx-surface: #2A1842;

  /* Font stack — wired to the CSS variable set by next/font in layout */
  --font-sans: var(--font-inter, ui-sans-serif, system-ui, sans-serif);

  /* Canonical shadows */
  --shadow-card: 0 2px 12px -4px rgba(72, 196, 198, 0.12), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-card-dark: 0 4px 20px -6px rgba(137, 82, 165, 0.3), 0 1px 3px rgba(0,0,0,0.2);
  --shadow-float: 0 8px 32px -8px rgba(72, 196, 198, 0.18), 0 2px 8px rgba(0,0,0,0.08);

  /* FIX [21]: Single border-radius token for cards */
  --radius-card: 1.5rem;   /* 24px — used on all cards */
  --radius-modal: 1.75rem; /* 28px — modals */
  --radius-pill: 9999px;
  --radius-item: 0.875rem; /* 14px — inner list items */
}

/* ─── Base Styles ────────────────────────────────────────────────── */
/* FIX [1]: Remove Arial override — let next/font Inter take effect */
/* FIX [3]: Use CSS variable for bg/fg instead of hardcoded Tailwind classes */
body {
  background-color: var(--background);
  color: var(--foreground);
  /* font-family comes from --font-sans / next/font Inter class on <html> */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* ─── Reduced Motion ─────────────────────────────────────────────── */
/* FIX [8]: Respect system accessibility preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* Framer Motion uses inline styles — this kills its transitions too */
  [style*="transform"],
  [style*="opacity"] {
    transition: none !important;
  }
}

/* ─── Scrollbar Styling ──────────────────────────────────────────── */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(137, 82, 165, 0.3) transparent;
}
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(137, 82, 165, 0.3);
  border-radius: 9999px;
}

html {
  scroll-behavior: smooth;
}

/* ─── Focus Visible ──────────────────────────────────────────────── */
/* Accessibility: visible focus ring for keyboard nav */
:focus-visible {
  outline: 2px solid #48C4C6;
  outline-offset: 2px;
  border-radius: 4px;
}

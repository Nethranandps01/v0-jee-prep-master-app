export const theme = {
  colors: {
    // Backgrounds
    background: "#F4F7FC",
    surface: "#FFFFFF",
    surfaceSoft: "#EEF4FF",
    backgroundGradient: "linear-gradient(180deg, #F4F7FC 0%, #EAF2FF 100%)",

    // Primary (Blue System)
    primary: "#2D6FD2",
    primaryLight: "#4C89E6",
    primarySoft: "#DCE9FF",
    secondary: "#1F57B7",

    // Accent (CTA / Highlights)
    accent: "#F39A3E",
    accentLight: "#FDE3C8",

    // Text
    textPrimary: "#1E2F4D",
    textSecondary: "#5C6F8F",
    textMuted: "#8B9BB5",
    textWhite: "#FFFFFF",

    // Buttons
    buttonPrimaryBg: "#2D6FD2",
    buttonPrimaryText: "#FFFFFF",

    buttonSecondaryBg: "#FFFFFF",
    buttonSecondaryBorder: "#2D6FD2",
    buttonSecondaryText: "#2D6FD2",

    // UI Elements
    border: "#D8E2F2",
    divider: "#E8EEF8",
    inputBackground: "#EEF3FA",
    tagBackground: "#DCE9FF",

    // Status
    success: "#34B36B",
    highlight: "#F39A3E",
  },

  spacing: (factor: number) => `${factor * 8}px`,

  typography: {
    fontFamily: "'Inter', sans-serif",
    headingWeight: 600,
    bodyWeight: 400,
  },

  borderRadius: {
    card: "20px",
    button: "12px",
    pill: "999px",
  },

  shadow: {
    soft: "0 10px 24px rgba(32, 87, 183, 0.10)",
    card: "0 6px 18px rgba(21, 64, 139, 0.10)",
  },

  // Back-compat alias for older screens
  shadows: {
    soft: "0 10px 24px rgba(32, 87, 183, 0.10)",
    card: "0 6px 18px rgba(21, 64, 139, 0.10)",
    button: "0 8px 20px rgba(45, 111, 210, 0.24)",
  },
};

export type Theme = typeof theme;

// Back-compat export for screens that import gradients
export const gradients = {
  primary: "linear-gradient(135deg, #2057B7 0%, #4C89E6 100%)",
  accent: "linear-gradient(135deg, #F39A3E 0%, #FDE3C8 100%)",
};

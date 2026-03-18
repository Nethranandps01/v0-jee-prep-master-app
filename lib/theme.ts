export const theme = {
  colors: {
    // Backgrounds
    background: "#F3F4F4",
    surface: "#FFFFFF",
    surfaceSoft: "#EAF3F4",
    backgroundGradient: "linear-gradient(135deg, #F3F4F4 0%, #EAF3F4 100%)",

    // Primary (Teal System)
    primary: "#1F6F78",
    primaryLight: "#6FAFB6",
    primarySoft: "#CFE6E8",
    secondary: "#6FAFB6",

    // Accent (CTA / Highlights)
    accent: "#F47C5C",
    accentLight: "#FAD1C6",

    // Text
    textPrimary: "#1E2A2F",
    textSecondary: "#5F6F73",
    textMuted: "#9AA8AC",
    textWhite: "#FFFFFF",

    // Buttons
    buttonPrimaryBg: "#1F6F78",
    buttonPrimaryText: "#FFFFFF",

    buttonSecondaryBg: "#FFFFFF",
    buttonSecondaryBorder: "#1F6F78",
    buttonSecondaryText: "#1F6F78",

    // UI Elements
    border: "#E0E6E8",
    divider: "#EDF1F2",
    inputBackground: "#EDF1F2",
    tagBackground: "#CFE6E8",

    // Status
    success: "#2D8C8F",
    highlight: "#F47C5C",
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
    soft: "0 8px 20px rgba(0,0,0,0.05)",
    card: "0 4px 12px rgba(0,0,0,0.06)",
  },

  // Back-compat alias for older screens
  shadows: {
    soft: "0 8px 20px rgba(0,0,0,0.05)",
    card: "0 4px 12px rgba(0,0,0,0.06)",
    button: "0 6px 16px rgba(31, 111, 120, 0.18)",
  },
};

export type Theme = typeof theme;

// Back-compat export for screens that import gradients
export const gradients = {
  primary: "linear-gradient(135deg, #1F6F78 0%, #6FAFB6 100%)",
  accent: "linear-gradient(135deg, #F47C5C 0%, #FAD1C6 100%)",
};

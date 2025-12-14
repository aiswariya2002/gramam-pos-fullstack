// src/mui/theme.js
import { createTheme } from "@mui/material/styles";

export const buildTheme = (ui) => {
  const primaryColor = ui?.primary || "#2196f3";
  const isGradient = primaryColor.includes("linear-gradient");

  // 1️⃣ Create base theme first
  const base = createTheme({
    palette: {
      mode: ui?.mode || "light",
      primary: {
        main: isGradient ? "#2196f3" : primaryColor,
      },
      secondary: { main: "#6c757d" },
      background: {
        default: ui?.mode === "dark" ? "#121212" : "#f6f7fb",
      },
    },
  });

  // 2️⃣ Attach safe custom fields manually
  base.custom = {
    primaryBG: primaryColor,
    isGradient,
  };

  // 3️⃣ Rebuild final theme using base + components
  return createTheme(base, {
    components: {
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            background: base.custom.primaryBG,
            color: "#fff",
            backgroundSize: "200%",
            "&:hover": {
              background: base.custom.primaryBG,
              transform: "scale(1.03)",
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            background: base.custom.primaryBG,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          colorPrimary: {
            background: base.custom.primaryBG,
            color: "#fff",
          },
        },
      },
    },
  });
};

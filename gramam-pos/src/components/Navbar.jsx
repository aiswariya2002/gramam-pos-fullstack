import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { FiSun, FiMoon } from "react-icons/fi";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function Navbar({ ui, setUi, open, onToggleSidebar }) {
  const [shop, setShop] = useState({
    name: "Gramam POS",
    logo: "/assets/logo.png",
  });

  // ✅ Load shop details from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shop_info");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setShop({
          name: parsed.name || "Gramam POS",
          logo: parsed.logo || "/assets/logo.png",
        });
      } catch {}
    }
  }, []);

  const toggleMode = () =>
    setUi({ ...ui, mode: ui.mode === "light" ? "dark" : "light" });

  const isLight = ui.mode === "light";
  const isMobile = useMediaQuery("(max-width:768px)");

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        height: 70,
        ml: { md: open ? "240px" : "70px" },
        width: { md: open ? "calc(100% - 240px)" : "calc(100% - 70px)" },
        transition: "all 0.3s ease",
        bgcolor: isLight
          ? "rgba(255,255,255,0.75)"
          : "rgba(10,14,23,0.6)",
        color: isLight ? "#111" : "#fff",
        borderBottom: `1px solid ${isLight ? "#ddd" : "rgba(255,255,255,0.1)"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1300,
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* ---------- Left Section ---------- */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* ✅ Mobile toggle icon */}
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={() => onToggleSidebar(!open)}
              sx={{
                mr: 1,
                transition: "transform 0.2s ease",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              {open ? <ChevronRightIcon /> : <MenuIcon />}
            </IconButton>
          )}

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              textTransform: "capitalize",
              letterSpacing: 0.3,
            }}
          >
            {shop.name}
          </Typography>
        </Box>

        {/* ---------- Right Section ---------- */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title="Toggle Theme">
            <IconButton onClick={toggleMode} color="inherit">
              {isLight ? <FiMoon size={20} /> : <FiSun size={20} />}
            </IconButton>
          </Tooltip>

          <Avatar
            src={shop.logo}
            alt={shop.name}
            sx={{
              width: 42,
              height: 42,
              border: `2px solid ${isLight ? "#ddd" : "rgba(255,255,255,0.2)"}`,
              bgcolor: "background.paper",
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

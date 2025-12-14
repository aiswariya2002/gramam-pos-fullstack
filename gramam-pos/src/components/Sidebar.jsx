import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import HomeIcon from "@mui/icons-material/Home";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PeopleIcon from "@mui/icons-material/People";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function Sidebar({ open, onToggleSidebar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery("(max-width:768px)");
  const drawerWidth = open ? 240 : isMobile ? 0 : 70;

  const [shop, setShop] = useState({
    name: "Gramam POS",
    logo: "/assets/logo.png",
  });

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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase() || "admin";

  const adminMenu = [
    { label: "Dashboard", to: "/dashboard", icon: <HomeIcon /> },
    { label: "Products", to: "/products", icon: <Inventory2Icon /> },
    { label: "Workers", to: "/workers", icon: <PeopleIcon /> },
    { label: "Reports", to: "/reports", icon: <BarChartIcon /> },
    { label: "Barcode Print", to: "/barcode-print", icon: <LocalPrintshopIcon /> },
    { label: "Settings", to: "/register", icon: <Inventory2Icon /> },
  ];

  const staffMenu = [
    { label: "Products", to: "/products", icon: <Inventory2Icon /> },
    { label: "Sales", to: "/sales", icon: <ReceiptIcon /> },
  ];

  const nav = role === "admin" ? adminMenu : staffMenu;
  const SIDEBAR_BG = localStorage.getItem("theme_color") || "#1976d2";

  // ✅ MOBILE SIDEBAR as Drawer
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={() => onToggleSidebar(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: 240,
            background: SIDEBAR_BG,
            color: "white",
          },
        }}
      >
        <SidebarContent
          open
          onToggleSidebar={onToggleSidebar}
          shop={shop}
          nav={nav}
          pathname={pathname}
        />
      </Drawer>
    );
  }

  // ✅ DESKTOP SIDEBAR
  return (
    <Box
      sx={{
        width: drawerWidth,
        transition: "width 0.3s ease",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1202,
        background: SIDEBAR_BG,
        color: "white",
        boxShadow: "2px 0px 10px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}
    >
      <SidebarContent
        open={open}
        onToggleSidebar={onToggleSidebar}
        shop={shop}
        nav={nav}
        pathname={pathname}
      />
    </Box>
  );
}

// 🔥 SIDEBAR CONTENT
function SidebarContent({ open, onToggleSidebar, shop, nav, pathname }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar
            src={shop.logo}
            sx={{
              width: 46,
              height: 46,
              border: "2px solid rgba(255,255,255,0.25)",
            }}
          />
          {open && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                {shop.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user.fullname || "User"}
              </Typography>
            </Box>
          )}
        </Box>

        <Tooltip title={open ? "Collapse" : "Expand"}>
          <IconButton onClick={() => onToggleSidebar(!open)} sx={{ color: "white" }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      <List sx={{ flexGrow: 1 }}>
        {nav.map((n) => (
          <ListItem key={n.to} disablePadding>
            <ListItemButton
              selected={pathname === n.to}
              onClick={() => {
                navigate(n.to);
                if (window.innerWidth <= 768) onToggleSidebar(false);
              }}
              sx={{
                py: 1.3,
                justifyContent: open ? "flex-start" : "center",
                transition: "all 0.2s ease",
                "&.Mui-selected": {
                  bgcolor: "rgba(255,255,255,0.2)",
                  borderRadius: 1,
                  mx: 1,
                },
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: open ? 40 : "auto" }}>
                {n.icon}
              </ListItemIcon>
              {open && <ListItemText primary={n.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            sx={{
              py: 1.3,
              justifyContent: open ? "flex-start" : "center",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: open ? 36 : "auto" }}>
              <LogoutIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Logout" />}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
}

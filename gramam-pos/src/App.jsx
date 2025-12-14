import React, { useMemo, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import WorkerForm from "./pages/WorkerForm";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { buildTheme } from "./mui/theme";
import { loadUI, saveUI } from "./utils/storage";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Workers from "./pages/Workers";
import Reports from "./pages/Reports";
import BarcodePrint from "./pages/BarcodePrint";
import AddProduct from "./pages/AddProduct";

// --------------------
// ACCESS DENIED PAGE
// --------------------
function AccessDenied() {
  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Typography variant="h4" color="error" sx={{ fontWeight: "bold" }}>
        Access Denied
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
        You don’t have permission to view this page.
      </Typography>
    </Box>
  );
}

// --------------------
// PROTECTED ROUTE WRAPPER
// --------------------
function ProtectedRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.warn("Invalid user cache", e);
      }
    }
  }, []);

  // still loading user info (avoid early redirect)
  if (user === null) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
        }}
      >
        <Typography>Loading session...</Typography>
      </Box>
    );
  }

  if (!user?.role) return <Navigate to="/login" replace />;

  const role = user.role?.toLowerCase();
  const normalizedRole = role === "staff" ? "worker" : role;

  if (!allowedRoles.includes(normalizedRole)) {
    return <AccessDenied />;
  }

  return children;
}

// --------------------
// MAIN LAYOUT
// --------------------
function Layout() {
  const location = useLocation();
  const hideUI = location.pathname === "/login";
  const isMobile = useMediaQuery("(max-width: 768px)");

  const saved = loadUI();
  const [ui, setUi] = useState(saved);
  const theme = useMemo(() => buildTheme(ui), [ui]);


  // Sidebar open logic
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const setAndSaveUI = (next) => {
    setUi(next);
    saveUI(next);
  };

  // Sync sidebar when screen size changes
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* NAVBAR + SIDEBAR */}
      {!hideUI && (
        <>
          <Navbar
  open={sidebarOpen}
  onToggleSidebar={setSidebarOpen}
  ui={ui}
  setUi={setAndSaveUI}
/>

         <Sidebar
  open={sidebarOpen}
  onToggleSidebar={setSidebarOpen}
  onThemePick={(color) => setAndSaveUI({ ...ui, primary: color })}
/>

        </>
      )}

      {/* MAIN CONTENT AREA */}
      <Box
        component="main"
        sx={{
          mt: hideUI ? 0 : "80px",
          ml: hideUI
            ? 0
            : isMobile
            ? 0
            : sidebarOpen
            ? "240px"
            : "70px",
          p: hideUI ? 0 : 2,
          transition: "all .3s ease",
          minHeight: "100vh",
          bgcolor: theme.palette.background.default,
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* ADMIN ONLY */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Workers />
              </ProtectedRoute>
            }
          />
          {/* ADD WORKER */}
<Route
  path="/workers/manage"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <WorkerForm />
    </ProtectedRoute>
  }
/>

{/* EDIT WORKER */}
<Route
  path="/workers/manage/:username"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <WorkerForm />
    </ProtectedRoute>
  }
/>

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* ✅ ADMIN + WORKER ACCESS */}
          <Route
            path="/add-product"
            element={
              <ProtectedRoute allowedRoles={["admin", "worker"]}>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-product/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "worker"]}>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={["admin", "worker"]}>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={["admin", "worker"]}>
                <Sales />
              </ProtectedRoute>
            }
          />
          <Route
            path="/barcode-print"
            element={
              <ProtectedRoute allowedRoles={["admin", "worker"]}>
                <BarcodePrint />
              </ProtectedRoute>
            }
          />
          <Route
  path="/register"
  element={<Register onThemePick={(color) => setAndSaveUI({ ...ui, primary: color })} />}
/>

        </Routes>
      </Box>
    </ThemeProvider>
  );
}

// --------------------
// APP WRAPPER
// --------------------
export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

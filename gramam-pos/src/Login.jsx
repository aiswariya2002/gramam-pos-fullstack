import { useState, useEffect, useRef } from "react";
import { Box, Card, TextField, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";

export default function Login() {
  const userRef = useRef(null);
  const passRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===========================================
  // AUTO-REDIRECT IF ALREADY LOGGED IN (ONLINE OR OFFLINE)
  // ===========================================
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      const user = JSON.parse(saved);
      window.location.href = user.role === "admin" ? "/dashboard" : "/sales";
    }
  }, []);

  // ===========================================
  // SUBMIT LOGIN HANDLER
  // ===========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    // -------------------------
    // OFFLINE LOGIN MODE
    // -------------------------
    if (!navigator.onLine) {
      const cached = localStorage.getItem("user");
      if (!cached) {
        setError("Offline login unavailable. Please login online once first.");
        setLoading(false);
        return;
      }

      try {
        const user = JSON.parse(cached);
        if (username === user.username && password === user.password) {
          window.location.href = user.role === "admin" ? "/dashboard" : "/sales";
        } else {
          setError("Incorrect offline username or password.");
        }
      } catch {
        setError("Corrupted local session. Please login online once.");
      }

      setLoading(false);
      return;
    }

    // -------------------------
    // ONLINE LOGIN MODE
    // -------------------------
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // ✅ Dynamic base URL: works for both local + mobile + hosted
      const baseUrl = window.location.origin; // e.g. http://10.237.54.70:5000
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Invalid credentials");

      const role = data.user.role?.toLowerCase() || "worker";

      // ✅ store locally for future offline login
      localStorage.setItem(
        "user",
        JSON.stringify({
          fullname: data.user.fullname,
          username: data.user.username,
          role,
          password, // stored plain for offline match
        })
      );

      // redirect based on role
      window.location.href = role === "admin" ? "/dashboard" : "/sales";
    } catch (err) {
      console.error("Login error:", err);
      if (err.name === "AbortError") {
        setError("Server timeout — please try again.");
      } else if (err.message?.includes("Failed to fetch")) {
        setError("Server unreachable. Check Wi-Fi or backend connection.");
      } else {
        setError(err.message || "Invalid credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // UI
  // ===========================================
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        backgroundImage: `url('/assets/bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Dark overlay */}
      <Box sx={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />

      <Card
        component={motion.form}
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        sx={{
          width: "90%",
          maxWidth: 350,
          p: 4,
          borderRadius: 4,
          backdropFilter: "blur(20px)",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          zIndex: 5,
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <img
            src="/assets/icon.png"
            alt="logo"
            style={{
              width: 90,
              height: 90,
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))",
            }}
          />
        </Box>

        {error && (
          <Typography
            sx={{
              color: "#ffb3b3",
              mb: 2,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {error}
          </Typography>
        )}

        {/* Username */}
        <TextField
          inputRef={userRef}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          fullWidth
          autoFocus
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
              background: "rgba(255,255,255,0.2)",
            },
            "& input": { color: "white" },
            "& fieldset": { border: "1px solid rgba(255,255,255,0.3)" },
          }}
        />

        {/* Password */}
        <TextField
          type="password"
          inputRef={passRef}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          fullWidth
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
              background: "rgba(255,255,255,0.2)",
            },
            "& input": { color: "white" },
            "& fieldset": { border: "1px solid rgba(255,255,255,0.3)" },
          }}
        />

        {/* Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{
            mt: 1,
            py: 1.2,
            borderRadius: "20px",
            background: "linear-gradient(90deg,#ffd84a,#ffb800)",
            fontWeight: "bold",
            color: "black",
          }}
        >
          {loading ? "Checking..." : "Login"}
        </Button>

        {/* Offline hint */}
        {!navigator.onLine && (
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              mt: 2,
              color: "#ffe599",
              fontSize: "0.85rem",
            }}
          >
            Offline mode — cached login only
          </Typography>
        )}
      </Card>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { safeFetch } from "../utils/apiBase";

export default function Register({ onThemePick }) {
  const navigate = useNavigate();

  const [shop, setShop] = useState({
    name: "",
    license: "",
    logo: "",
    upi_qr: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [qrFile, setQRFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("/assets/logo.png");
  const [qrPreview, setQRPreview] = useState("/assets/upi-placeholder.png");

  const [themeColor, setThemeColor] = useState(
    localStorage.getItem("theme_color") || "#2196f3"
  );
  const [themeType, setThemeType] = useState(
    themeColor.includes("linear-gradient") ? "gradient" : "solid"
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await safeFetch("/api/shop", { method: "GET" });
        const text = await res.text();
        if (text.startsWith("<!DOCTYPE")) throw new Error("Invalid response");
        const data = JSON.parse(text);
        if (data?.success && data.shop) {
          const s = data.shop;
          setShop(s);
          setLogoPreview(s.logo || "/assets/logo.png");
          setQRPreview(s.upi_qr || "/assets/upi-placeholder.png");
          localStorage.setItem("shop_info", JSON.stringify(s));
        }
      } catch {
        const local = localStorage.getItem("shop_info");
        if (local) {
          const s = JSON.parse(local);
          setShop(s);
          setLogoPreview(s.logo || "/assets/logo.png");
          setQRPreview(s.upi_qr || "/assets/upi-placeholder.png");
        }
      }
      setLoading(false);
    })();
  }, []);

  const onFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "logo") {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setQRFile(file);
      setQRPreview(URL.createObjectURL(file));
    }
  };

  const saveShop = async () => {
    if (!shop.name.trim()) return alert("❗ Shop Name is required");
    setSaving(true);

    const fd = new FormData();
    fd.append("name", shop.name);
    fd.append("license", shop.license || "");
    fd.append("oldLogo", shop.logo || "");
    fd.append("oldQR", shop.upi_qr || "");
    if (logoFile) fd.append("logo", logoFile);
    if (qrFile) fd.append("upi_qr", qrFile);

    try {
      const res = await safeFetch("/api/shop", { method: "POST", body: fd });
      const text = await res.text();
      if (text.startsWith("<!DOCTYPE")) throw new Error("Invalid JSON");
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.message || "Save failed");

      const s = data.shop;
      setShop(s);
      localStorage.setItem("shop_info", JSON.stringify(s));
      localStorage.setItem("theme_color", themeColor);
      if (onThemePick) onThemePick(themeColor);
      alert("✅ Shop and theme saved!");
    } catch (err) {
      console.error("❌ Save failed:", err);
      localStorage.setItem("shop_info", JSON.stringify(shop));
      localStorage.setItem("theme_color", themeColor);
      if (onThemePick) onThemePick(themeColor);
      alert("⚠️ Saved locally (offline mode)");
    }
    setSaving(false);
  };

  const handleThemeChange = (color) => {
    setThemeColor(color);
    localStorage.setItem("theme_color", color);
    if (onThemePick) onThemePick(color);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 3, md: 5 },
        py: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: (t) => (t.palette.mode === "dark" ? "#0e1015" : "#f4f7fb"),
        backgroundImage: (t) =>
          t.palette.mode === "dark"
            ? "linear-gradient(135deg, #0e1015, #1a1f28)"
            : "linear-gradient(135deg, #ffffff, #f2f6ff)",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={900}
        textAlign="center"
        color="primary"
        sx={{ mb: 1 }}
      >
        🏪 Shop Registration
      </Typography>
      <Typography
        variant="body2"
        textAlign="center"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 420 }}
      >
        Manage your shop details, upload your logo & QR, and choose your preferred theme.
      </Typography>

      {loading ? (
        <CircularProgress color="primary" />
      ) : (
        <Box
          sx={{
            width: "100%",
            maxWidth: 650,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Uploads Row */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="center"
            alignItems="center"
            spacing={4}
          >
            {/* Logo Upload */}
            <Stack alignItems="center" spacing={1}>
              <Avatar
                src={logoPreview}
                variant="rounded"
                sx={{
                  width: 110,
                  height: 110,
                  borderRadius: 4,
                  border: "2px solid",
                  borderColor: "primary.main",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                }}
              />
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                {logoFile ? "Change Logo" : "Upload Logo"}
                <input hidden type="file" accept="image/*" onChange={(e) => onFileChange(e, "logo")} />
              </Button>
            </Stack>

            {/* QR Upload */}
            <Stack alignItems="center" spacing={1}>
              <Avatar
                src={qrPreview}
                variant="rounded"
                sx={{
                  width: 110,
                  height: 110,
                  borderRadius: 4,
                  border: "2px solid",
                  borderColor: "primary.main",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                }}
              />
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                {qrFile ? "Change QR" : "Upload UPI QR"}
                <input hidden type="file" accept="image/*" onChange={(e) => onFileChange(e, "qr")} />
              </Button>
            </Stack>
          </Stack>

          {/* Form Fields */}
          <Stack spacing={2}>
            <TextField
              label="Shop Name *"
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="License Number (optional)"
              value={shop.license}
              onChange={(e) => setShop({ ...shop, license: e.target.value })}
              fullWidth
            />
          </Stack>

          {/* Theme Section */}
          <Divider />
          <Typography variant="subtitle1" fontWeight={700}>
            🎨 Theme Customization
          </Typography>

          <ToggleButtonGroup
            color="primary"
            value={themeType}
            exclusive
            onChange={(e, val) => val && setThemeType(val)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="solid">Solid</ToggleButton>
            <ToggleButton value="gradient">Gradient</ToggleButton>
          </ToggleButtonGroup>

          {themeType === "solid" ? (
            <input
              type="color"
              value={themeColor.includes("linear-gradient") ? "#2196f3" : themeColor}
              onChange={(e) => handleThemeChange(e.target.value)}
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
              }}
            />
          ) : (
            <Stack direction="row" spacing={2} alignItems="center">
              <input
                type="color"
                id="gradColor1"
                defaultValue="#00C9FF"
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 10,
                  border: "none",
                }}
              />
              <input
                type="color"
                id="gradColor2"
                defaultValue="#92FE9D"
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 10,
                  border: "none",
                }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  const c1 = document.getElementById("gradColor1").value;
                  const c2 = document.getElementById("gradColor2").value;
                  const gradient = `linear-gradient(135deg,${c1},${c2})`;
                  handleThemeChange(gradient);
                }}
              >
                Apply
              </Button>
            </Stack>
          )}

          <Box
            sx={{
              mt: 2,
              height: 50,
              borderRadius: 2,
              background: themeColor,
              boxShadow: "0 0 10px rgba(0,0,0,0.15)",
            }}
          />

          {/* Buttons */}
          <Divider />
          <Stack direction="row" spacing={2} mt={1}>
            <Button
              variant="contained"
              fullWidth
              onClick={saveShop}
              disabled={saving}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ArrowBackIcon />}
              sx={{ borderRadius: 2, fontWeight: 600 }}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

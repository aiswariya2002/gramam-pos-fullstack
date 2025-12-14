// ✅ AddProduct — Full Secure Version (HTTPS Safe + Auto Fallback + Polished UI)

import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
  Divider,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// ✅ Utility: Parse Product ID from URL
export function parseIdFromUrl(
  href = typeof window !== "undefined" ? window.location.href : ""
) {
  try {
    const url = new URL(href, "http://dummy");
    const qid = url.searchParams.get("id");
    if (qid) return qid;
    const m = url.pathname.match(/\/edit-product\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

export default function AddProduct({ productId, onDone }) {
  const id = productId ?? parseIdFromUrl();
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:600px)");

  // ✅ Always match frontend protocol (HTTP/HTTPS)
  const { protocol, hostname } = window.location;
  const API =
    protocol === "https:"
      ? `https://${hostname}:5443`
      : `http://${hostname}:5000`;

  const DEFAULT_IMG = `${API}/uploads/default.png`;

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(DEFAULT_IMG);
  const [categories, setCategories] = useState([]);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [form, setForm] = useState({
    name: "",
    qty: "",
    stock: 0,
    unit: "",
    category: "",
    price: 0,
    image: DEFAULT_IMG,
    barcode: "",
  });

  const showMessage = (msg, type = "info") =>
    setSnack({ open: true, message: msg, severity: type });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  // ✅ Safe image resolver
  const resolveImage = (img) => {
    if (!img) return DEFAULT_IMG;
    let i = String(img).trim();
    if (i.startsWith("http")) return i.replace("localhost", hostname);
    if (i.startsWith("/uploads/")) return `${API}${i}`;
    return `${API}/uploads/${i}`;
  };

  useEffect(() => {
    if (id) loadProduct();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API}/api/product/category`);
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      console.error("❌ Category load failed:", err);
      showMessage("Failed to load categories ❌", "error");
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/product/${id}`);
      const data = await res.json();
      setForm({
        name: data.name || "",
        qty: data.qty || "",
        stock: data.stock || 0,
        unit: data.unit || "",
        category: data.category || "",
        price: data.price || 0,
        image: data.image || DEFAULT_IMG,
        barcode: data.barcode || "",
      });
      setPreview(resolveImage(data.image));
    } catch (err) {
      console.error("❌ Load product failed:", err);
      showMessage("Failed to load product ❌", "error");
    }
    setLoading(false);
  };

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const goBack = () => {
    if (typeof onDone === "function") return onDone();
    if (window.history && window.history.length > 1) return window.history.back();
    window.location.href = "/products";
  };

  const goProducts = () => {
    if (typeof onDone === "function") return onDone("products");
    window.location.assign("/products");
  };

  const save = async () => {
    const fd = new FormData();
    Object.keys(form).forEach((key) => fd.append(key, form[key]));

    if (selectedFile) {
      fd.append("image", selectedFile);
    } else {
      fd.append("oldImage", form.image || DEFAULT_IMG);
    }

    const url = id ? `${API}/api/product/${id}` : `${API}/api/product`;
    const method = id ? "PUT" : "POST";

    setLoading(true);
    try {
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save product");
      showMessage(
        id ? "✅ Product updated successfully" : "✅ Product added successfully",
        "success"
      );
      goProducts();
    } catch (err) {
      console.error("❌ Save failed:", err);
      showMessage("❌ Failed to save product", "error");
    }
    setLoading(false);
  };

  const roundedField = {
    "& label": { color: "primary.main", fontWeight: 600 },
    "& .MuiOutlinedInput-root": {
      borderRadius: "50px",
      boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
      "& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
      "&:hover fieldset": { borderColor: "primary.main" },
      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
        boxShadow: "0 0 10px rgba(25,118,210,0.4)",
      },
      "& input": { padding: "10px 18px" },
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        background: theme.palette.mode === "dark"
          ? "linear-gradient(135deg,#0b0b0b,#1a1a1a)"
          : "linear-gradient(135deg,#f7faff,#ffffff)",
        p: isMobile ? 2 : 3,
        pt: 8,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 4,
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      {/* ✅ LEFT: IMAGE SECTION */}
      <Box
        sx={{
          width: { xs: "100%", md: 320 },
          textAlign: "center",
        }}
      >
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <IconButton onClick={goBack} color="primary" size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {id ? "Edit Product" : "Add Product"}
          </Typography>
        </Stack>

        <Avatar
          src={preview}
          variant="rounded"
          onError={(e) => (e.target.src = DEFAULT_IMG)} // ✅ fallback
          sx={{
            width: 200,
            height: 200,
            mx: "auto",
            mb: 1.5,
            borderRadius: 4,
            border: (theme) => `2px solid ${theme.palette.primary.main}33`,
            boxShadow: (theme) => `0 0 20px ${theme.palette.primary.main}33`,
          }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          {selectedFile
            ? "🖼️ New image selected"
            : form.image && form.image !== DEFAULT_IMG
            ? "Using existing image"
            : "Default image"}
        </Typography>

        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          sx={{ borderRadius: 3, px: 2, fontWeight: 700 }}
        >
          {selectedFile ? "Change Image" : "Upload Image"}
          <input hidden type="file" accept="image/*" onChange={onFile} />
        </Button>
      </Box>

      {/* ✅ RIGHT: FORM SECTION */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gap: 2,
          alignItems: "center",
        }}
      >
        <TextField
          label="Product Name"
          placeholder="e.g., Apple Juice"
          fullWidth
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          sx={roundedField}
        />
        <TextField
          label="Quantity Type"
          placeholder="e.g., 500ml Bottle"
          fullWidth
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
          sx={roundedField}
        />
        <TextField
          label="Stock"
          type="number"
          placeholder="e.g., 120"
          fullWidth
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          sx={roundedField}
        />
        <TextField
          label="Unit"
          placeholder="e.g., pieces, kg, liter"
          fullWidth
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          sx={roundedField}
        />
        <Autocomplete
          freeSolo
          options={categories.map((c) => (typeof c === "string" ? c : c.name))}
          value={form.category || ""}
          onChange={(e, newValue) => setForm({ ...form, category: newValue || "" })}
          onInputChange={(e, val) => setForm({ ...form, category: val })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Category"
              placeholder="e.g., Beverages"
              fullWidth
              sx={roundedField}
            />
          )}
        />
        <TextField
          label="Price"
          placeholder="e.g., 49.99"
          type="number"
          fullWidth
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          sx={roundedField}
        />
        <TextField
          label="Barcode (optional)"
          placeholder="e.g., 8901234567890"
          fullWidth
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          sx={roundedField}
        />

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" spacing={2} sx={{ mt: -1 }}>
          <Button
            variant="contained"
            onClick={save}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              flex: 1,
              borderRadius: 3,
              fontWeight: 700,
              py: 1,
            }}
          >
            {id ? "Update Product" : "Save Product"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={goProducts}
            sx={{
              flex: 1,
              borderRadius: 3,
              fontWeight: 700,
              py: 1,
            }}
          >
            Cancel
          </Button>
        </Stack>
      </Box>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnack}
          severity={snack.severity}
          sx={{ borderRadius: 2.5, fontWeight: 600 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

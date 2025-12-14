// ✅ WorkerForm — Personal + KYC Sections (2025 Polished Edition)
import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Stack,
  Grid,
  CircularProgress,
  MenuItem,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../utils/apiBase";

const API = API_BASE;

export default function WorkerForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const usernameToEdit = params.get("user");
  const isEdit = Boolean(usernameToEdit);

  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:600px)");

  const [form, setForm] = useState({
    fullname: "",
    username: "",
    password: "",
    role: "staff",
    phone: "",
    email: "",
    address: "",
    aadhar_no: "",
    bank_name: "",
    account_no: "",
    ifsc_code: "",
  });

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [loading, setLoading] = useState(false);

  const showMessage = (msg, severity = "info") =>
    setSnack({ open: true, message: msg, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/auth/all`);
        const data = await res.json();
        if (data?.success) {
          const user = data.users.find((u) => u.username === usernameToEdit);
          if (user) setForm({ ...user, password: "" });
        }
      } catch (err) {
        console.error("❌ Load worker failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [usernameToEdit]);

  const handleSave = async () => {
    if (!form.fullname || !form.username || (!isEdit && !form.password)) {
      return showMessage("⚠️ Please fill required fields", "warning");
    }
    try {
      setLoading(true);
      const url = isEdit
        ? `${API}/api/auth/update/${usernameToEdit}`
        : `${API}/api/auth/register`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data?.success) {
        showMessage(isEdit ? "✅ Worker updated" : "✅ Worker added", "success");
        setTimeout(() => navigate("/workers"), 700);
      } else throw new Error(data?.message || "Save failed");
    } catch (err) {
      console.error("❌ Save failed", err);
      showMessage("❌ Save failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const roundedField = {
    "& label": { color: "primary.main", fontWeight: 600 },
    "& .MuiOutlinedInput-root": {
      borderRadius: "50px",
      boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
      "& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
      "&:hover fieldset": { borderColor: "primary.main" },
      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
        boxShadow: "0 0 8px rgba(25,118,210,0.4)",
      },
      "& input": { padding: "10px 18px" },
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg,#0b0b0b,#1a1a1a)"
            : "linear-gradient(135deg,#f7faff,#ffffff)",
        p: isMobile ? 2 : 3,
        pt: 8,
      }}
    >
      {/* 🔹 Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate("/workers")} color="primary" size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={800} color="primary.main">
          {isEdit ? "Edit Worker" : "Add Worker"}
        </Typography>
      </Stack>

      {/* 🔹 Form Container */}
      <Box
        sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 3,
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          backgroundColor: theme.palette.background.paper,
          display: "grid",
          gap: 4,
        }}
      >
        {/* ---------------- PERSONAL DETAILS ---------------- */}
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
            👤 Personal Details
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Full Name"
                fullWidth
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Username"
                fullWidth
                value={form.username}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText={isEdit ? "Leave blank to keep current password" : ""}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Role"
                fullWidth
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                sx={roundedField}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                minRows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                sx={roundedField}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ---------------- KYC DETAILS ---------------- */}
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
            🏦 KYC & Bank Details
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Aadhar Number"
                fullWidth
                value={form.aadhar_no}
                onChange={(e) => setForm({ ...form, aadhar_no: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Bank Name"
                fullWidth
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Account Number"
                fullWidth
                value={form.account_no}
                onChange={(e) => setForm({ ...form, account_no: e.target.value })}
                sx={roundedField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="IFSC Code"
                fullWidth
                value={form.ifsc_code}
                onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                sx={roundedField}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ---------------- ACTION BUTTONS ---------------- */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="error"
            onClick={() => navigate("/workers")}
            sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
          >
            {isEdit ? "Update Worker" : "Save Worker"}
          </Button>
        </Stack>
      </Box>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
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

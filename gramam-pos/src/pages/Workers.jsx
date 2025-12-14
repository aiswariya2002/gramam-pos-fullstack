// src/pages/Workers.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Snackbar,
  Alert,
  Paper,
  Divider,
  Drawer,
  Fade,
  Grid,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { openDB } from "../utils/offlineDB";
import { API_BASE } from "../utils/apiBase";
import { useNavigate } from "react-router-dom";

const API = API_BASE;

const roleColor = (role) =>
  role?.toLowerCase() === "admin"
    ? "error"
    : role?.toLowerCase() === "staff"
    ? "primary"
    : "secondary";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

export default function Workers() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width: 700px)");

  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [selected, setSelected] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(null);

  // ==================== IndexedDB ====================
  async function getOfflineUsers() {
    try {
      const db = await openDB();
      const tx = db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      return await new Promise((res) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
    } catch {
      return [];
    }
  }

  async function syncWorkersToOffline(list) {
    try {
      const db = await openDB();
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      store.clear();
      list.forEach((u) => store.put(u));
    } catch {}
  }

  // ==================== Load ====================
  const load = async () => {
    if (!navigator.onLine) {
      const local = await getOfflineUsers();
      setAll(local);
      setSnack({ open: true, msg: "Offline mode: showing cached workers", severity: "info" });
      return;
    }

    try {
      const res = await fetch(`${API}/api/auth/all`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.users)) {
        setAll(data.users);
        syncWorkersToOffline(data.users);
      }
    } catch {
      const local = await getOfflineUsers();
      setAll(local);
      setSnack({
        open: true,
        msg: "Showing cached workers (server unreachable)",
        severity: "warning",
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ==================== Delete ====================
  const handleDelete = async (username) => {
    setLoadingDelete(username);
    try {
      const res = await fetch(`${API}/api/auth/delete/${username}`, { method: "DELETE" });
      const data = await res.json();

      if (data?.success) {
        setAll((prev) => prev.filter((u) => u.username !== username));
        setSnack({
          open: true,
          msg: "Worker deleted successfully",
          severity: "success",
        });
      } else {
        setSnack({
          open: true,
          msg: "Failed to delete worker",
          severity: "error",
        });
      }
    } catch {
      setSnack({
        open: true,
        msg: "Network error while deleting",
        severity: "error",
      });
    } finally {
      setLoadingDelete(null);
    }
  };

  // ==================== Filters ====================
  const list = useMemo(() => {
    const text = q.toLowerCase();
    return all
      .filter((u) =>
        roleFilter === "All" ? true : (u.role || "").toLowerCase() === roleFilter.toLowerCase()
      )
      .filter((u) =>
        !text
          ? true
          : [u.fullname, u.username, u.phone, u.email].some((v) =>
              String(v || "").toLowerCase().includes(text)
            )
      );
  }, [all, q, roleFilter]);

  const total = all.length;
  const admins = all.filter((u) => u.role === "admin").length;
  const staff = all.filter((u) => u.role === "staff").length;

  // ==================== Drawer ====================
  const openDetails = (user) => {
    setSelected(user);
    setOpenDrawer(true);
  };
  const closeDetails = () => {
    setOpenDrawer(false);
    setTimeout(() => setSelected(null), 200);
  };

  // ==================== Grid Card ====================
  const WorkerCard = ({ user, i }) => (
    <Fade in timeout={300 + i * 50}>
      <Paper
        elevation={4}
        sx={{
          borderRadius: 4,
          p: 3,
          height: "100%",
          transition: "0.25s ease",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {/* Top section */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              fontSize: 20,
              bgcolor:
                user.role === "admin"
                  ? theme.palette.error.light
                  : theme.palette.primary.light,
            }}
          >
            {initials(user.fullname)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {user.fullname}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              @{user.username}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={roleColor(user.role)}
            label={user.role?.toUpperCase() || "UNKNOWN"}
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Divider />

        {/* Info section */}
        <Stack spacing={0.8}>
          <Typography variant="body2">📞 {user.phone || "-"}</Typography>
          <Typography variant="body2">✉️ {user.email || "Not provided"}</Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        {/* Actions */}
        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
          <Tooltip title="View Details">
            <IconButton size="small" color="info" onClick={() => openDetails(user)}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/workers/manage?user=${user.username}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(user.username)}
                disabled={loadingDelete === user.username}
              >
                {loadingDelete === user.username ? (
                  <CircularProgress size={18} />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>
    </Fade>
  );

  // ==================== UI ====================
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
      >
        <Typography variant="h5" fontWeight={700} color="primary.main">
          Team Members
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            size="small"
            placeholder="Search by name or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 240 } }}
          />

          <TextField
            select
            size="small"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ width: { xs: "100%", sm: 140 } }}
          >
            {["All", "admin", "staff"].map((r) => (
              <MenuItem key={r} value={r}>
                {r.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/workers/manage")}
            sx={{
              borderRadius: 3,
              px: 2,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Add Member
          </Button>
        </Stack>
      </Stack>

      {/* SUMMARY */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Chip label={`Total: ${total}`} />
          <Chip color="error" label={`Admins: ${admins}`} />
          <Chip color="primary" label={`Staff: ${staff}`} />
        </Stack>
      </Paper>

      {/* GRID VIEW */}
      <Grid container spacing={2}>
        {list.length ? (
          list.map((u, i) => (
            <Grid key={i} item xs={12} sm={6} md={4} lg={3}>
              <WorkerCard user={u} i={i} />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography align="center" sx={{ p: 3 }}>
              No workers found
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* SIDEBAR DRAWER */}
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={closeDetails}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 380 },
            p: 3,
            background: theme.palette.mode === "dark"
              ? "linear-gradient(135deg,#1b1b1b,#232323)"
              : "linear-gradient(135deg,#ffffff,#f8f9ff)",
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            Member Details
          </Typography>
          <IconButton onClick={closeDetails}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {selected ? (
          <Fade in={openDrawer}>
            <Box sx={{ mt: 3 }}>
              <Stack alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: 28,
                    bgcolor: theme.palette.primary.light,
                    color: theme.palette.primary.dark,
                    boxShadow: 2,
                  }}
                >
                  {initials(selected.fullname)}
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  {selected.fullname}
                </Typography>
                <Chip
                  color={roleColor(selected.role)}
                  label={selected.role?.toUpperCase()}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Typography><strong>Username:</strong> @{selected.username}</Typography>
                <Typography><strong>Phone:</strong> {selected.phone || "-"}</Typography>
                <Typography><strong>Email:</strong> {selected.email || "Not provided"}</Typography>
                <Typography><strong>Role:</strong> {selected.role}</Typography>
                <Typography><strong>Status:</strong> Active</Typography>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate(`/workers/manage?user=${selected.username}`)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  textTransform: "none",
                }}
              >
                Edit Member
              </Button>
            </Box>
          </Fade>
        ) : (
          <Typography sx={{ mt: 4, textAlign: "center" }}>No details available</Typography>
        )}
      </Drawer>

      {/* SNACKBAR */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          sx={{ borderRadius: 2, px: 2, fontWeight: 500 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// src/pages/Products.jsx — Luxe POS Ultimate Responsive Edition (3-per-row mobile grid + mobile list cards)
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Avatar,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Chip,
  Drawer,
  Divider,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  Breadcrumbs,
} from "@mui/material";
import { FiGrid, FiList, FiSearch, FiTag } from "react-icons/fi";
import AddIcon from "@mui/icons-material/Add";
import RestoreIcon from "@mui/icons-material/Autorenew";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useNavigate } from "react-router-dom";
import { loadProductsOfflineSafe } from "../hooks/useOfflineProducts";
import { safeFetch } from "../utils/apiBase";

// ---------- Shared loader ----------
export async function fetchProductsShared() {
  try {
    const res = await safeFetch("/api/product", { method: "GET" });
    const data = await res.json();
    const list = (data || []).map((p) => ({ ...p, status: p.status || "active" }));
    await loadProductsOfflineSafe();
    return list;
  } catch (err) {
    console.error("Products load failed:", err);
    return [];
  }
}

export default function Products() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [catDrawer, setCatDrawer] = useState(false);

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const [viewProduct, setViewProduct] = useState(null);

  const shopInfo = JSON.parse(localStorage.getItem("shop_info") || "{}");
  const DEFAULT_IMG = shopInfo.logo || "/assets/logo.png";

  const API_BASE =
    safeFetch.API_BASE || `${window.location.protocol}//${window.location.host}`;

  // ---------- robust image resolver ----------
  const safeImage = (p) => {
    if (!p?.image) return DEFAULT_IMG;
    let img = String(p.image).trim();

    if (img.startsWith("http://localhost") || img.startsWith("https://localhost")) {
      try {
        const u = new URL(img);
        return `${window.location.protocol}//${window.location.host}${u.pathname}`;
      } catch {
        /* fallthrough */
      }
    }
    if (/^https?:\/\//i.test(img)) return img;
    if (img.startsWith("/uploads/")) return `${API_BASE}${img}`;
    if (img.startsWith("uploads/")) return `${API_BASE}/${img}`;
    if (img.includes("uploads")) return `${API_BASE}/${img.replace(/^\/+/, "")}`;
    return DEFAULT_IMG;
  };

  const imgError = (e) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.src = DEFAULT_IMG;
      e.currentTarget.dataset.fallback = "true";
    }
  };

  // ---------- load data ----------
  useEffect(() => {
    (async () => {
      setProducts(await fetchProductsShared());
      await loadCategories();
    })();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await safeFetch("/api/product/category", { method: "GET" });
      const data = await res.json();
      const list =
        Array.isArray(data) &&
        data.map((c) => ({
          category: c.category || c.name || c.Category || c.title || "Unnamed",
        }));
      setCategories(list || []);
    } catch (err) {
      console.error("❌ Category load failed:", err);
    }
  };

  const softDelete = async (id) => {
    try {
      await safeFetch(`/api/product/delete/${id}`, { method: "PUT" });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "deleted" } : p)));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const restore = async (id) => {
    try {
      await safeFetch(`/api/product/restore/${id}`, { method: "PUT" });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "active" } : p)));
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  // ---------- derived counts ----------
  const statusCounts = useMemo(() => {
    const all = products.length;
    const active = products.filter((p) => p.status === "active").length;
    const deleted = products.filter((p) => p.status === "deleted").length;
    return { all, active, deleted };
  }, [products]);

  // ---------- filter ----------
  const filtered = products.filter((p) => {
    const s = (p.name || "").toLowerCase().includes(search.toLowerCase());
    const statusMatch =
      filterStatus === "All" ||
      (filterStatus === "Active" && p.status === "active") ||
      (filterStatus === "Deleted" && p.status === "deleted");
    const catMatch = selectedCategory === "All" || p.category === selectedCategory;
    return s && statusMatch && catMatch;
  });

  // ---------- design constants ----------
  const DESK_CARD_W = 98;   // desktop fixed card width
  const CARD_H = 160;
  const IMG_H = 68;

  // ---------- product card (desktop & mobile) ----------
  const ProductCard = ({ p }) => (
    <Paper
      key={p.id}
      sx={{
        position: "relative",
        width: isMobile ? "100%" : DESK_CARD_W,
        height: CARD_H,
        p: 0.9,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "center",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))"
            : "linear-gradient(180deg,#ffffff,#f6f9ff)",
        border: "1px solid",
        borderColor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px ${theme.palette.primary.main}22`,
        backdropFilter: "blur(6px)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 14px 36px ${theme.palette.primary.main}40`,
          borderColor: theme.palette.primary.main + "55",
        },
      }}
    >
      {p.status === "deleted" && (
        <Chip
          label="DELETED"
          color="error"
          size="small"
          sx={{ position: "absolute", top: 6, left: 6, fontSize: 9, height: 18 }}
        />
      )}

      <Box
        sx={{
          width: "100%",
          height: IMG_H,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: theme.palette.mode === "dark" ? "#1f1f1f" : "#eef3ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: `1px solid ${theme.palette.primary.main}22`,
        }}
      >
        <img
          src={safeImage(p)}
          alt={p.name}
          onError={imgError}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Box>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 11.5,
          mt: 0.5,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: 0.2,
        }}
        title={p.name}
      >
        {p.name}
      </Typography>

      <Stack spacing={0} alignItems="center" sx={{ lineHeight: 1.1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
          ₹{Number(p.price || 0).toFixed(2)} • {p.qty}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: 10.5,
            color: p.stock < 10 ? "#ffb300" : "#2e7d32",
            fontWeight: 700,
          }}
        >
          Stock: {p.stock}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.4} justifyContent="center" sx={{ mt: 0.2 }}>
        <Tooltip title="View details">
          <IconButton
            size="small"
            sx={{ p: 0.4, color: "#0288d1" }}
            onClick={() => setViewProduct(p)}
          >
            <VisibilityIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            sx={{ p: 0.4, color: theme.palette.primary.main }}
            onClick={() => navigate(`/edit-product/${p.id}`)}
          >
            <EditIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        {p.status === "deleted" ? (
          <Tooltip title="Restore">
            <IconButton
              size="small"
              sx={{ p: 0.4, color: "#2e7d32" }}
              onClick={() => restore(p.id)}
            >
              <RestoreIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Soft delete">
            <IconButton
              size="small"
              sx={{ p: 0.4, color: "#c62828" }}
              onClick={() => softDelete(p.id)}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );

  // ---------- status chip ----------
  const StatusChip = ({ label, count, selected, onClick }) => (
    <Chip
      label={`${label} (${count})`}
      onClick={onClick}
      variant={selected ? "filled" : "outlined"}
      color={selected ? (label === "Deleted" ? "error" : "primary") : "default"}
      sx={{ borderRadius: 2, fontWeight: 700 }}
    />
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: isMobile ? 2 : 3,
        py: isMobile ? 2 : 3,
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(1200px 400px at 20% -10%, rgba(99,102,241,0.25), transparent), linear-gradient(180deg,#0b0b0c,#121316)"
            : "radial-gradient(1200px 400px at 20% -10%, rgba(99,102,241,0.10), transparent), linear-gradient(180deg,#f7f9ff,#ffffff)",
      }}
    >
      {/* ---------- Header ---------- */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 4,
          border: "1px solid",
          borderColor:
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: 1.5,
          backdropFilter: "blur(8px)",
        }}
      >
        <Stack spacing={0.5}>
          <Breadcrumbs separator="/" sx={{ fontSize: 12 }} />
          <Typography
            variant="h6"
            fontWeight={900}
            color="primary.main"
            sx={{ letterSpacing: 0.3 }}
          >
            Products
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Badge badgeContent={categories.length} color="primary" overlap="circular">
            <Button
              variant="outlined"
              startIcon={<FiTag />}
              onClick={() => setCatDrawer(true)}
              sx={{ borderRadius: 2 }}
            >
              Categories
            </Button>
          </Badge>

          <TextField
            size="small"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 240, "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
          />

          <Tooltip title="Filter by status">
            <IconButton onClick={(e) => setFilterAnchor(e.currentTarget)} color="primary">
              <FilterListIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
          >
            {["All", "Active", "Deleted"].map((status) => (
              <MenuItem
                key={status}
                selected={filterStatus === status}
                onClick={() => {
                  setFilterStatus(status);
                  setFilterAnchor(null);
                }}
              >
                {status}
              </MenuItem>
            ))}
          </Menu>

          <Tooltip title="Grid view">
            <IconButton
              color={view === "grid" ? "primary" : "default"}
              onClick={() => setView("grid")}
            >
              <FiGrid size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="List view">
            <IconButton
              color={view === "list" ? "primary" : "default"}
              onClick={() => setView("list")}
            >
              <FiList size={20} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/add-product")}
            sx={{ borderRadius: 3, textTransform: "none", fontWeight: 900, px: 2.2 }}
          >
            Add Product
          </Button>
        </Stack>
      </Paper>

      {/* ---------- Quick Filters ---------- */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <StatusChip
          label="All"
          count={statusCounts.all}
          selected={filterStatus === "All"}
          onClick={() => setFilterStatus("All")}
        />
        <StatusChip
          label="Active"
          count={statusCounts.active}
          selected={filterStatus === "Active"}
          onClick={() => setFilterStatus("Active")}
        />
        <StatusChip
          label="Deleted"
          count={statusCounts.deleted}
          selected={filterStatus === "Deleted"}
          onClick={() => setFilterStatus("Deleted")}
        />
        {selectedCategory !== "All" && (
          <Chip
            label={`Category: ${selectedCategory}`}
            onDelete={() => setSelectedCategory("All")}
            color="secondary"
            variant="outlined"
            sx={{ ml: 0.5, borderRadius: 2 }}
          />
        )}
      </Stack>

      {/* ---------- Grid View (mobile = 3 columns) ---------- */}
      {view === "grid" && (
        <Box
          sx={{
            display: "grid",
            // mobile: 3 equal columns; desktop: auto-fill fixed card width
            gridTemplateColumns: isMobile
              ? "repeat(3, minmax(0, 1fr))"
              : `repeat(auto-fill, ${DESK_CARD_W}px)`,
            gap: isMobile ? "10px" : "10px",
            alignItems: "start",
          }}
        >
          {/* Add Product Card */}
          <Paper
            onClick={() => navigate("/add-product")}
            sx={{
              width: isMobile ? "100%" : DESK_CARD_W,
              height: CARD_H,
              border: `1.5px dashed ${
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"
              }`,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              cursor: "pointer",
              transition: "all .16s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                borderColor: theme.palette.primary.main,
                boxShadow: `0 10px 28px ${theme.palette.primary.main}33`,
              },
            }}
          >
            <AddIcon color="primary" />
            <Typography variant="caption" color="primary">
              Add Product
            </Typography>
          </Paper>

          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </Box>
      )}

      {/* ---------- List View ----------
          Desktop: table
          Mobile: card list (more readable) */}
      {view === "list" && (
        <>
          {!isMobile ? (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: "hidden" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Image</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Stock</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Add product row */}
                  <TableRow
                    sx={{
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.03)",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: theme.palette.action.hover },
                    }}
                    onClick={() => navigate("/add-product")}
                  >
                    <TableCell colSpan={7} align="center" sx={{ fontWeight: 700 }}>
                      ➕ Add New Product
                    </TableCell>
                  </TableRow>

                  {filtered.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Avatar
                          src={safeImage(p)}
                          alt={p.name}
                          sx={{ width: 44, height: 44, borderRadius: 2 }}
                          onError={imgError}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>₹{Number(p.price || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.stock}
                          color={p.stock < 10 ? "warning" : "success"}
                          variant={p.stock < 10 ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.status}
                          color={p.status === "active" ? "success" : "error"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => setViewProduct(p)}>
                            <VisibilityIcon fontSize="small" color="info" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/edit-product/${p.id}`)}
                          >
                            <EditIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        {p.status === "deleted" ? (
                          <Tooltip title="Restore">
                            <IconButton size="small" onClick={() => restore(p.id)}>
                              <RestoreIcon fontSize="small" sx={{ color: "#2e7d32" }} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Soft delete">
                            <IconButton size="small" onClick={() => softDelete(p.id)}>
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // ---------- Mobile list: card rows ----------
            <Stack spacing={1.2}>
              {/* Add row */}
              <Paper
                onClick={() => navigate("/add-product")}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  cursor: "pointer",
                  "&:active": { opacity: 0.8 },
                }}
              >
                <AddIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="primary">
                  Add New Product
                </Typography>
              </Paper>

              {filtered.map((p) => (
                <Paper
                  key={p.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)",
                    display: "grid",
                    gridTemplateColumns: "52px 1fr auto",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Avatar
                    src={safeImage(p)}
                    alt={p.name}
                    sx={{ width: 48, height: 48, borderRadius: 2 }}
                    onError={imgError}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 13.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.category || "—"} • {p.qty || "—"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.3 }} alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        ₹{Number(p.price || 0).toFixed(2)}
                      </Typography>
                      <Chip
                        size="small"
                        label={`Stock ${p.stock}`}
                        color={p.stock < 10 ? "warning" : "success"}
                        variant={p.stock < 10 ? "filled" : "outlined"}
                      />
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={0.4}>
                    <IconButton size="small" onClick={() => setViewProduct(p)}>
                      <VisibilityIcon fontSize="small" color="info" />
                    </IconButton>
                    <IconButton size="small" onClick={() => navigate(`/edit-product/${p.id}`)}>
                      <EditIcon fontSize="small" color="primary" />
                    </IconButton>
                    {p.status === "deleted" ? (
                      <IconButton size="small" onClick={() => restore(p.id)}>
                        <RestoreIcon fontSize="small" sx={{ color: "#2e7d32" }} />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => softDelete(p.id)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* ---------- Product Info Drawer ---------- */}
      <Drawer
        anchor="right"
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        sx={{
          "& .MuiDrawer-paper": {
            width: isMobile ? "100%" : 420,
            p: 3,
            borderRadius: isMobile ? 0 : "12px 0 0 12px",
          },
        }}
      >
        {viewProduct && (
          <>
            <Typography
              variant="h6"
              color="primary"
              textAlign="center"
              fontWeight={900}
            >
              Product Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ textAlign: "center" }}>
              <Avatar
                src={safeImage(viewProduct)}
                variant="rounded"
                sx={{
                  width: 160,
                  height: 160,
                  mx: "auto",
                  mb: 2,
                  boxShadow: `0 0 24px ${theme.palette.primary.main}55`,
                }}
                onError={imgError}
              />
            </Box>
            <Typography variant="subtitle1" fontWeight={900} sx={{ letterSpacing: 0.2 }}>
              {viewProduct.name}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Category: {viewProduct.category || "—"}
            </Typography>
            <Stack spacing={0.5} sx={{ fontSize: 14 }}>
              <Typography variant="body2">Qty: {viewProduct.qty}</Typography>
              <Typography variant="body2">Stock: {viewProduct.stock}</Typography>
              <Typography variant="body2">
                Price: ₹{Number(viewProduct.price || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Status:{" "}
                <Chip
                  label={viewProduct.status}
                  size="small"
                  color={viewProduct.status === "active" ? "success" : "error"}
                />
              </Typography>
            </Stack>
          </>
        )}
      </Drawer>

      {/* ---------- Category Drawer ---------- */}
      <Drawer
        anchor="left"
        open={catDrawer}
        onClose={() => setCatDrawer(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          zIndex: 1400,
          "& .MuiDrawer-paper": {
            width: 280,
            mt: "70px",
            ml: "70px",
            borderRadius: "0 12px 12px 0",
            p: 2,
            boxShadow: "0 0 28px rgba(0,0,0,0.35)",
            backgroundColor: theme.palette.mode === "dark" ? "#121316" : "#ffffff",
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: "all 0.3s ease",
          },
        }}
      >
        <Typography variant="h6" color="primary" textAlign="center" fontWeight={900}>
          Categories
        </Typography>
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItemButton
            selected={selectedCategory === "All"}
            onClick={() => {
              setSelectedCategory("All");
              setCatDrawer(false);
            }}
          >
            <ListItemText primary="All Products" />
          </ListItemButton>

          {categories.length > 0 ? (
            categories.map((c, i) => (
              <ListItemButton
                key={i}
                selected={selectedCategory === c.category}
                onClick={() => {
                  setSelectedCategory(c.category);
                  setCatDrawer(false);
                }}
              >
                <ListItemText primary={c.category} />
              </ListItemButton>
            ))
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ mt: 2 }}
            >
              No categories found
            </Typography>
          )}
        </List>
      </Drawer>
    </Box>
  );
}

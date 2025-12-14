// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PaidIcon from "@mui/icons-material/Paid";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarChartIcon from "@mui/icons-material/BarChart";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

import { API_BASE } from "../utils/apiBase";

const FALLBACK_IMAGE = "/assets/icon.png";
const n = (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

function safeProductImageUrl(img) {
  if (!img) return FALLBACK_IMAGE;
  const clean = String(img).replace(/^\/?uploads\//, "");
  return `${API_BASE}/uploads/${clean}`;
}

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const uiPrimary = theme.palette.primary.main;

  // ===== Universal card surface =====
  const cardBase = {
    p: 2.5,
    borderRadius: 3,
    position: "relative",
    overflow: "hidden",
    background:
      theme.palette.mode === "dark"
        ? "linear-gradient(145deg,#111827,#0B1220)"
        : "linear-gradient(145deg,#ffffff,#f5f7fb)",
    boxShadow:
      theme.palette.mode === "dark"
        ? `0 10px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset`
        : "0 10px 28px rgba(0,0,0,0.10)",
  };

  // ===== State =====
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const [dailyData, setDailyData] = useState([]);     // [{label,sale,orders}]
  const [monthlyData, setMonthlyData] = useState([]); // [{label,sale,orders}]

  const [todaySale, setTodaySale] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [yesterdaySale, setYesterdaySale] = useState(0);
  const [yesterdayOrders, setYesterdayOrders] = useState(0);

  const [thisMonthSale, setThisMonthSale] = useState(0);
  const [thisMonthOrders, setThisMonthOrders] = useState(0);
  const [lastMonthSale, setLastMonthSale] = useState(0);
  const [lastMonthOrders, setLastMonthOrders] = useState(0);

  const [products, setProducts] = useState([]);
  const [stockStats, setStockStats] = useState({
    high: 0,
    medium: 0,
    low: 0,
    critical: 0,
  });

  const [workers, setWorkers] = useState([]);
  const [workerStats, setWorkerStats] = useState({
    total: 0,
    admins: 0,
    staff: 0,
  });

  const [chartTypeDaily, setChartTypeDaily] = useState("bar");
  const [chartTypeMonthly, setChartTypeMonthly] = useState("line");

  const [openDialog, setOpenDialog] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedRange, setSelectedRange] = useState("");

  // ===== Helpers =====
  const fmtDay = (s) => {
    try {
      const dt = new Date(s);
      if (isNaN(dt)) return s || "";
      return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    } catch {
      return s || "";
    }
  };
  const monthName = (d = new Date()) =>
    d.toLocaleString("default", { month: "long" });

  const safeDate = (v) => {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  };

  // ===== Fetches =====
  const fetchDaily = async () => {
    setLoadingDaily(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales/summary/daily`);
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data)) throw new Error();

      // Ensure chronological ascending (oldest → newest)
      const chart = data
        .map((d) => {
          const rawDate = d.sale_date || d.date || d.saleDay;
          return {
            label: fmtDay(rawDate),
            rawDate,
            sale: Number(d.total_sales || 0),
            orders: Number(d.total_bills || 0),
          };
        })
        .filter((d) => safeDate(d.rawDate))
        .sort((a, b) => safeDate(a.rawDate) - safeDate(b.rawDate));

      const len = chart.length;
      if (len > 0) {
        setTodaySale(chart[len - 1].sale);
        setTodayOrders(chart[len - 1].orders);
      }
      if (len > 1) {
        setYesterdaySale(chart[len - 2].sale);
        setYesterdayOrders(chart[len - 2].orders); // added
      }

      setDailyData(chart);
    } catch (err) {
      console.error("fetchDaily error:", err);
      setDailyData([]);
      setTodaySale(0);
      setTodayOrders(0);
      setYesterdaySale(0);
      setYesterdayOrders(0);
    }
    setLoadingDaily(false);
  };

  const fetchMonthly = async () => {
    setLoadingMonthly(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales/summary/monthly`);
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data)) throw new Error();

      // Ensure chronological ascending (Jan → Dec)
      const chart = data
        .map((d) => {
          const rawDate = d.month_date || d.date || d.month; // any parsable token
          return {
            label: d.month, // "Jan", "Feb", or "2025-12"
            rawDate,
            sale: Number(d.total_sales || 0),
            orders: Number(d.total_bills || 0),
          };
        })
        .filter((d) => safeDate(d.rawDate))
        .sort((a, b) => safeDate(a.rawDate) - safeDate(b.rawDate));

      const len = chart.length;
      if (len > 0) {
        setThisMonthSale(chart[len - 1].sale);
        setThisMonthOrders(chart[len - 1].orders);
      }
      if (len > 1) {
        setLastMonthSale(chart[len - 2].sale);
        setLastMonthOrders(chart[len - 2].orders);
      }

      setMonthlyData(chart);
    } catch (err) {
      console.error("fetchMonthly error:", err);
      setMonthlyData([]);
      setThisMonthSale(0);
      setThisMonthOrders(0);
      setLastMonthSale(0);
      setLastMonthOrders(0);
    }
    setLoadingMonthly(false);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/product`);
      const rows = (await res.json()) || [];
      setProducts(rows);
      setStockStats(getStockSummary(rows));
    } catch (err) {
      console.error("fetchProducts error:", err);
    }
  };

  const getStockSummary = (list = []) => {
    let high = 0,
      medium = 0,
      low = 0,
      critical = 0;
    list.forEach((p) => {
      const stock = Number(p.stock || 0);
      if (stock >= 250) high++;
      else if (stock >= 100) medium++;
      else if (stock >= 50) low++;
      else critical++;
    });
    return { high, medium, low, critical };
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/all`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.users)) {
        const total = data.users.length;
        const admins = data.users.filter((u) => u.role === "admin").length;
        const staff = data.users.filter((u) => u.role === "staff").length;
        setWorkers(data.users);
        setWorkerStats({ total, admins, staff });
      }
    } catch (err) {
      console.error("fetchWorkers error:", err);
      setWorkerStats({ total: 0, admins: 0, staff: 0 });
    }
  };

  useEffect(() => {
    fetchDaily();
    fetchMonthly();
    fetchProducts();
    fetchWorkers();
  }, []);

  // ===== TOP: NEW Gradient 4 cards =====
  const TopGradientSummary = () => {
    const formatDate = (d) =>
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    const thisMonthName = monthName(today);
    const lastMonthName = monthName(lastMonth);

    const cards = [
      {
        title: "Yesterday",
        subtitle: formatDate(yesterday),
        icon: <PaidIcon />,
        value: `₹${n(yesterdaySale)}`,
        subValue: `${n(yesterdayOrders)} Orders`,
        gradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
      },
      {
        title: "Today",
        subtitle: formatDate(today),
        icon: <ShoppingBagIcon />,
        value: `₹${n(todaySale)}`,
        subValue: `${n(todayOrders)} Orders`,
        gradient: "linear-gradient(135deg,#43cea2 0%,#185a9d 100%)",
      },
      {
        title: "This Month",
        subtitle: thisMonthName,
        icon: <TrendingUpIcon />,
        value: `₹${n(thisMonthSale)}`,
        subValue: `${n(thisMonthOrders)} Orders`,
        gradient: "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)",
      },
      {
        title: "Last Month",
        subtitle: lastMonthName,
        icon: <BarChartIcon />,
        value: `₹${n(lastMonthSale)}`,
        subValue: `${n(lastMonthOrders)} Orders`,
        gradient: "linear-gradient(135deg,#ee0979 0%,#ff6a00 100%)",
      },
    ];

    return (
      <Grid container spacing={2}>
        {cards.map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 3,
                color: "#fff",
                background: c.gradient,
                height: 130,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {c.title} • {c.subtitle}
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {c.value}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {c.subValue}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.25)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {React.cloneElement(c.icon, { fontSize: "medium" })}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };
// ===== Mini chart (Responsive with proper stretch + equal height) =====
const MiniChart = ({ title, data, loading, type, onTypeChange, labelIsMonth }) => (
  <Paper
    sx={{
      ...cardBase,
      height: "100%", // ✅ Fill parent Box height
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 2.5,
    }}
  >
    {/* ===== Header ===== */}
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      mb={1.5}
    >
      <Typography fontWeight={700} color="primary">
        {title}
      </Typography>
      <ToggleButtonGroup
        size="small"
        value={type}
        exclusive
        onChange={(e, v) => v && onTypeChange(v)}
      >
        <ToggleButton value="line">
          <ShowChartIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="bar">
          <BarChartIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>

    {/* ===== Chart container ===== */}
    <Box
      sx={{
        width: "100%",
        flexGrow: 1, // ✅ Allow chart to stretch evenly
        height: { xs: 220, md: 200 },
      }}
    >
      {loading ? (
        <Stack height="100%" alignItems="center" justifyContent="center">
          <CircularProgress size={22} />
        </Stack>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <RBarChart
              data={data}
              margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="barFillMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={uiPrimary} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={uiPrimary} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3" opacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{
                  fill: theme.palette.text.secondary,
                  fontSize: 11,
                }}
                interval="preserveEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${uiPrimary}33`,
                }}
                formatter={(v, name) =>
                  name === "sale" ? [`₹${n(v)}`, "Sales"] : [v, name]
                }
                labelFormatter={(l) =>
                  labelIsMonth ? `Month: ${l}` : `Date: ${l}`
                }
              />
              <Bar
                dataKey="sale"
                fill="url(#barFillMini)"
                radius={[6, 6, 0, 0]}
                barSize={10}
              >
                <LabelList
                  dataKey="sale"
                  position="top"
                  formatter={(v) => `₹${n(v)}`}
                  fontSize={10}
                />
              </Bar>
            </RBarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="lineFillMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={uiPrimary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3" opacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{
                  fill: theme.palette.text.secondary,
                  fontSize: 11,
                }}
                interval="preserveEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${uiPrimary}33`,
                }}
                formatter={(v, name) =>
                  name === "sale" ? [`₹${n(v)}`, "Sales"] : [v, name]
                }
                labelFormatter={(l) =>
                  labelIsMonth ? `Month: ${l}` : `Date: ${l}`
                }
              />
              <Line
                type="monotone"
                dataKey="sale"
                stroke={uiPrimary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                fill="url(#lineFillMini)"
                style={{
                  filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.2))",
                }}
              />
              <LabelList
                dataKey="sale"
                position="top"
                formatter={(v) => `₹${n(v)}`}
                fontSize={10}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </Box>
  </Paper>
);


  // ===== Pie chart (thin ring + counts) =====
  const handlePieClick = (entry) => {
    if (!entry?.name) return;
    let filtered = [];
    const label = entry.name;
    if (label.includes("High")) filtered = products.filter((p) => p.stock >= 250);
    else if (label.includes("Med")) filtered = products.filter((p) => p.stock >= 100 && p.stock < 250);
    else if (label.includes("Low")) filtered = products.filter((p) => p.stock >= 50 && p.stock < 100);
    else filtered = products.filter((p) => p.stock < 50);
    setFilteredProducts(filtered);
    setSelectedRange(label);
    setOpenDialog(true);
  };

  const StockPieCard = () => (
    <Paper sx={{ ...cardBase, boxShadow: `0 10px 24px ${uiPrimary}33, inset 0 0 0 1px rgba(255,255,255,0.06)` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={800}>Product Availability</Typography>
        <IconButton onClick={() => navigate("/products")} color="primary"><VisibilityIcon /></IconButton>
      </Stack>
      <Divider sx={{ mb: 2, opacity: 0.15 }} />

      <Box sx={{ height: 240, width: "100%", mx: "auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: "High", value: stockStats.high },
                { name: "Med", value: stockStats.medium },
                { name: "Low", value: stockStats.low },
                { name: "Crit", value: stockStats.critical },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={80}
              cornerRadius={8}
              paddingAngle={3}
              dataKey="value"
              label={({ value }) => (value > 0 ? value : "")}
              labelLine={false}
              onClick={handlePieClick}
              stroke="none"
            >
              {[`${uiPrimary}`, `${uiPrimary}CC`, `${uiPrimary}99`, `${uiPrimary}66`].map((c, i) => (
                <Cell key={i} fill={c} cursor="pointer" />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, opacity: 0.85 }} />
            <Tooltip
              contentStyle={{
                background: theme.palette.background.paper,
                borderRadius: 10,
                border: `1px solid ${uiPrimary}33`,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, textAlign: "center" }}>{selectedRange} Products</DialogTitle>
        <DialogContent>
          {filteredProducts.length === 0 ? (
            <Typography align="center" sx={{ opacity: 0.7 }}>No products found</Typography>
          ) : (
            <Stack spacing={1}>
              {filteredProducts.map((p) => (
                <Stack
                  key={p.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    "&:hover": {
                      background:
                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={safeProductImageUrl(p.image)} sx={{ width: 36, height: 36, borderRadius: 2 }} />
                    <Box>
                      <Typography fontWeight={600} fontSize={12}>{p.name}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.65 }}>
                        ₹{p.price} • Stock: {p.stock}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );

 // ===== Available products (shows 3 rows in desktop view) =====
const AvailableTable = () => (
  <Paper
    sx={{
      ...cardBase,
      height: "100%", // match other cards
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 3,
      mt: 1,
    }}
  >
    {/* Header */}
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      mb={1}
    >
      <Typography variant="h6" fontWeight={800}>
        Available Products
      </Typography>
      <Chip size="small" label={`${products.length} items`} />
    </Stack>


    {/* ✅ Removed all marginTop (table starts right under divider) */}
    <Box
      sx={{
        mt: 0,
        width: "100%",
        flexGrow: 1,
        maxHeight: { xs: "auto", md: 165 }, // ~3 rows visible in desktop
        overflowY: "auto",
        borderRadius: 2,
        border: "1px solid",
        borderColor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.08)",
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: `${uiPrimary}44`,
          borderRadius: 8,
        },
      }}
    >
      {/* Table Header */}
      <Stack
        direction="row"
        sx={{
          mt: 0,
          px: 1.5,
          py: 1,
          position: "sticky",
          top: 0,
          bgcolor: theme.palette.background.paper,
          borderBottom: "1px solid",
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          zIndex: 1,
        }}
      >
        <Box sx={{ width: 60, fontWeight: 600 }}>ID</Box>
        <Box sx={{ width: 52, fontWeight: 600 }}>Image</Box>
        <Box sx={{ flex: 1, fontWeight: 600 }}>Name</Box>
        <Box sx={{ width: 80, textAlign: "right", fontWeight: 600 }}>
          Stock
        </Box>
        <Box sx={{ width: 90, textAlign: "center", fontWeight: 600 }}>
          Status
        </Box>
      </Stack>

      {/* Table Rows */}
      {products.slice(0, 50).map((p) => {
        const stock = Number(p.stock || 0);
        const status =
          stock >= 250
            ? "High"
            : stock >= 100
            ? "Medium"
            : stock >= 50
            ? "Low"
            : "Critical";
        const color =
          status === "High"
            ? "success"
            : status === "Medium"
            ? "warning"
            : status === "Low"
            ? "info"
            : "error";

        return (
          <Stack
            key={p.id}
            direction="row"
            alignItems="center"
            sx={{
              px: 1.5,
              py: 1,
              "&:not(:last-child)": {
                borderBottom: "1px solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
              },
            }}
          >
            <Box sx={{ width: 60, opacity: 0.8 }}>{p.id}</Box>
            <Box sx={{ width: 52 }}>
              <Avatar
                src={safeProductImageUrl(p.image)}
                variant="rounded"
                sx={{ width: 32, height: 32 }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography fontSize={13} fontWeight={600}>
                {p.name}
              </Typography>
            </Box>
            <Box sx={{ width: 80, textAlign: "right" }}>{stock}</Box>
            <Box sx={{ width: 90, textAlign: "center" }}>
              <Chip size="small" color={color} label={status} />
            </Box>
          </Stack>
        );
      })}
    </Box>
  </Paper>
);


 // ===== Worker summary (Enhanced UI) =====
const WorkerSummaryCard = () => (
  <Paper
    sx={{
      ...cardBase,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 3,
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
      <PeopleIcon color="primary" />
      <Typography variant="h6" fontWeight={800}>
        Team Overview
      </Typography>
    </Stack>

    <Box
      sx={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        flexGrow: 1,
      }}
    >
      <Stack alignItems="center">
        <CircularProgress
          variant="determinate"
          value={workerStats.total ? (workerStats.admins / workerStats.total) * 100 : 0}
          size={70}
          thickness={4}
          color="error"
        />
        <Typography mt={1} fontWeight={600} fontSize={13}>
          Admins
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {workerStats.admins}
        </Typography>
      </Stack>

      <Stack alignItems="center">
        <CircularProgress
          variant="determinate"
          value={workerStats.total ? (workerStats.staff / workerStats.total) * 100 : 0}
          size={70}
          thickness={4}
          color="primary"
        />
        <Typography mt={1} fontWeight={600} fontSize={13}>
          Staff
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {workerStats.staff}
        </Typography>
      </Stack>

      <Stack alignItems="center">
        <CircularProgress
          variant="determinate"
          value={100}
          size={70}
          thickness={4}
          sx={{ color: theme.palette.grey[400] }}
        />
        <Typography mt={1} fontWeight={600} fontSize={13}>
          Total
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {workerStats.total}
        </Typography>
      </Stack>
    </Box>

    <Divider sx={{ my: 2, opacity: 0.15 }} />

    <Stack direction="row" justifyContent="space-between">
      <Chip color="error" label={`Admins: ${workerStats.admins}`} size="small" />
      <Chip color="primary" label={`Staff: ${workerStats.staff}`} size="small" />
      <Chip label={`Total: ${workerStats.total}`} size="small" />
    </Stack>
  </Paper>
);


     return (
    <Box
      sx={{
        pb: 4,
        px: { xs: 2, md: 3 },
        pt: 3,
        background: theme.palette.mode === "dark" ? "#0A0E17" : "#F7F9FB",
        minHeight: "100vh",
      }}
    >
   

     {/* ================= Row 1 : Top 4 Summary Cards (Full width, 25% each) ================= */}
<Grid container spacing={2} sx={{ width: "100%", mb: 2 }}>
  {[
    {
      label: "Yesterday",
      date: new Date(Date.now() - 86400000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      value: `₹${n(yesterdaySale)}`,
      orders: `${n(yesterdayOrders)} Orders`,
      icon: <PaidIcon />,
      gradient: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
    },
    {
      label: "Today",
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      value: `₹${n(todaySale)}`,
      orders: `${n(todayOrders)} Orders`,
      icon: <ShoppingBagIcon />,
      gradient: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
    },
    {
      label: "This Month",
      date: monthName(),
      value: `₹${n(thisMonthSale)}`,
      orders: `${n(thisMonthOrders)} Orders`,
      icon: <TrendingUpIcon />,
      gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    },
    {
      label: "Last Month",
      date: monthName(
        new Date(new Date().setMonth(new Date().getMonth() - 1))
      ),
      value: `₹${n(lastMonthSale)}`,
      orders: `${n(lastMonthOrders)} Orders`,
      icon: <BarChartIcon />,
      gradient: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)",
    },
  ].map((c, i) => (
    <Grid item xs={12} sm={6} md={3} key={i}>
      <Paper
        sx={{
          p: 3,
          height: 150,
          borderRadius: 4,
          background: c.gradient,
          color: "#fff",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {c.label} • {c.date}
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {c.value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {c.orders}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {c.icon}
          </Box>
        </Stack>
      </Paper>
    </Grid>
  ))}
</Grid>

 {/* ================= Row 2 : Graphs (Responsive 50/50 full width) ================= */}
<Box
  sx={{
    width: "100%",
    mt: 2,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 2,
  }}
>
  <Box
    sx={{
      flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" },
      minWidth: { xs: "100%", md: "calc(50% - 8px)" },
      display: "flex",
      flexDirection: "column",
      justifyContent: "stretch",
    }}
  >
    <MiniChart
      title="Daily Sales"
      data={dailyData}
      loading={loadingDaily}
      type={chartTypeDaily}
      onTypeChange={setChartTypeDaily}
      labelIsMonth={false}
    />
  </Box>

  <Box
    sx={{
      flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" },
      minWidth: { xs: "100%", md: "calc(50% - 8px)" },
      display: "flex",
      flexDirection: "column",
      justifyContent: "stretch",
    }}
  >
    <MiniChart
      title="Monthly Sales"
      data={monthlyData}
      loading={loadingMonthly}
      type={chartTypeMonthly}
      onTypeChange={setChartTypeMonthly}
      labelIsMonth
    />
  </Box>
</Box>



      {/* ================= Row 3 : Pie + Team + Products (Equal height & responsive) ================= */}
<Grid
  container
  spacing={2}
  sx={{
    width: "100%",
    mt: 1,
    alignItems: "stretch", // makes all cards equal height
  }}
>
  {/* Product card will move last in mobile view */}
  <Grid item xs={12} md={4} order={{ xs: 3, md: 1 }}>
    <StockPieCard />
  </Grid>

  <Grid item xs={12} md={4} order={{ xs: 2, md: 2 }}>
    <WorkerSummaryCard />
  </Grid>

  <Grid item xs={12} md={4} order={{ xs: 4, md: 3 }}>
    <AvailableTable />
  </Grid>
</Grid>

    </Box>
  );
}

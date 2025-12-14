// ✅ src/pages/Reports.jsx — Final Stable + TypeScript Safe Version

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Button,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  IconButton,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { API_BASE } from "../utils/apiBase";

export default function Reports() {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:600px)");
  const primary = theme.palette.primary.main;

  const [mode, setMode] = useState("daily");
  const [summary, setSummary] = useState({
    totalSale: 0,
    totalOrders: 0,
    cashTotal: 0,
    upiTotal: 0,
  });
  const [bills, setBills] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, gst: 0, total: 0 });
  const [selectedBill, setSelectedBill] = useState(null);
  const [openBill, setOpenBill] = useState(false);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fmt = (d) => d.toISOString().split("T")[0];

  const getRangeForMode = (m, date = new Date()) => {
    if (m === "thisMonth") {
      const first = new Date(date.getFullYear(), date.getMonth(), 1);
      const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return { from: fmt(first), to: fmt(last) };
    }
    return { from: fmt(date), to: fmt(date) };
  };

  const sumTotals = (list) => {
    const valid = list.filter((b) => Number(b.total || 0) > 0);
    const t = valid.reduce(
      (acc, b) => ({
        subtotal: acc.subtotal + Number(b.subtotal || 0),
        gst: acc.gst + Number(b.gst || 0),
        total: acc.total + Number(b.total || 0),
      }),
      { subtotal: 0, gst: 0, total: 0 }
    );
    setTotals(t);
  };

  const fetchBillsByRange = async (from, to) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report/bills?from=${from}&to=${to}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.bills)) {
        const cleanBills = json.bills.map((b) => ({
          ...b,
          total:
            Number(b.total) === 0 && b.subtotal
              ? Number(b.subtotal) + Number(b.gst || 0)
              : Number(b.total),
        }));
        setBills(cleanBills);
        sumTotals(cleanBills);
      } else {
        setBills([]);
        sumTotals([]);
      }
    } catch (err) {
      console.error("❌ fetch bills error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (type = "daily", date = new Date()) => {
    setLoading(true);
    try {
      const { from, to } = getRangeForMode(type, date);
      await fetchBillsByRange(from, to);
      const res = await fetch(
        `${API_BASE}/api/report/summary?mode=range&from=${from}&to=${to}`
      );
      const json = await res.json();
      if (json.success && json.summary) {
        const s = json.summary;
        setSummary({
          totalSale: Number(s.total_sum || 0),
          totalOrders: Number(s.total_orders || 0),
          cashTotal: Number(s.cash_total || 0),
          upiTotal: Number(s.upi_total || 0),
        });
      }
    } catch (err) {
      console.error("❌ fetch summary error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary("daily");
  }, []);

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    await fetchSummary(mode, date);
  };

  // ✅ Parse products safely
  useEffect(() => {
    if (!selectedBill) return;
    try {
      let data = selectedBill.products;
      if (!data) setParsedProducts([]);
      else if (Array.isArray(data)) setParsedProducts(data);
      else {
        const parsed = JSON.parse(data);
        if (typeof parsed === "string") setParsedProducts(JSON.parse(parsed));
        else setParsedProducts(parsed);
      }
    } catch (err) {
      console.warn("⚠️ Error parsing products:", err.message);
      setParsedProducts([]);
    }
  }, [selectedBill]);

  const downloadBill = () => {
    if (!selectedBill) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("🧾 Gramam POS - Sales Bill", 14, 18);
    doc.autoTable({
      startY: 30,
      head: [["Product", "Qty", "Price", "Total"]],
      body: parsedProducts.map((p) => [
        p.name,
        p.qty,
        `₹${Number(p.price || 0).toFixed(2)}`,
        `₹${Number((p.total ?? (p.qty * p.price)) || 0).toFixed(2)}`, // ✅ fixed parentheses
      ]),
    });
    const y = doc.lastAutoTable.finalY + 10;
    doc.text(`Total: ₹${Number(selectedBill.total || 0).toFixed(2)}`, 14, y);
    doc.save(`Bill_${selectedBill.billNo}.pdf`);
  };

  const cardStyle = {
    p: 2,
    textAlign: "center",
    borderRadius: 3,
    background:
      theme.palette.mode === "dark"
        ? `linear-gradient(135deg, ${primary}22, #000)`
        : `linear-gradient(135deg, ${primary}10, #fff)`,
    boxShadow: `0 4px 16px ${primary}22`,
    border: `1px solid ${primary}33`,
  };

  return (
    <Box sx={{ pt: 9, px: 2, maxWidth: 1200, mx: "auto", pb: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
      >
        <Typography variant="h5" fontWeight={900} color={primary}>
          📊 Reports
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            variant={mode === "daily" ? "contained" : "outlined"}
            onClick={() => setMode("daily")}
          >
            Pick Date
          </Button>
          <Button
            variant={mode === "thisMonth" ? "contained" : "outlined"}
            onClick={() => setMode("thisMonth")}
          >
            This Month
          </Button>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              views={mode === "thisMonth" ? ["year", "month"] : ["year", "month", "day"]}
              label={mode === "thisMonth" ? "Select Month" : "Select Date"}
              value={selectedDate}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { minWidth: 150 },
                },
              }}
            />
          </LocalizationProvider>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {[
          { label: "Total Bills", value: summary.totalOrders },
          { label: "Cash Payments", value: `₹${summary.cashTotal.toLocaleString()}` },
          { label: "UPI Payments", value: `₹${summary.upiTotal.toLocaleString()}` },
          { label: "Subtotal", value: `₹${totals.subtotal.toFixed(2)}` },
          { label: "GST", value: `₹${totals.gst.toFixed(2)}` },
          { label: "Total Sales", value: `₹${totals.total.toFixed(2)}` },
        ].map((c, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper sx={cardStyle}>
              <Typography variant="body2" color="text.secondary">
                {c.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} color={primary}>
                {c.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Bills Table */}
      <Paper
        sx={{
          mt: 4,
          p: 2,
          borderRadius: 3,
          boxShadow: `0 4px 12px ${primary}22`,
          overflowX: "auto",
        }}
      >
        <Typography variant="h6" fontWeight={700} color={primary} mb={1}>
          🧾 All Bills ({bills.length})
        </Typography>

        {loading ? (
          <Box textAlign="center" mt={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bill No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.map((b) => (
                <TableRow
                  key={b.id}
                  hover
                  onClick={() => {
                    setSelectedBill(b);
                    setOpenBill(true);
                  }}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { backgroundColor: theme.palette.action.hover },
                  }}
                >
                  <TableCell>{b.billNo}</TableCell>
                  <TableCell>{new Date(b.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>{b.paymentMode}</TableCell>
                  <TableCell align="right">₹{b.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ✅ Bill Drawer */}
      <Drawer
        anchor="right"
        open={openBill}
        onClose={() => setOpenBill(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: isMobile ? "90%" : 420,
            p: 2,
            borderRadius: "16px 0 0 16px",
          },
        }}
      >
        {selectedBill ? (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>
                Bill #{selectedBill.billNo}
              </Typography>
              <IconButton onClick={() => setOpenBill(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography color="text.secondary">
              {new Date(selectedBill.timestamp).toLocaleString()} •{" "}
              {selectedBill.paymentMode}
            </Typography>
            <Divider sx={{ my: 1 }} />

            {parsedProducts.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedProducts.map((p, i) => {
                    const price = Number(p.price || 0);
                    const qty = Number(p.qty || 0);
                    const total = Number((p.total ?? (price * qty)) || 0); // ✅ safe parentheses
                    return (
                      <TableRow key={i}>
                        <TableCell>{p.name || "Unnamed"}</TableCell>
                        <TableCell align="right">{qty}</TableCell>
                        <TableCell align="right">₹{price.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography align="center" color="text.secondary" sx={{ mt: 3 }}>
                No product details found
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />
            <Stack sx={{ textAlign: "right" }}>
              <Typography>
                Subtotal: ₹{Number(selectedBill.subtotal || 0).toFixed(2)}
              </Typography>
              <Typography>GST: ₹{Number(selectedBill.gst || 0).toFixed(2)}</Typography>
              <Typography fontWeight={800}>
                Total: ₹{Number(selectedBill.total || 0).toFixed(2)}
              </Typography>
            </Stack>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              startIcon={<DownloadIcon />}
              onClick={downloadBill}
            >
              Download PDF
            </Button>
          </>
        ) : (
          <Typography align="center" color="text.secondary">
            Select a bill to view details
          </Typography>
        )}
      </Drawer>
    </Box>
  );
}

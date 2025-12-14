import React, { useEffect, useState } from "react";
import styled from "styled-components";
import JsBarcode from "jsbarcode";
import {
  Button,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";

const Wrapper = styled.div`
  padding: 24px;
  margin-top: 80px;
  text-align: center;
  background: transparent;

  @media print {
    margin: 0;
    padding: 0;
    background: white !important;
  }
`;

const PrintGrid = styled.div`
  display: grid;
  grid-template-columns: ${(p) =>
    p.mode === "a4" ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr"};
  gap: ${(p) => (p.mode === "a4" ? "20px" : "6px")};
  justify-items: center;

  @media print {
    display: block;
    width: ${(p) => (p.mode === "a4" ? "100%" : "58mm")};
    margin: 0 auto;
  }
`;

const LabelBox = styled.div`
  position: relative;
  text-align: center;
  width: ${(p) => (p.mode === "a4" ? "220px" : "58mm")};
  height: ${(p) => (p.mode === "a4" ? "130px" : "100px")};
  background: #fff;
  border-radius: 4px;
  overflow: hidden; /* prevent anything outside */
  padding: 5px 4px 2px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  @media print {
    box-shadow: none;
    page-break-inside: avoid;
  }

  .brand {
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  .name {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    margin-top: 1px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    max-height: 28px;
  }

  .info {
    font-size: 11px;
    margin-top: 1px;
    white-space: nowrap;
  }

  canvas {
    width: 180px !important;
    height: 38px !important;
    margin-top: 3px;
    object-fit: contain;
  }

  @media print {
    .delete-btn {
      display: none;
    }
  }
`;

const ControlBar = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  @media print {
    display: none;
  }
`;

const PrintBtn = styled(Button)`
  background: #1976d2 !important;
  color: white !important;
  padding: 10px 24px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
`;

const GlobalPrintStyle = styled.div`
  @media print {
    @page {
      size: auto;
      margin: 0mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
      -webkit-print-color-adjust: exact !important;
    }

    /* Hide everything except printable area */
    body * {
      visibility: hidden !important;
    }

    #print-content,
    #print-content * {
      visibility: visible !important;
    }

    #print-content {
      position: absolute !important;
      top: 0;
      left: 0;
      width: 100% !important;
      background: white !important;
      z-index: 9999 !important;
    }

    /* Hide UI sidebars, theme, etc. */
    nav,
    header,
    footer,
    .sidebar,
    .navbar,
    .topbar,
    .MuiDrawer-root,
    .theme-toggle,
    .themeColorBox {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      width: 0 !important;
    }
  }
`;

export default function BarcodePrint() {
  const [list, setList] = useState([]);
  const [mode, setMode] = useState("a4");

  // Fetch barcodes
  useEffect(() => {
    fetch("/api/product/barcodes/auto")
      .then((r) => r.json())
      .then((d) => setList(d || []))
      .catch((e) => console.error(e));
  }, []);

  // Generate barcodes with proper size
  useEffect(() => {
    list.forEach((item) => {
      const canvas = document.getElementById(`barcode-${item.id}`);
      if (!canvas) return;

      const isThermal = mode === "thermal";
      canvas.width = isThermal ? 160 : 180;
      canvas.height = isThermal ? 45 : 50;

      try {
        JsBarcode(canvas, item.barcode, {
          format: "EAN13",
          width: isThermal ? 1.3 : 1.6,
          height: isThermal ? 30 : 36,
          displayValue: true,
          fontSize: isThermal ? 9 : 10.5,
          margin: 0,
        });
      } catch {
        JsBarcode(canvas, item.barcode, {
          format: "CODE128",
          width: 1.4,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 0,
        });
      }
    });
  }, [list, mode]);

  const del = async (id) => {
    if (!window.confirm("Delete this product’s barcode?")) return;
    try {
      await fetch(`/api/product/delete/${id}`, { method: "PUT" });
      setList((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <GlobalPrintStyle />
      <Wrapper>
        <ControlBar>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(e, v) => v && setMode(v)}
            size="small"
          >
            <ToggleButton value="a4">📄 A4</ToggleButton>
            <ToggleButton value="thermal">🧾 Thermal</ToggleButton>
          </ToggleButtonGroup>
          <PrintBtn onClick={() => window.print()} startIcon={<PrintIcon />}>
            Print
          </PrintBtn>
        </ControlBar>

        <div id="print-content">
          <PrintGrid mode={mode}>
            {list.map((p) => (
              <LabelBox key={p.id} mode={mode}>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    className="delete-btn"
                    onClick={() => del(p.id)}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      color: "#d32f2f",
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <div className="brand">Gramam Naturals</div>
                <div className="name">{p.name}</div>
                <div className="info">
                  {p.qty} • ₹{p.price}
                </div>
                <canvas id={`barcode-${p.id}`}></canvas>
              </LabelBox>
            ))}
          </PrintGrid>
        </div>
      </Wrapper>
    </>
  );
}

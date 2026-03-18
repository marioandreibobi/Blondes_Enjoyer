"use client";

import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useGraphStore } from "@/store/graph-store";
import { RISK_COLORS } from "@/lib/graph-constants";
import { useMapLayout, type MapBuilding, type MapSector } from "./useMapLayout";

// ─── Palette (matches the Lovable screenshot exactly) ─────────────────────────
const MAP_BG       = "#E8E8E3";   // light warm gray — the "land"
const ROAD_FILL    = "#FFFFFF";   // pure white roads
const CARD_BG      = "#F5F5F2";   // card fill (slightly lighter than land)
const CARD_BORDER  = "rgba(0,0,0,0.10)";
const CARD_SHADOW  = "rgba(0,0,0,0.07)";

// File square colours by category
const FILE_COLORS: Record<string, string> = {
  core:          "#5B9BD5",  // blue
  services:      "#52A868",  // green
  utilities:     "#D4A836",  // amber
  qa:            "#9B78CA",  // purple
  configuration: "#7BA0C4",  // muted blue
  default:       "#8090A8",
};

// Connecting-road style
function connectRoadStyle(imp: number, hl: boolean) {
  if (hl) return { cw: 14, fw: 9,   cc: "#1A73E8", fc: "#4285F4" };
  if (imp >= 8) return { cw: 12, fw: 8,   cc: "#D0D0CC", fc: "#FFFFFF" };
  if (imp >= 4) return { cw:  9, fw: 6,   cc: "#D8D8D4", fc: "#FFFFFF" };
  if (imp >= 2) return { cw:  6, fw: 4,   cc: "#DCDCD8", fc: "#FAFAFA" };
  return               { cw:  4, fw: 2.5, cc: "#E0E0DC", fc: "#F8F8F5" };
}

// ─── roundedRect helper ───────────────────────────────────────────────────────
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapView() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transform    = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const animOffset   = useRef(0);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const analysisResult   = useGraphStore((s) => s.analysisResult);
  const selectedNode     = useGraphStore((s) => s.selectedNode);
  const hoveredNode      = useGraphStore((s) => s.hoveredNode);
  const typeFilters      = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const activeCategory   = useGraphStore((s) => s.activeCategory);
  const storeSelectNode  = useGraphStore((s) => s.selectNode);
  const storeHoverNode   = useGraphStore((s) => s.hoverNode);

  const layout = useMapLayout(
    analysisResult?.graph.nodes,
    analysisResult?.graph.links,
    typeFilters,
    complexityFilter,
    activeCategory,
  );

  const {
    sectors, buildings, edges,
    gridCols, gridRows, cellW, cellH, roadW, mapMargin,
    totalWidth, totalHeight,
  } = layout;

  const buildingMap = useMemo(() => {
    const m: Record<string, MapBuilding> = {};
    for (const b of buildings) m[b.id] = b;
    return m;
  }, [buildings]);

  const sectorMap = useMemo(() => {
    const m: Record<string, MapSector> = {};
    for (const s of sectors) m[s.id] = s;
    return m;
  }, [sectors]);

  // Pre-sort edges for road rendering
  const sortedEdges = useMemo(() =>
    [...edges].sort((a, b) => {
      const ia = Math.max(buildingMap[a.sourceId]?.node.importedBy ?? 0, buildingMap[a.targetId]?.node.importedBy ?? 0);
      const ib = Math.max(buildingMap[b.sourceId]?.node.importedBy ?? 0, buildingMap[b.targetId]?.node.importedBy ?? 0);
      return ia - ib;
    }),
  [edges, buildingMap]);

  // ─── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw  = container.clientWidth;
    const ch  = container.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width  = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width  = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    animOffset.current = (animOffset.current + 0.3) % 320;

    const { x: tx, y: ty, scale } = transform.current;

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = MAP_BG;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const CARD_RADIUS = 8 / scale;

    // ── Layer 1: White road grid (horizontal + vertical bands) ────────────────
    ctx.fillStyle = ROAD_FILL;

    if (gridCols > 0 && gridRows > 0) {
      // Top margin road
      ctx.fillRect(0, 0, totalWidth, mapMargin);
      // Bottom margin road
      ctx.fillRect(0, mapMargin + roadW + gridRows * cellH, totalWidth, mapMargin);
      // Left margin road
      ctx.fillRect(0, 0, mapMargin, totalHeight);
      // Right margin road
      ctx.fillRect(mapMargin + roadW + gridCols * cellW, 0, totalWidth, totalHeight);

      // Inner vertical road bands (between columns)
      for (let c = 0; c <= gridCols; c++) {
        const rx = mapMargin + c * cellW;
        ctx.fillRect(rx, 0, roadW, totalHeight);
      }
      // Inner horizontal road bands (between rows)
      for (let r = 0; r <= gridRows; r++) {
        const ry = mapMargin + r * cellH;
        ctx.fillRect(0, ry, totalWidth, roadW);
      }
    }

    ctx.lineCap  = "round";
    ctx.lineJoin = "round";

    // ── Layer 2: Connecting diagonal roads between sectors ─────────────────────
    // Group edges by sector pair and take only inter-sector ones
    const sectorEdges = new Map<string, { srcSector: MapSector; tgtSector: MapSector; maxImp: number }>();
    for (const edge of sortedEdges) {
      const sb = buildingMap[edge.sourceId];
      const tb = buildingMap[edge.targetId];
      if (!sb || !tb || sb.sectorId === tb.sectorId || sb.sectorId === "(root)" || tb.sectorId === "(root)") continue;
      const key = [sb.sectorId, tb.sectorId].sort().join("↔");
      const imp = Math.max(sb.node.importedBy ?? 0, tb.node.importedBy ?? 0);
      const existing = sectorEdges.get(key);
      if (!existing || imp > existing.maxImp) {
        const srcS = sectorMap[sb.sectorId], tgtS = sectorMap[tb.sectorId];
        if (srcS && tgtS) sectorEdges.set(key, { srcSector: srcS, tgtSector: tgtS, maxImp: imp });
      }
    }

    for (const { srcSector, tgtSector, maxImp } of sectorEdges.values()) {
      const hl = !!(selectedNode && (
        buildings.find(b => b.sectorId === srcSector.id && b.node.id === selectedNode.id) ||
        buildings.find(b => b.sectorId === tgtSector.id && b.node.id === selectedNode.id)
      ));
      const rs = connectRoadStyle(maxImp, hl);

      const x1 = srcSector.cx, y1 = srcSector.cy;
      const x2 = tgtSector.cx, y2 = tgtSector.cy;
      // Slight S-curve for organic look
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const nx = -(y2 - y1) * 0.15, ny = (x2 - x1) * 0.15;

      // Casing
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2);
      ctx.strokeStyle = rs.cc;
      ctx.lineWidth   = rs.cw / scale;
      ctx.stroke();
      // Fill
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2);
      ctx.strokeStyle = rs.fc;
      ctx.lineWidth   = rs.fw / scale;
      ctx.stroke();

      // Animated flow on highlighted road
      if (hl) {
        const aOff = animOffset.current;
        ctx.setLineDash([8 / scale, 12 / scale]);
        ctx.lineDashOffset = -(aOff * 0.9) / scale;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2);
        ctx.strokeStyle = "rgba(66,133,244,0.5)";
        ctx.lineWidth   = (rs.fw * 0.5) / scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Layer 3: Road name labels along connecting roads ──────────────────────
    if (scale >= 0.4) {
      for (const { srcSector, tgtSector, maxImp } of sectorEdges.values()) {
        if (maxImp < 2) continue;
        const x1 = srcSector.cx, y1 = srcSector.cy;
        const x2 = tgtSector.cx, y2 = tgtSector.cy;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist * scale < 80) continue;

        let angle = Math.atan2(y2 - y1, x2 - x1);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

        const label = tgtSector.streetName.split(" ").slice(0, 2).join(" ");
        const fs    = Math.max(5.5, 8 / scale);

        ctx.save();
        ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
        ctx.rotate(angle);
        ctx.font         = `italic 400 ${fs}px 'Roboto', Arial, sans-serif`;
        ctx.fillStyle    = "rgba(100,95,88,0.65)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, 0, -3 / scale);
        ctx.restore();
      }
    }

    // ── Layer 4: Sector cards ──────────────────────────────────────────────────
    for (const sector of sectors) {
      const { cx, cy, cardW, cardH } = sector;
      const x = cx - cardW / 2, y = cy - cardH / 2;

      // Card shadow
      ctx.shadowColor = CARD_SHADOW;
      ctx.shadowBlur  = 10 / scale;
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2 / scale;

      // Card fill
      roundedRect(ctx, x, y, cardW, cardH, CARD_RADIUS);
      ctx.fillStyle = CARD_BG;
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; ctx.shadowOffsetY = 0;

      // Card border
      ctx.strokeStyle = CARD_BORDER;
      ctx.lineWidth   = 1 / scale;
      ctx.stroke();

      // Street name (bold, small caps style)
      const nameFontSz = Math.max(5.5, 7.5 / scale);
      ctx.font         = `700 ${nameFontSz}px 'Roboto', Arial, sans-serif`;
      ctx.fillStyle    = "#5A5652";
      ctx.textAlign    = "left";
      ctx.textBaseline = "top";
      const pad        = 10 / scale;
      ctx.fillText(sector.streetName, x + pad, y + pad);

      // File count subtitle
      const subFontSz  = Math.max(4.5, 6 / scale);
      ctx.font         = `400 ${subFontSz}px 'Roboto', Arial, sans-serif`;
      ctx.fillStyle    = "#9B9690";
      ctx.fillText(`${sector.fileCount} files`, x + pad, y + pad + nameFontSz * 1.5);
    }

    // ── Layer 5: File squares inside cards ─────────────────────────────────────
    for (const b of buildings) {
      if (b.sectorId === "(root)") continue;

      const isSelected = selectedNode?.id === b.id;
      const isHovered  = hoveredNode?.id  === b.id;

      const halfW = b.width  / 2;
      const halfH = b.height / 2;
      const bx    = b.x - halfW;
      const by    = b.y - halfH;

      const baseColor = FILE_COLORS[b.category] ?? FILE_COLORS.default;
      const color = isSelected ? "#1A73E8"
        : isHovered ? "#333333"
        : b.node.risk && b.node.risk !== "low"
          ? (RISK_COLORS[b.node.risk as keyof typeof RISK_COLORS] ?? baseColor)
          : baseColor;

      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur  = 6 / scale;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(bx, by, b.width, b.height);
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#FFFFFF" : "rgba(0,0,0,0.25)";
        ctx.lineWidth   = 1.5 / scale;
        ctx.stroke();
      }

      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";

      // File name label — only at high zoom
      if (scale >= 1.2) {
        const fname = b.id.split("/").pop() ?? b.id;
        const lfs   = Math.max(4, 5.5 / scale);
        ctx.font         = `${isSelected ? "600" : "400"} ${lfs}px 'Roboto', Arial, sans-serif`;
        ctx.fillStyle    = isSelected ? "#1A73E8" : "rgba(60,60,60,0.75)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        ctx.fillText(fname, b.x, by + b.height + 2 / scale, b.width * 3);
      }
    }

    // ── Layer 6: Root / isolated file squares (scattered in margins) ──────────
    for (const b of buildings) {
      if (b.sectorId !== "(root)") continue;
      const isSelected = selectedNode?.id === b.id;
      const isHovered  = hoveredNode?.id  === b.id;
      const baseColor  = FILE_COLORS[b.category] ?? FILE_COLORS.default;
      const color = isSelected ? "#1A73E8" : isHovered ? "#333333" : baseColor;
      ctx.fillStyle = color;
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    }

    ctx.restore();

    // ── HUD: info card (top-left) ─────────────────────────────────────────────
    if (analysisResult) {
      const repo = analysisResult.repo;
      const pad  = 14;
      const info = `${sectors.length} districts · ${buildings.length} buildings · ${edges.length} roads`;
      ctx.font = "bold 13px 'Roboto', Arial, sans-serif";
      const titleW = ctx.measureText(repo.name).width;
      ctx.font = "11px 'Roboto', Arial, sans-serif";
      const infoW  = ctx.measureText(info).width;
      const cardW  = Math.max(titleW, infoW) + pad * 2 + 30;
      const cardH  = 52;
      const cardX  = 16, cardY = 16;

      // Dark card background
      roundedRect(ctx, cardX, cardY, cardW, cardH, 10);
      ctx.fillStyle = "rgba(22,20,18,0.92)";
      ctx.fill();

      // Pin icon area
      ctx.fillStyle = "#E07B54";
      ctx.beginPath();
      ctx.arc(cardX + 22, cardY + cardH / 2 - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(22,20,18,0.92)";
      ctx.beginPath();
      ctx.arc(cardX + 22, cardY + cardH / 2 - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Repo name
      ctx.font         = "bold 13px 'Roboto', Arial, sans-serif";
      ctx.fillStyle    = "#FFFFFF";
      ctx.textAlign    = "left";
      ctx.textBaseline = "top";
      ctx.fillText(repo.name, cardX + 38, cardY + 12);

      // Stats subtitle
      ctx.font      = "11px 'Roboto', Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(info, cardX + 38, cardY + 29);
    }

    // ── HUD: zoom badge (bottom-left) ─────────────────────────────────────────
    {
      const pct  = Math.round(transform.current.scale * 100);
      const label = `${pct}%`;
      ctx.font = "bold 11px 'Roboto', Arial, sans-serif";
      const tw  = ctx.measureText(label).width;
      roundedRect(ctx, 16, ch - 38, tw + 20, 26, 6);
      ctx.fillStyle = "rgba(22,20,18,0.88)";
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 26, ch - 25);
    }
  }, [
    sectors, buildings, edges, sortedEdges,
    buildingMap, sectorMap, selectedNode, hoveredNode,
    analysisResult, gridCols, gridRows, cellW, cellH, roadW, mapMargin,
    totalWidth, totalHeight,
  ]);

  // ─── Render loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let running = true;
    const loop  = () => { if (!running) return; draw(); animFrameRef.current = requestAnimationFrame(loop); };
    loop();
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [draw]);

  // ─── Initial fit ────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = containerRef.current;
    if (!c || totalWidth === 0) return;
    const fitScale = Math.min(
      c.clientWidth  / (totalWidth  + 40),
      c.clientHeight / (totalHeight + 40),
      1.4,
    );
    transform.current = {
      scale: fitScale,
      x: (c.clientWidth  - totalWidth  * fitScale) / 2,
      y: (c.clientHeight - totalHeight * fitScale) / 2,
    };
  }, [totalWidth, totalHeight]);

  // ─── Interaction ────────────────────────────────────────────────────────────
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x: tx, y: ty, scale } = transform.current;
    return { wx: (sx - tx) / scale, wy: (sy - ty) / scale };
  }, []);

  const hitBuilding = useCallback((wx: number, wy: number): MapBuilding | null => {
    let best: MapBuilding | null = null;
    let bestDist = 18 / transform.current.scale;
    for (const b of buildings) {
      const dx = wx - b.x, dy = wy - b.y;
      if (Math.abs(dx) < b.width / 2 + 3 / transform.current.scale &&
          Math.abs(dy) < b.height / 2 + 3 / transform.current.scale) {
        const d = Math.hypot(dx, dy);
        if (d < bestDist) { bestDist = d; best = b; }
      }
    }
    return best;
  }, [buildings]);

  const hitSector = useCallback((wx: number, wy: number): MapSector | null => {
    for (const s of sectors) {
      if (wx >= s.x && wx <= s.x + s.width && wy >= s.y && wy <= s.y + s.height) return s;
    }
    return null;
  }, [sectors]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current  = { x: e.clientX - transform.current.x, y: e.clientY - transform.current.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (isDragging.current) {
      transform.current.x = e.clientX - dragStart.current.x;
      transform.current.y = e.clientY - dragStart.current.y;
      document.body.style.cursor = "grabbing";
      return;
    }
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { wx, wy } = screenToWorld(mx, my);
    const hit = hitBuilding(wx, wy);
    if (hit) {
      storeHoverNode(hit.node);
      setTooltipPos({ x: mx, y: my });
      document.body.style.cursor = "pointer";
    } else {
      if (hoveredNode) { storeHoverNode(null); setTooltipPos(null); }
      document.body.style.cursor = "grab";
    }
  }, [screenToWorld, hitBuilding, storeHoverNode, hoveredNode]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDragging  = isDragging.current;
    isDragging.current = false;
    document.body.style.cursor = "grab";
    if (wasDragging) {
      const ddx = Math.abs(e.clientX - (dragStart.current.x + transform.current.x));
      const ddy = Math.abs(e.clientY - (dragStart.current.y + transform.current.y));
      if (ddx > 4 || ddy > 4) return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { wx, wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitBuilding(wx, wy);
    if (hit) { storeSelectNode(hit.node); return; }
    const sHit = hitSector(wx, wy);
    if (sHit && transform.current.scale < 1.0) {
      const c = containerRef.current!;
      const ns = Math.min(
        c.clientWidth  / (sHit.cardW + 80),
        c.clientHeight / (sHit.cardH + 80),
        4,
      );
      transform.current = {
        scale: ns,
        x: c.clientWidth  / 2 - sHit.cx * ns,
        y: c.clientHeight / 2 - sHit.cy * ns,
      };
      return;
    }
    storeSelectNode(null);
  }, [screenToWorld, hitBuilding, hitSector, storeSelectNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { x: tx, y: ty, scale: old } = transform.current;
    const next = Math.max(0.05, Math.min(10, old * (1 - e.deltaY * 0.001)));
    const wx = (mx - tx) / old, wy = (my - ty) / old;
    transform.current = { scale: next, x: mx - wx * next, y: my - wy * next };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { x: tx, y: ty, scale: old } = transform.current;
    const next = Math.min(10, old * 2.2);
    const wx = (mx - tx) / old, wy = (my - ty) / old;
    transform.current = { scale: next, x: mx - wx * next, y: my - wy * next };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const c = containerRef.current;
    if (!c) return;
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
    const { x: tx, y: ty, scale: old } = transform.current;
    const next = Math.max(0.05, Math.min(10, old * factor));
    const wx = (cx - tx) / old, wy = (cy - ty) / old;
    transform.current = { scale: next, x: cx - wx * next, y: cy - wy * next };
  }, []);

  const fitView = useCallback(() => {
    const c = containerRef.current;
    if (!c || totalWidth === 0) return;
    const fs = Math.min(
      c.clientWidth  / (totalWidth  + 40),
      c.clientHeight / (totalHeight + 40),
      1.4,
    );
    transform.current = {
      scale: fs,
      x: (c.clientWidth  - totalWidth  * fs) / 2,
      y: (c.clientHeight - totalHeight * fs) / 2,
    };
  }, [totalWidth, totalHeight]);

  if (!analysisResult) return null;

  // Dark button style (matches screenshot bottom-right controls)
  const darkBtn: React.CSSProperties = {
    background: "rgba(22,20,18,0.88)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8, width: 40, height: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, cursor: "pointer", lineHeight: 1, fontWeight: 400,
    fontFamily: "'Roboto', Arial, sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      style={{ background: MAP_BG, cursor: "grab" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDragging.current = false;
          storeHoverNode(null);
          setTooltipPos(null);
          document.body.style.cursor = "auto";
        }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Zoom controls — dark buttons, bottom right (matches screenshot) */}
      <div style={{ position: "absolute", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <button style={darkBtn} onClick={() => zoomBy(1.5)} title="Zoom in">+</button>
        <button style={darkBtn} onClick={() => zoomBy(1 / 1.5)} title="Zoom out">−</button>
        <button
          style={{ ...darkBtn, fontSize: 16 }}
          onClick={fitView}
          title="Fit view"
        >
          ⊕
        </button>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: tooltipPos.x + 14, top: tooltipPos.y - 10,
            background: "#FFFFFF",
            borderRadius: 8,
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            padding: "10px 14px", minWidth: 175,
            fontFamily: "'Roboto', Arial, sans-serif",
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#202124", marginBottom: 3 }}>
            {hoveredNode.id.split("/").pop()}
          </div>
          <div style={{ fontSize: 11, color: "#5F6368" }}>
            {hoveredNode.lines} lines · {hoveredNode.imports} imports · {hoveredNode.importedBy} usages
          </div>
          {hoveredNode.risk && hoveredNode.risk !== "low" && (
            <div style={{
              fontSize: 11, marginTop: 4, fontWeight: 600,
              color: RISK_COLORS[hoveredNode.risk as keyof typeof RISK_COLORS] ?? "#EA4335",
            }}>
              ⚠ {hoveredNode.risk} risk
            </div>
          )}
          <div style={{ fontSize: 10, color: "#9AA0A6", marginTop: 3 }}>{hoveredNode.id}</div>
        </div>
      )}
    </div>
  );
}

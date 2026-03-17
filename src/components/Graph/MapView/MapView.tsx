"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useGraphStore } from "@/store/graph-store";
import { RISK_COLORS, complexityToNumber } from "@/lib/graph-constants";
import type { GraphNode } from "@/types";
import { useMapLayout, type MapBuilding, type MapSector } from "./useMapLayout";

// ─── Constants ────────────────────────────────────────────

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;
const ZOOM_SPEED = 0.001;
const BG_COLOR = "#E8EAE9"; // Google Maps light gray (streets/background)

// Google Maps color palette per category
const GM: Record<string, { sectorBg: string; sectorBorder: string; sectorText: string; building: string }> = {
  core:          { sectorBg: "#F5F0E8", sectorBorder: "#C8BBA0", sectorText: "#5C4A30", building: "#C8A87A" },
  services:      { sectorBg: "#D8EDD3", sectorBorder: "#8FBF87", sectorText: "#2D5A27", building: "#6BAF5C" },
  utilities:     { sectorBg: "#FFF3D6", sectorBorder: "#DDB84A", sectorText: "#7A5A00", building: "#D4A857" },
  qa:            { sectorBg: "#EDE0F5", sectorBorder: "#B88FD4", sectorText: "#5C2D8C", building: "#9C7FCB" },
  configuration: { sectorBg: "#DAE8F0", sectorBorder: "#7AAFC8", sectorText: "#1A4A6B", building: "#6B9EC5" },
};
const GM_FALLBACK = { sectorBg: "#EFEFEF", sectorBorder: "#AAAAAA", sectorText: "#444444", building: "#AAAAAA" };

// Zoom level thresholds for progressive detail
const ZOOM_SHOW_BUILDINGS = 0.35;
const ZOOM_SHOW_LABELS = 0.7;
const ZOOM_SHOW_DETAILS = 1.2;
const ZOOM_SHOW_ROADS = 0.5;

// ─── Component ────────────────────────────────────────────

export default function MapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan/zoom state (refs for animation frame access)
  const transform = useRef({ x: 0, y: 0, scale: 0.5 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  // For tooltip positioning
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Store
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const hoveredNode = useGraphStore((s) => s.hoveredNode);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const activeCategory = useGraphStore((s) => s.activeCategory);
  const storeSelectNode = useGraphStore((s) => s.selectNode);
  const storeHoverNode = useGraphStore((s) => s.hoverNode);

  const { sectors, buildings, edges, totalWidth, totalHeight } = useMapLayout(
    analysisResult?.graph.nodes,
    analysisResult?.graph.links,
    typeFilters,
    complexityFilter,
    activeCategory,
  );

  // Build lookup maps for edges
  const buildingMap = useRef(new Map<string, MapBuilding>());
  useEffect(() => {
    const m = new Map<string, MapBuilding>();
    for (const b of buildings) m.set(b.id, b);
    buildingMap.current = m;
  }, [buildings]);

  // ─── Drawing ──────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const { x: tx, y: ty, scale } = transform.current;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, cw, ch);

    // Apply transform
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    // ─── Draw sectors ────────────────────────────────
    for (const sector of sectors) {
      const gmc = GM[sector.category] ?? GM_FALLBACK;

      // Background fill
      ctx.fillStyle = gmc.sectorBg;
      ctx.fillRect(sector.x, sector.y, sector.width, sector.height);

      // Solid border (no dash — Google Maps uses solid district borders)
      ctx.strokeStyle = gmc.sectorBorder;
      ctx.lineWidth = 1.5 / scale;
      ctx.setLineDash([]);
      ctx.strokeRect(sector.x, sector.y, sector.width, sector.height);

      // Sector label (always visible, like district names)
      const labelSize = Math.max(10, Math.min(24, 16 / scale));
      ctx.font = `bold ${labelSize}px ui-monospace, monospace`;
      ctx.fillStyle = gmc.sectorText;
      ctx.globalAlpha = scale < 0.5 ? 0.5 : 0.25;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labelText = sector.label;
      ctx.fillText(labelText, sector.x + sector.width / 2, sector.y + sector.height / 2);

      // Sub-label: file count + lines
      if (scale < ZOOM_SHOW_BUILDINGS) {
        const subSize = Math.max(8, labelSize * 0.6);
        ctx.font = `${subSize}px ui-monospace, monospace`;
        ctx.globalAlpha = 0.25;
        ctx.fillText(
          `${sector.fileCount} files · ${sector.totalLines.toLocaleString()} lines`,
          sector.x + sector.width / 2,
          sector.y + sector.height / 2 + labelSize + 4,
        );
      }
      ctx.globalAlpha = 1;
    }

    // ─── Draw roads (dependency edges) ───────────────
    if (scale >= ZOOM_SHOW_ROADS) {
      const bmap = buildingMap.current;

      for (const edge of edges) {
        const src = bmap.get(edge.sourceId);
        const tgt = bmap.get(edge.targetId);
        if (!src || !tgt) continue;

        const isHighlighted =
          selectedNode &&
          (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);

        ctx.strokeStyle = isHighlighted
          ? "rgba(66,133,244,0.7)"    // Google Maps selection blue
          : "rgba(150,150,150,0.35)"; // light gray road
        ctx.lineWidth = isHighlighted ? 2 / scale : 0.8 / scale;

        ctx.beginPath();
        ctx.moveTo(src.x + src.width / 2, src.y + src.height / 2);
        ctx.lineTo(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2);
        ctx.stroke();
      }
    }

    // ─── Draw buildings ──────────────────────────────
    if (scale >= ZOOM_SHOW_BUILDINGS) {
      for (const b of buildings) {
        // Viewport culling
        const sx = b.x * scale + tx;
        const sy = b.y * scale + ty;
        const sw = b.width * scale;
        const sh = b.height * scale;
        if (sx + sw < 0 || sx > cw || sy + sh < 0 || sy > ch) continue;

        const isSelected = selectedNode?.id === b.id;
        const isHovered = hoveredNode?.id === b.id;
        const gmc = GM[b.category] ?? GM_FALLBACK;

        // Building fill
        ctx.fillStyle = gmc.building;
        ctx.globalAlpha = isSelected || isHovered ? 1 : 0.85;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.globalAlpha = 1;

        // Building border
        if (isSelected) {
          ctx.strokeStyle = "#1A73E8"; // Google Maps selection blue
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(b.x, b.y, b.width, b.height);
        } else if (isHovered) {
          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.lineWidth = 1.5 / scale;
          ctx.strokeRect(b.x, b.y, b.width, b.height);
        } else {
          ctx.strokeStyle = "rgba(0,0,0,0.18)";
          ctx.lineWidth = 0.5 / scale;
          ctx.strokeRect(b.x, b.y, b.width, b.height);
        }

        // Risk indicator dot
        if (b.node.risk && b.node.risk !== "low") {
          const dotRadius = Math.max(2, 3 / scale);
          ctx.fillStyle = RISK_COLORS[b.node.risk] ?? "#22c55e";
          ctx.beginPath();
          ctx.arc(b.x + b.width - dotRadius - 2 / scale, b.y + dotRadius + 2 / scale, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Complexity bar at bottom
        if (scale >= ZOOM_SHOW_LABELS) {
          const cNum = complexityToNumber(b.node.complexity);
          const barW = (cNum / 100) * b.width;
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(b.x, b.y + b.height - 3 / scale, b.width, 3 / scale);
          ctx.fillStyle = gmc.building;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(b.x, b.y + b.height - 3 / scale, barW, 3 / scale);
          ctx.globalAlpha = 1;
        }

        // Labels (dark text on light buildings)
        if (scale >= ZOOM_SHOW_LABELS) {
          const fileName = b.id.split("/").pop() ?? b.id;
          const fontSize = Math.max(6, Math.min(11, 9 / scale));
          ctx.font = `${fontSize}px ui-monospace, monospace`;
          ctx.fillStyle = "#2D2D2D";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";

          const maxTextW = b.width - 4 / scale;
          let displayName = fileName;
          while (ctx.measureText(displayName).width > maxTextW && displayName.length > 3) {
            displayName = displayName.slice(0, -1);
          }
          if (displayName !== fileName) displayName += "…";
          ctx.fillText(displayName, b.x + 2 / scale, b.y + 2 / scale);

          if (scale >= ZOOM_SHOW_DETAILS) {
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            const detailSize = Math.max(5, fontSize * 0.8);
            ctx.font = `${detailSize}px ui-monospace, monospace`;
            ctx.fillText(`${b.node.lines}L`, b.x + 2 / scale, b.y + fontSize + 4 / scale);
          }
        }
      }
    }

    ctx.restore();

    // ─── Zoom indicator ──────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${Math.round(scale * 100)}%`, cw - 10, ch - 10);
  }, [sectors, buildings, edges, selectedNode, hoveredNode]);

  // ─── Animation loop ─────────────────────────────────

  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // ─── Center map initially ───────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalWidth === 0) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scaleX = cw / (totalWidth + 100);
    const scaleY = ch / (totalHeight + 100);
    const fitScale = Math.min(scaleX, scaleY, 1);

    transform.current = {
      scale: fitScale,
      x: (cw - totalWidth * fitScale) / 2,
      y: (ch - totalHeight * fitScale) / 2,
    };
  }, [totalWidth, totalHeight]);

  // ─── Hit testing ────────────────────────────────────

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { x: tx, y: ty, scale } = transform.current;
    return {
      wx: (screenX - tx) / scale,
      wy: (screenY - ty) / scale,
    };
  }, []);

  const hitTestBuilding = useCallback(
    (wx: number, wy: number): MapBuilding | null => {
      // Reverse order so topmost (last drawn) is hit first
      for (let i = buildings.length - 1; i >= 0; i--) {
        const b = buildings[i];
        if (wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height) {
          return b;
        }
      }
      return null;
    },
    [buildings],
  );

  const hitTestSector = useCallback(
    (wx: number, wy: number): MapSector | null => {
      for (const s of sectors) {
        if (wx >= s.x && wx <= s.x + s.width && wy >= s.y && wy <= s.y + s.height) {
          return s;
        }
      }
      return null;
    },
    [sectors],
  );

  // ─── Mouse handlers ─────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.current.x, y: e.clientY - transform.current.y };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isDragging.current) {
        transform.current.x = e.clientX - dragStart.current.x;
        transform.current.y = e.clientY - dragStart.current.y;
        document.body.style.cursor = "grabbing";
        return;
      }

      // Hit test for hover
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { wx, wy } = screenToWorld(mx, my);

      const scale = transform.current.scale;

      if (scale >= ZOOM_SHOW_BUILDINGS) {
        const hit = hitTestBuilding(wx, wy);
        if (hit) {
          storeHoverNode(hit.node);
          setTooltipPos({ x: mx, y: my });
          document.body.style.cursor = "pointer";
          return;
        }
      }

      // Check sector hover
      const sectorHit = hitTestSector(wx, wy);
      if (sectorHit) {
        document.body.style.cursor = "grab";
      } else {
        document.body.style.cursor = "grab";
      }

      if (hoveredNode) {
        storeHoverNode(null);
        setTooltipPos(null);
      }
    },
    [screenToWorld, hitTestBuilding, hitTestSector, storeHoverNode, hoveredNode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const wasDragging = isDragging.current;
      isDragging.current = false;
      document.body.style.cursor = "grab";

      // Only fire click if we didn't drag much
      if (wasDragging) {
        const dx = Math.abs(e.clientX - (dragStart.current.x + transform.current.x));
        const dy = Math.abs(e.clientY - (dragStart.current.y + transform.current.y));
        if (dx > 3 || dy > 3) return; // Was a real drag
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { wx, wy } = screenToWorld(mx, my);

      const scale = transform.current.scale;

      // Try building click first
      if (scale >= ZOOM_SHOW_BUILDINGS) {
        const hit = hitTestBuilding(wx, wy);
        if (hit) {
          storeSelectNode(hit.node);
          return;
        }
      }

      // Try sector click — zoom to fit
      const sectorHit = hitTestSector(wx, wy);
      if (sectorHit && scale < ZOOM_SHOW_BUILDINGS * 1.5) {
        const container = containerRef.current;
        if (!container) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const newScale = Math.min(
          cw / (sectorHit.width + 60),
          ch / (sectorHit.height + 60),
          MAX_ZOOM,
        );
        transform.current = {
          scale: newScale,
          x: cw / 2 - (sectorHit.x + sectorHit.width / 2) * newScale,
          y: ch / 2 - (sectorHit.y + sectorHit.height / 2) * newScale,
        };
        return;
      }

      // Click on empty space — deselect
      storeSelectNode(null);
    },
    [screenToWorld, hitTestBuilding, hitTestSector, storeSelectNode],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { x: tx, y: ty, scale: oldScale } = transform.current;
    const delta = -e.deltaY * ZOOM_SPEED;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * (1 + delta)));

    // Zoom toward cursor
    const wx = (mx - tx) / oldScale;
    const wy = (my - ty) / oldScale;

    transform.current = {
      scale: newScale,
      x: mx - wx * newScale,
      y: my - wy * newScale,
    };
  }, []);

  // Prevent default scroll on wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ─── Double-click: zoom in ──────────────────────────

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: tx, y: ty, scale: oldScale } = transform.current;
    const newScale = Math.min(MAX_ZOOM, oldScale * 2);

    const wx = (mx - tx) / oldScale;
    const wy = (my - ty) / oldScale;

    transform.current = {
      scale: newScale,
      x: mx - wx * newScale,
      y: my - wy * newScale,
    };
  }, []);

  if (!analysisResult) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ background: BG_COLOR, cursor: "grab" }}
    >
      <canvas
        ref={canvasRef}
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
        className="w-full h-full"
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const cx = container.clientWidth / 2;
            const cy = container.clientHeight / 2;
            const { x: tx, y: ty, scale } = transform.current;
            const newScale = Math.min(MAX_ZOOM, scale * 1.5);
            const wx = (cx - tx) / scale;
            const wy = (cy - ty) / scale;
            transform.current = { scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale };
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.95)", color: "#3D3D3D", border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        >
          +
        </button>
        <button
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const cx = container.clientWidth / 2;
            const cy = container.clientHeight / 2;
            const { x: tx, y: ty, scale } = transform.current;
            const newScale = Math.max(MIN_ZOOM, scale / 1.5);
            const wx = (cx - tx) / scale;
            const wy = (cy - ty) / scale;
            transform.current = { scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale };
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.95)", color: "#3D3D3D", border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        >
          −
        </button>
        <button
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            const scaleX = cw / (totalWidth + 100);
            const scaleY = ch / (totalHeight + 100);
            const fitScale = Math.min(scaleX, scaleY, 1);
            transform.current = {
              scale: fitScale,
              x: (cw - totalWidth * fitScale) / 2,
              y: (ch - totalHeight * fitScale) / 2,
            };
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold"
          style={{ background: "rgba(255,255,255,0.95)", color: "#3D3D3D", border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        >
          FIT
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGraphStore } from "@/store/graph-store";
import { RISK_COLORS } from "@/lib/graph-constants";
import { useMapLayout, type MapBuilding } from "../MapView/useMapLayout";

// ─── Geography — Bucharest ────────────────────────────────────────────────────
const CENTER_LAT = 44.4268;
const CENTER_LNG = 26.1025;
const LAT_SPAN   = 0.055;
const LNG_SPAN   = 0.085;

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  core:          "#C8955A",
  services:      "#4A9E40",
  utilities:     "#C89A20",
  qa:            "#8C5EBF",
  configuration: "#4A82B8",
};
const CAT_FALLBACK = "#888888";

// ─── Sector-cluster layout ────────────────────────────────────────────────────
function computePositions(
  buildings: MapBuilding[],
): Record<string, [number, number]> {
  const pos: Record<string, [number, number]> = {};
  if (buildings.length === 0) return pos;

  const sectorGroups = new Map<string, MapBuilding[]>();
  for (const b of buildings) {
    const arr = sectorGroups.get(b.sectorId) ?? [];
    arr.push(b);
    sectorGroups.set(b.sectorId, arr);
  }

  const sectorList = Array.from(sectorGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );
  const n = sectorList.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (LNG_SPAN / LAT_SPAN))));
  const rows = Math.max(1, Math.ceil(n / cols));

  const innerLatR = (LAT_SPAN * 0.72) / rows;
  const innerLngR = (LNG_SPAN * 0.72) / cols;

  sectorList.forEach(([, group], idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const sCenterLat = CENTER_LAT + LAT_SPAN * 0.4
      - (rows > 1 ? (row / (rows - 1)) * LAT_SPAN * 0.8 : 0);
    const sCenterLng = CENTER_LNG - LNG_SPAN * 0.4
      + (cols > 1 ? (col / (cols - 1)) * LNG_SPAN * 0.8 : 0);

    const m = group.length;
    const iCols = Math.max(1, Math.ceil(Math.sqrt(m)));
    const iRows = Math.ceil(m / iCols);

    group.forEach((b, j) => {
      const c = j % iCols;
      const r = Math.floor(j / iCols);
      pos[b.id] = [
        sCenterLat + (iRows > 1 ? ((r / (iRows - 1)) - 0.5) * innerLatR * 0.8 : 0),
        sCenterLng + (iCols > 1 ? ((c / (iCols - 1)) - 0.5) * innerLngR * 0.8 : 0),
      ];
    });
  });

  return pos;
}

// ─── Auto-fit helper ──────────────────────────────────────────────────────────
function MapFitter({ positions }: { positions: Record<string, [number, number]> }) {
  const map = useMap();
  useEffect(() => {
    const pts = Object.values(positions);
    if (pts.length === 0) return;
    const lats = pts.map(p => p[0]);
    const lngs = pts.map(p => p[1]);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [50, 50] },
    );
  }, [map, positions]);
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TileMapView() {
  const analysisResult   = useGraphStore((s) => s.analysisResult);
  const selectedNode     = useGraphStore((s) => s.selectedNode);
  const hoveredNode      = useGraphStore((s) => s.hoveredNode);
  const typeFilters      = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const activeCategory   = useGraphStore((s) => s.activeCategory);
  const storeSelectNode  = useGraphStore((s) => s.selectNode);
  const storeHoverNode   = useGraphStore((s) => s.hoverNode);

  const { buildings, edges } = useMapLayout(
    analysisResult?.graph.nodes,
    analysisResult?.graph.links,
    typeFilters,
    complexityFilter,
    activeCategory,
  );

  const positions = useMemo(() => computePositions(buildings), [buildings]);

  const buildingMap = useMemo(() => {
    const m: Record<string, MapBuilding> = {};
    for (const b of buildings) m[b.id] = b;
    return m;
  }, [buildings]);

  if (!analysisResult) return null;

  // Cap background edges for performance
  const MAX_BG_EDGES = 400;
  const highlightedEdges = selectedNode
    ? edges.filter(e => e.sourceId === selectedNode.id || e.targetId === selectedNode.id)
    : [];
  const highlightedSet = new Set(
    highlightedEdges.map(e => `${e.sourceId}→${e.targetId}`),
  );
  const bgEdges = edges
    .filter(e => !highlightedSet.has(`${e.sourceId}→${e.targetId}`))
    .slice(0, MAX_BG_EDGES);

  return (
    <MapContainer
      center={[CENTER_LAT, CENTER_LNG]}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
      zoomControl
    >
      {/* ── Carto Voyager — free, no API key, Google Maps-like style ── */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      <MapFitter positions={positions} />

      {/* ── Background dependency lines ── */}
      {bgEdges.map((edge, i) => {
        const src = positions[edge.sourceId];
        const tgt = positions[edge.targetId];
        if (!src || !tgt) return null;
        return (
          <Polyline
            key={`bg-${i}`}
            positions={[src, tgt]}
            pathOptions={{ color: "#6688AA", weight: 1, opacity: 0.22 }}
          />
        );
      })}

      {/* ── Highlighted dependency lines ── */}
      {highlightedEdges.map((edge, i) => {
        const src = positions[edge.sourceId];
        const tgt = positions[edge.targetId];
        if (!src || !tgt) return null;
        return (
          <Polyline
            key={`hl-${i}`}
            positions={[src, tgt]}
            pathOptions={{ color: "#4285F4", weight: 2.5, opacity: 0.9 }}
          />
        );
      })}

      {/* ── Node markers ── */}
      {buildings.map((b) => {
        const pos        = positions[b.id];
        if (!pos) return null;

        const isSelected = selectedNode?.id === b.id;
        const isHovered  = hoveredNode?.id  === b.id;
        const baseColor  = CAT_COLORS[b.category] ?? CAT_FALLBACK;
        const riskColor  = b.node.risk && b.node.risk !== "low"
          ? (RISK_COLORS[b.node.risk as keyof typeof RISK_COLORS] ?? undefined)
          : undefined;
        const radius = Math.max(5, Math.min(18, b.width * 0.35));

        return (
          <CircleMarker
            key={b.id}
            center={pos}
            radius={isSelected ? radius + 4 : isHovered ? radius + 2 : radius}
            pathOptions={{
              color:       isSelected ? "#1A73E8" : isHovered ? "#222" : "rgba(0,0,0,0.3)",
              fillColor:   riskColor ?? baseColor,
              fillOpacity: isSelected || isHovered ? 1 : 0.82,
              weight:      isSelected ? 3 : isHovered ? 2 : 1,
            }}
            eventHandlers={{
              click:     () => storeSelectNode(b.node),
              mouseover: () => storeHoverNode(b.node),
              mouseout:  () => storeHoverNode(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -radius - 4]} opacity={0.97}>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {b.id.split("/").pop()}
                </div>
                <div style={{ color: "#555" }}>
                  {b.node.lines} lines &middot; {b.node.imports} deps
                </div>
                {b.node.risk && b.node.risk !== "low" && (
                  <div style={{ color: riskColor, textTransform: "capitalize", marginTop: 2 }}>
                    {b.node.risk} risk
                  </div>
                )}
                <div style={{ color: "#888", marginTop: 1, fontSize: 10 }}>
                  {b.id}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

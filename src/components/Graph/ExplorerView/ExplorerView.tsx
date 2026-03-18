"use client";

/**
 * ExplorerView — two modes:
 *  ▤ Arch  : Architecture Layers (default) — all nodes organised by NodeType,
 *             sized by importedBy count, with directed arrows on hover.
 *  ◉ Files : File-tree radial — folder drill-down, pixel-art icons.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { ChevronRight } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";
import {
  RISK_COLORS,
  NODE_COLORS,
  getCategory,
  type RiskLevel,
} from "@/lib/graph-constants";
import type { GraphNode, NodeType } from "@/types";

// ─── Config ────────────────────────────────────────────────────────────────────
const PIXEL_SCALE = 2; // canvas at ½ CSS res → CSS scales up
const MAX_PER_LAYER = 14; // cap nodes per arch layer (sorted by importance)

// ─── Palette ───────────────────────────────────────────────────────────────────
const BG        = "#080B10";
const HUB_COLOR = "#E07B54";

// ─── Architecture layer definitions ───────────────────────────────────────────
const ARCH_LAYERS = [
  {
    id: "entry",
    label: "ENTRY POINT",
    desc: "Where the app starts",
    types: ["entry"] as NodeType[],
    color: "#E07B54",
  },
  {
    id: "routing",
    label: "ROUTES & MIDDLEWARE",
    desc: "Handles incoming requests, auth, logging",
    types: ["route", "controller", "middleware"] as NodeType[],
    color: "#D4A857",
  },
  {
    id: "services",
    label: "SERVICES",
    desc: "Business logic lives here",
    types: ["service"] as NodeType[],
    color: "#6BAF7C",
  },
  {
    id: "models",
    label: "MODELS / DATA",
    desc: "Data shapes and database schemas",
    types: ["model"] as NodeType[],
    color: "#5B9BD5",
  },
  {
    id: "utils",
    label: "UTILITIES",
    desc: "Shared helpers used everywhere",
    types: ["util"] as NodeType[],
    color: "#D4A857",
  },
  {
    id: "config",
    label: "CONFIG & TESTS",
    desc: "Settings, environment, and test files",
    types: ["config", "test"] as NodeType[],
    color: "#9C7FCB",
  },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CanvasNode {
  node: GraphNode;
  x: number;
  y: number;
  layerIdx: number;
  layerColor: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  graphNode?: GraphNode;
}

interface RadialNode {
  item: TreeNode;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

interface HoverRing {
  x: number; y: number;
  r: number; alpha: number;
  color: string;
}

interface NavAnim {
  active: boolean;
  progress: number;
  targetNodes: RadialNode[];
  cx: number;
  cy: number;
}

// ─── Tree builder (file-tree mode) ────────────────────────────────────────────
function buildTree(nodes: GraphNode[]): TreeNode {
  const root: TreeNode = { name: "/", path: "", type: "folder", children: [] };
  for (const gn of nodes) {
    const parts = gn.id.replace(/^\//, "").split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      let child = cur.children.find(
        (c) => c.name === seg && c.type === "folder",
      );
      if (!child) {
        child = {
          name: seg,
          path: parts.slice(0, i + 1).join("/"),
          type: "folder",
          children: [],
        };
        cur.children.push(child);
      }
      cur = child;
    }
    const fn = parts[parts.length - 1];
    if (!cur.children.find((c) => c.name === fn)) {
      cur.children.push({
        name: fn,
        path: gn.id,
        type: "file",
        children: [],
        graphNode: gn,
      });
    }
  }
  return root;
}

// ─── Color / size helpers ──────────────────────────────────────────────────────
function nodeColor(node: GraphNode): string {
  if (node.risk && node.risk in RISK_COLORS)
    return RISK_COLORS[node.risk as RiskLevel];
  return NODE_COLORS[getCategory(node.type)].dot;
}

function treeColor(item: TreeNode): string {
  if (item.type === "folder") return HUB_COLOR;
  const gn = item.graphNode;
  if (!gn) return "#8b949e";
  return nodeColor(gn);
}

// Nodes sized by how many other files import them (architectural importance)
function layerNodeHalf(node: GraphNode): number {
  const iby = node.importedBy ?? 0;
  if (iby >= 8) return 20;
  if (iby >= 5) return 17;
  if (iby >= 3) return 14;
  if (iby >= 1) return 11;
  return 9;
}

function radialNodeHalf(item: TreeNode): number {
  if (item.type === "folder") return 18;
  const c = item.graphNode?.complexity;
  if (c === "high") return 16;
  if (c === "medium") return 13;
  return 10;
}

// ─── Pixel helpers ─────────────────────────────────────────────────────────────
const px = Math.floor;

function fr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  ctx.fillRect(px(x), px(y), px(w), px(h));
}

// ─── Drawing: background ───────────────────────────────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.028)";
  for (let x = 0; x <= W; x += 8) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y <= H; y += 8) ctx.fillRect(0, y, W, 1);

  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.3,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── Drawing: architecture layer bands ────────────────────────────────────────
function drawLayerBands(
  ctx: CanvasRenderingContext2D,
  activeLayers: typeof ARCH_LAYERS[number][],
  layerYs: number[],
  W: number,
  overflows: Map<string, number>,
): void {
  activeLayers.forEach((layer, i) => {
    const y = layerYs[i];
    if (y === undefined) return;

    // Subtle band fill
    ctx.fillStyle = layer.color + "09";
    fr(ctx, 0, y - 22, W, 44);

    // Dashed separator
    ctx.fillStyle = layer.color + "25";
    fr(ctx, 0, y - 22, W, 1);

    // Label
    ctx.fillStyle = layer.color + "99";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`[ ${layer.label} ]`, 6, px(y - 13));

    // Description
    ctx.fillStyle = layer.color + "55";
    ctx.font = "6px monospace";
    ctx.fillText(layer.desc, 6, px(y - 5));

    // Overflow badge
    const overflow = overflows.get(layer.id) ?? 0;
    if (overflow > 0) {
      ctx.fillStyle = layer.color + "77";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${overflow} more ›`, W - 8, px(y));
      ctx.textAlign = "left";
    }
  });
}

// ─── Drawing: directed arrow (on hover) ───────────────────────────────────────
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  dashOff: number,
  flowDown: boolean,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const nx = dx / len;
  const ny = dy / len;

  ctx.save();
  ctx.strokeStyle = color + "bb";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = flowDown ? -dashOff : dashOff;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // Pixel arrowhead
  const ax = x2 - nx * 7;
  const ay = y2 - ny * 7;
  const px2 = -ny * 3.5;
  const py2 = nx * 3.5;
  ctx.fillStyle = color + "dd";
  ctx.beginPath();
  ctx.moveTo(px(x2), px(y2));
  ctx.lineTo(px(ax + px2), px(ay + py2));
  ctx.lineTo(px(ax - px2), px(ay - py2));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Drawing: pixel star badge (★ entry) ──────────────────────────────────────
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
): void {
  const p = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 0, 1, 0, 0],
  ];
  ctx.fillStyle = color;
  p.forEach((row, ry) =>
    row.forEach((on, rx) => {
      if (on) ctx.fillRect(px(x + rx), px(y + ry), 1, 1);
    }),
  );
}

// ─── Drawing: pixel warning badge (⚠ risk) ────────────────────────────────────
function drawWarn(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
): void {
  const p = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1],
  ];
  ctx.fillStyle = color;
  p.forEach((row, ry) =>
    row.forEach((on, rx) => {
      if (on) ctx.fillRect(px(x + rx), px(y + ry), 1, 1);
    }),
  );
}

// ─── Drawing: layers mode node ────────────────────────────────────────────────
function drawLayerNode(
  ctx: CanvasRenderingContext2D,
  cn: CanvasNode,
  hovered: boolean,
  frame: number,
  idx: number,
): void {
  const { node, x, y } = cn;
  const s    = layerNodeHalf(node);
  const col  = cn.layerColor; // use layer color so same-layer nodes share tone
  const nodeCol = nodeColor(node); // actual color (risk override)
  const displayCol = node.risk && node.risk in RISK_COLORS ? nodeCol : col;
  const bob  = Math.sin((frame + idx * 23) * 0.012) * 2;
  const cy_  = y + px(bob);
  const fold = px(s * 0.4);

  // Body fill
  ctx.fillStyle = displayCol + (hovered ? "30" : "18");
  fr(ctx, x - s, cy_ - s, s * 2 - fold, s * 2);
  fr(ctx, x + s - fold, cy_ - s + fold, fold, s * 2 - fold);

  // Pixel border
  ctx.fillStyle = hovered ? displayCol : displayCol + "bb";
  fr(ctx, x - s, cy_ - s, s * 2 - fold, 2);
  fr(ctx, x - s, cy_ + s - 2, s * 2, 2);
  fr(ctx, x - s, cy_ - s, 2, s * 2);
  fr(ctx, x + s - 2, cy_ - s + fold, 2, s * 2 - fold);
  fr(ctx, x + s - fold - 2, cy_ - s, 2, fold);
  fr(ctx, x + s - fold, cy_ - s + fold - 2, fold + 2, 2);

  // Content lines
  ctx.fillStyle = displayCol + "44";
  for (let i = 0; i < 3; i++) {
    const lw = i === 2 ? px(s * 0.8) : px(s * 1.35);
    fr(ctx, x - s + 3, cy_ - px(s * 0.28) + i * px(s * 0.46), lw, 2);
  }

  // importedBy dots at bottom (shows architectural centrality)
  const iby = Math.min(node.importedBy ?? 0, 6);
  ctx.fillStyle = displayCol + "77";
  for (let i = 0; i < iby; i++) {
    fr(ctx, x - s + 3 + i * 5, cy_ + s - 5, 3, 3);
  }

  // ★ Start-here badge (entry nodes)
  if (node.type === "entry") {
    drawStar(ctx, x + s - 2, cy_ - s - 7, "#E07B54");
  }

  // ⚠ Risk badge
  if (node.risk === "high" || node.risk === "critical") {
    const rCol = RISK_COLORS[node.risk as RiskLevel];
    drawWarn(ctx, x - s - 1, cy_ - s - 6, rCol);
  }

  // Name label
  const name = node.id.split("/").pop() ?? node.id;
  ctx.fillStyle = hovered ? displayCol : displayCol + "cc";
  ctx.font = `${s > 13 ? 7 : 6}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    name.length > 9 ? name.slice(0, 8) + "…" : name,
    px(x),
    px(cy_ + s + 3),
  );

  // importedBy count (importance indicator)
  if ((node.importedBy ?? 0) > 0) {
    ctx.fillStyle = displayCol + "66";
    ctx.font = "6px monospace";
    ctx.fillText(`×${node.importedBy}`, px(x), px(cy_ + s + 11));
  }
}

// ─── Drawing: on-canvas tooltip ───────────────────────────────────────────────
function drawTooltip(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  nx: number,
  ny: number,
  W: number,
  H: number,
): void {
  const name = node.id.split("/").pop() ?? node.id;
  const raw  = node.description || "No description available.";
  const col  = nodeColor(node);

  // Word-wrap description into ≤3 lines of ≤28 chars
  const words = raw.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + word).length > 28) {
      if (cur) lines.push(cur.trimEnd());
      cur = word + " ";
    } else {
      cur += word + " ";
    }
    if (lines.length >= 3) break;
  }
  if (cur && lines.length < 3) lines.push(cur.trimEnd());

  const tipW = 126;
  const tipH = 26 + lines.length * 9 + 18;

  let tx = nx + 28;
  let ty = ny - tipH / 2;
  if (tx + tipW > W - 4) tx = nx - tipW - 28;
  if (ty < 4) ty = 4;
  if (ty + tipH > H - 4) ty = H - tipH - 4;

  // Box
  ctx.fillStyle = "rgba(5,8,14,0.96)";
  fr(ctx, tx, ty, tipW, tipH);

  // Left accent strip
  ctx.fillStyle = col + "66";
  fr(ctx, tx, ty, 3, tipH);

  // Border
  ctx.fillStyle = col + "44";
  fr(ctx, tx, ty, tipW, 1);
  fr(ctx, tx, ty + tipH - 1, tipW, 1);
  fr(ctx, tx, ty, 1, tipH);
  fr(ctx, tx + tipW - 1, ty, 1, tipH);

  // File name
  ctx.fillStyle = col;
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(
    name.length > 17 ? name.slice(0, 16) + "…" : name,
    px(tx + 7),
    px(ty + 5),
  );

  // Type tag
  ctx.fillStyle = col + "88";
  ctx.font = "6px monospace";
  ctx.fillText(`[${node.type}]  ${node.lines}L`, px(tx + 7), px(ty + 14));

  // Divider
  ctx.fillStyle = col + "33";
  fr(ctx, tx + 5, ty + 22, tipW - 10, 1);

  // Description lines
  ctx.fillStyle = "rgba(200,210,220,0.82)";
  ctx.font = "6px monospace";
  lines.forEach((line, i) => {
    ctx.fillText(line, px(tx + 7), px(ty + 26 + i * 9));
  });

  // Stats row
  const statsY = ty + 26 + lines.length * 9 + 3;
  ctx.fillStyle = col + "77";
  ctx.fillText(
    `imports ${node.imports} · used by ${node.importedBy}`,
    px(tx + 7),
    px(statsY),
  );

  // Risk chip
  if (node.risk && node.risk in RISK_COLORS) {
    const rc = RISK_COLORS[node.risk as RiskLevel];
    ctx.fillStyle = rc;
    ctx.textAlign = "right";
    ctx.fillText(`⚠ ${node.risk}`, px(tx + tipW - 5), px(statsY));
    ctx.textAlign = "left";
  }
}

// ─── Drawing: HUD ─────────────────────────────────────────────────────────────
function drawHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  nodes: GraphNode[],
): void {
  const bw = 104;
  const bh = 80;
  const bx = W - bw - 4;
  const by = H - bh - 4;

  ctx.fillStyle = "rgba(5,8,14,0.92)";
  fr(ctx, bx, by, bw, bh);

  ctx.fillStyle = HUB_COLOR + "44";
  fr(ctx, bx, by, bw, 1);
  fr(ctx, bx, by + bh - 1, bw, 1);
  fr(ctx, bx, by, 1, bh);
  fr(ctx, bx + bw - 1, by, 1, bh);

  ctx.fillStyle = HUB_COLOR + "cc";
  ctx.font = "bold 6px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("█ REPO INTEL", px(bx + 5), px(by + 5));

  ctx.fillStyle = HUB_COLOR + "33";
  fr(ctx, bx + 4, by + 14, bw - 8, 1);

  const totalFiles     = nodes.length;
  const criticalRisk   = nodes.filter(
    (n) => n.risk === "critical" || n.risk === "high",
  ).length;
  const entryNode      = nodes.find((n) => n.type === "entry");
  const mostImported   = [...nodes].sort(
    (a, b) => (b.importedBy ?? 0) - (a.importedBy ?? 0),
  )[0];
  const entryName      = entryNode
    ? (entryNode.id.split("/").pop() ?? "?").slice(0, 9)
    : "none";
  const hubName        = mostImported
    ? (mostImported.id.split("/").pop() ?? "?").slice(0, 9)
    : "none";

  const rows: [string, string, boolean][] = [
    ["Files",   `${totalFiles}`,               false],
    ["Risk ⚠",  criticalRisk > 0 ? `${criticalRisk} files` : "clean", criticalRisk > 0],
    ["Entry ★", entryName,                     false],
    ["Hub",     hubName,                        false],
  ];

  rows.forEach(([label, value, isRisk], ri) => {
    const ry = by + 18 + ri * 14;
    ctx.fillStyle = "rgba(139,148,158,0.65)";
    ctx.font = "6px monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, px(bx + 5), px(ry));
    ctx.fillStyle = isRisk ? RISK_COLORS.high : "rgba(230,237,243,0.88)";
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "right";
    ctx.fillText(value, px(bx + bw - 5), px(ry));
  });
}

// ─── Drawing: radial hub ──────────────────────────────────────────────────────
function drawHub(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  label: string,
  frame: number,
): void {
  const pulse = Math.sin(frame * 0.015) * 1.5;
  const s = px(18 + pulse);

  ctx.save();
  ctx.globalAlpha = 0.18 + Math.sin(frame * 0.02) * 0.08;
  ctx.strokeStyle = HUB_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.lineDashOffset = -(frame * 0.1);
  ctx.strokeRect(
    px(cx - s - 8), px(cy - s - 8),
    px((s + 8) * 2), px((s + 8) * 2),
  );
  ctx.restore();

  ctx.fillStyle = HUB_COLOR + "1c";
  fr(ctx, cx - s, cy - s, s * 2, s * 2);

  ctx.fillStyle = HUB_COLOR;
  fr(ctx, cx - s, cy - s, s * 2, 2);
  fr(ctx, cx - s, cy + s - 2, s * 2, 2);
  fr(ctx, cx - s, cy - s, 2, s * 2);
  fr(ctx, cx + s - 2, cy - s, 2, s * 2);

  const ca = 4;
  ctx.fillStyle = HUB_COLOR + "dd";
  fr(ctx, cx - s - 1, cy - s - 1, ca, ca);
  fr(ctx, cx + s - ca + 1, cy - s - 1, ca, ca);
  fr(ctx, cx - s - 1, cy + s - ca + 1, ca, ca);
  fr(ctx, cx + s - ca + 1, cy + s - ca + 1, ca, ca);

  ctx.fillStyle = HUB_COLOR;
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.length > 9 ? label.slice(0, 8) + "…" : label, px(cx), px(cy));
}

// ─── Drawing: radial edge ─────────────────────────────────────────────────────
function drawRadialEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string, dashOff: number, alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -dashOff;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.restore();
}

// ─── Drawing: radial folder icon ─────────────────────────────────────────────
function drawFolder(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  s: number, color: string,
  hov: boolean, bob: number, item: TreeNode,
): void {
  const bcy = cy + px(bob);
  const tabW = px(s * 0.85);

  ctx.fillStyle = color + "20";
  fr(ctx, cx - s, bcy - s - 4, tabW, 4);
  ctx.fillStyle = color + (hov ? "30" : "18");
  fr(ctx, cx - s, bcy - s, s * 2, s * 2);

  ctx.fillStyle = hov ? color : color + "bb";
  fr(ctx, cx - s, bcy - s - 4, tabW, 2);
  fr(ctx, cx - s + tabW, bcy - s, s * 2 - tabW, 2);
  fr(ctx, cx - s, bcy - s, 2, s * 2);
  fr(ctx, cx + s - 2, bcy - s, 2, s * 2);
  fr(ctx, cx - s, bcy + s - 2, s * 2, 2);

  const count = Math.min(item.children.length, 5);
  ctx.fillStyle = color + "66";
  for (let i = 0; i < count; i++) fr(ctx, cx - s + 4 + i * 6, bcy - 1, 4, 3);

  ctx.fillStyle = hov ? color : color + "cc";
  ctx.font = `bold ${s > 15 ? 7 : 6}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    item.name.length > 9 ? item.name.slice(0, 8) + "…" : item.name,
    px(cx), px(bcy + s + 4),
  );
  ctx.fillStyle = color + "66";
  ctx.font = "6px monospace";
  ctx.fillText(`[${item.children.length}]`, px(cx), px(bcy + s + 12));
}

// ─── Drawing: radial file icon ────────────────────────────────────────────────
function drawFile(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  s: number, color: string,
  hov: boolean, bob: number, item: TreeNode,
): void {
  const bcy  = cy + px(bob);
  const fold = px(s * 0.42);

  ctx.fillStyle = color + (hov ? "28" : "14");
  fr(ctx, cx - s, bcy - s, s * 2 - fold, s * 2);
  fr(ctx, cx + s - fold, bcy - s + fold, fold, s * 2 - fold);

  ctx.fillStyle = hov ? color : color + "bb";
  fr(ctx, cx - s, bcy - s, s * 2 - fold, 2);
  fr(ctx, cx - s, bcy + s - 2, s * 2, 2);
  fr(ctx, cx - s, bcy - s, 2, s * 2);
  fr(ctx, cx + s - 2, bcy - s + fold, 2, s * 2 - fold);
  fr(ctx, cx + s - fold - 2, bcy - s, 2, fold);
  fr(ctx, cx + s - fold, bcy - s + fold - 2, fold + 2, 2);

  ctx.fillStyle = color + "44";
  for (let i = 0; i < 3; i++) {
    fr(ctx, cx - s + 3, bcy - px(s * 0.3) + i * px(s * 0.48), px(i === 2 ? s * 0.85 : s * 1.4), 2);
  }

  const gn = item.graphNode;
  if (gn?.risk && gn.risk in RISK_COLORS) {
    ctx.fillStyle = RISK_COLORS[gn.risk as RiskLevel];
    fr(ctx, cx + s - fold - 1, bcy - s + fold + 2, 4, 4);
  }

  ctx.fillStyle = hov ? color : color + "cc";
  ctx.font = `${s > 12 ? 7 : 6}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    item.name.length > 9 ? item.name.slice(0, 8) + "…" : item.name,
    px(cx), px(bcy + s + 4),
  );
  if (gn) {
    ctx.fillStyle = color + "66";
    ctx.font = "6px monospace";
    ctx.fillText(`${gn.lines}L`, px(cx), px(bcy + s + 12));
  }
}

// ─── Drawing: particles / rings / flash ───────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  for (const pt of ps) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.fillStyle = pt.color;
    ctx.fillRect(px(pt.x), px(pt.y), pt.size, pt.size);
    ctx.restore();
  }
}

function drawRings(ctx: CanvasRenderingContext2D, rings: HoverRing[]): void {
  for (const r of rings) {
    ctx.save();
    ctx.globalAlpha = r.alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(px(r.x - r.r), px(r.y - r.r), px(r.r * 2), px(r.r * 2));
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawFlash(ctx: CanvasRenderingContext2D, W: number, H: number, f: number): void {
  if (f <= 0) return;
  ctx.fillStyle = `rgba(224,123,84,${f * 0.18})`;
  ctx.fillRect(0, 0, W, H);
}

// ─── Layout: layers ───────────────────────────────────────────────────────────
function layoutLayers(
  nodes: GraphNode[], W: number, H: number, maxPerLayer?: number,
): { nodes: CanvasNode[]; overflows: Map<string, number> } {
  const active = ARCH_LAYERS.filter((l) =>
    nodes.some((n) => l.types.includes(n.type)),
  );
  const result: CanvasNode[] = [];
  const overflows = new Map<string, number>();

  active.forEach((layer, li) => {
    const allLayerNodes = nodes
      .filter((n) => layer.types.includes(n.type))
      .sort((a, b) => (b.importedBy ?? 0) - (a.importedBy ?? 0));

    const layerNodes = maxPerLayer
      ? allLayerNodes.slice(0, maxPerLayer)
      : allLayerNodes;
    if (allLayerNodes.length > layerNodes.length) {
      overflows.set(layer.id, allLayerNodes.length - layerNodes.length);
    }

    const y = (li + 1) / (active.length + 1) * H;
    layerNodes.forEach((node, ni) => {
      result.push({
        node,
        x: (ni + 1) / (layerNodes.length + 1) * W,
        y,
        layerIdx: li,
        layerColor: layer.color,
      });
    });
  });

  return { nodes: result, overflows };
}

// ─── Layout: radial ───────────────────────────────────────────────────────────
function layoutRadial(node: TreeNode, W: number, H: number): RadialNode[] {
  const cx = W / 2;
  const cy = H / 2;
  const folders = node.children.filter((i) => i.type === "folder");
  const files   = node.children.filter((i) => i.type === "file");
  const result: RadialNode[] = [];

  // Use most of the canvas — elliptical so landscape canvases feel wide
  const totalItems = folders.length + files.length;
  // Minimum spacing between node centers to avoid overlap
  const MIN_SPACING = 52;
  const minRFromCount = (Math.max(totalItems, 4) * MIN_SPACING) / (2 * Math.PI);

  const baseRx = W * 0.44;
  const baseRy = H * 0.40;
  const outerRx = Math.max(baseRx, minRFromCount * (W / Math.min(W, H)));
  const outerRy = Math.max(baseRy, minRFromCount * (H / Math.min(W, H)));
  const innerRx = outerRx * 0.55;
  const innerRy = outerRy * 0.55;

  folders.forEach((item, i) => {
    const angle = (i / Math.max(folders.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const rx = folders.length === 1 ? 0 : innerRx;
    const ry = folders.length === 1 ? 0 : innerRy;
    result.push({ item, baseX: cx + Math.cos(angle) * rx, baseY: cy + Math.sin(angle) * ry, x: cx, y: cy });
  });
  files.forEach((item, i) => {
    const off   = files.length > 0 ? Math.PI / Math.max(files.length, 1) : 0;
    const angle = (i / Math.max(files.length, 1)) * Math.PI * 2 - Math.PI / 2 + off;
    result.push({ item, baseX: cx + Math.cos(angle) * outerRx, baseY: cy + Math.sin(angle) * outerRy, x: cx, y: cy });
  });
  return result;
}

// ─── Particles factory ────────────────────────────────────────────────────────
function burst(x: number, y: number, color: string): Particle[] {
  return Array.from({ length: 12 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 5,
    vy: (Math.random() - 0.9) * 5,
    life: 1, color,
    size: Math.random() < 0.5 ? 2 : 4,
  }));
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ExplorerView(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const graphNodes = useGraphStore((s) => s.analysisResult?.graph.nodes ?? []);
  const graphLinks = useGraphStore((s) => s.analysisResult?.graph.links ?? []);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode  = useGraphStore((s) => s.hoverNode);

  const [mode, setMode]           = useState<"layers" | "radial">("layers");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll]     = useState(false);

  // Radial mode tree
  const tree = useMemo(() => buildTree(graphNodes), [graphNodes]);
  const [stack, setStack] = useState<TreeNode[]>([tree]);
  useEffect(() => { setStack([tree]); }, [tree]);
  const current    = stack[stack.length - 1];
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);

  // Connection map for arrows in layers mode
  const connMap = useMemo(() => {
    const m = new Map<string, { imports: string[]; importedBy: string[] }>();
    for (const lnk of graphLinks) {
      if (!m.has(lnk.source)) m.set(lnk.source, { imports: [], importedBy: [] });
      if (!m.has(lnk.target)) m.set(lnk.target, { imports: [], importedBy: [] });
      m.get(lnk.source)!.imports.push(lnk.target);
      m.get(lnk.target)!.importedBy.push(lnk.source);
    }
    return m;
  }, [graphLinks]);

  // ── All animation / data state in refs ────────────────────────────────────
  const layerLayoutRef  = useRef<CanvasNode[]>([]);
  const radialLayoutRef = useRef<RadialNode[]>([]);
  const hoveredRef      = useRef<CanvasNode | RadialNode | null>(null);
  const particlesRef    = useRef<Particle[]>([]);
  const ringsRef        = useRef<HoverRing[]>([]);
  const frameRef        = useRef(0);
  const dashOffRef      = useRef(0);
  const flashRef        = useRef(0);
  const searchRef       = useRef("");
  const rafRef          = useRef<number | null>(null);
  const modeRef         = useRef(mode);
  const graphNodesRef   = useRef(graphNodes);
  const connMapRef      = useRef(connMap);
  const showAllRef      = useRef(showAll);
  const layerOverflowsRef = useRef<Map<string, number>>(new Map());
  const navAnimRef      = useRef<NavAnim>({
    active: false, progress: 0, targetNodes: [], cx: 0, cy: 0,
  });

  useEffect(() => { searchRef.current    = searchQuery; }, [searchQuery]);
  useEffect(() => { modeRef.current      = mode;        }, [mode]);
  useEffect(() => { graphNodesRef.current = graphNodes; }, [graphNodes]);
  useEffect(() => { connMapRef.current   = connMap;     }, [connMap]);
  useEffect(() => { showAllRef.current   = showAll;     }, [showAll]);

  const getWH = useCallback(
    () => ({ W: canvasRef.current?.width ?? 0, H: canvasRef.current?.height ?? 0 }),
    [],
  );

  // ── Main draw ──────────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = getWH();
    const frame  = frameRef.current;
    const sq     = searchRef.current.toLowerCase();
    const isL    = modeRef.current === "layers";

    drawBg(ctx, W, H);
    drawFlash(ctx, W, H, flashRef.current);

    if (isL) {
      // ── Architecture layers ────────────────────────────────────────────────
      const nodes    = layerLayoutRef.current;
      const allNodes = graphNodesRef.current;
      const active   = ARCH_LAYERS.filter((l) =>
        allNodes.some((n) => l.types.includes(n.type)),
      );
      const layerYs  = active.map((_, li) => (li + 1) / (active.length + 1) * H);

      drawLayerBands(ctx, active, layerYs, W, layerOverflowsRef.current);

      // Arrows on hover
      const hov = hoveredRef.current as CanvasNode | null;
      if (hov?.node) {
        const conns = connMapRef.current.get(hov.node.id);
        if (conns) {
          conns.imports.slice(0, 6).forEach((tid) => {
            const t = nodes.find((n) => n.node.id === tid);
            if (t) drawArrow(ctx, hov.x, hov.y, t.x, t.y, nodeColor(hov.node), dashOffRef.current, true);
          });
          conns.importedBy.slice(0, 6).forEach((sid) => {
            const s = nodes.find((n) => n.node.id === sid);
            if (s) drawArrow(ctx, s.x, s.y, hov.x, hov.y, nodeColor(s.node), dashOffRef.current, false);
          });
        }
      }

      // Nodes
      nodes.forEach((cn, i) => {
        const name = cn.node.id.split("/").pop() ?? "";
        const match = sq === "" || name.toLowerCase().includes(sq) || cn.node.id.toLowerCase().includes(sq);
        ctx.save();
        ctx.globalAlpha = sq !== "" && !match ? 0.1 : 1;
        drawLayerNode(ctx, cn, hoveredRef.current === cn, frame, i);
        ctx.restore();
      });

      // On-canvas tooltip
      if (hov?.node) drawTooltip(ctx, hov.node, hov.x, hov.y, W, H);

      // HUD
      drawHUD(ctx, W, H, allNodes);

    } else {
      // ── Radial file tree ───────────────────────────────────────────────────
      const nodes = radialLayoutRef.current;
      const cx = W / 2;
      const cy = H / 2;
      const lbl = currentRef.current.name === "/" ? "root" : currentRef.current.name;
      drawHub(ctx, cx, cy, lbl, frame);

      nodes.forEach((nd, i) => {
        const col   = treeColor(nd.item);
        const match = sq === "" || nd.item.name.toLowerCase().includes(sq);
        const alpha = sq !== "" && !match ? 0.1 : 1;

        drawRadialEdge(ctx, cx, cy, nd.x, nd.y, col, dashOffRef.current, alpha);
        const bob = Math.sin((frame + i * 23) * 0.012) * 2.5;
        const s   = radialNodeHalf(nd.item);
        const h   = hoveredRef.current === nd;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (nd.item.type === "folder") drawFolder(ctx, nd.x, nd.y, s, col, h, bob, nd.item);
        else drawFile(ctx, nd.x, nd.y, s, col, h, bob, nd.item);
        ctx.restore();
      });
    }

    drawRings(ctx, ringsRef.current);
    drawParticles(ctx, particlesRef.current);
  }, [getWH]);

  // ── Persistent rAF loop ────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      frameRef.current++;
      dashOffRef.current = (dashOffRef.current + 0.12) % 16;
      if (flashRef.current > 0)
        flashRef.current = Math.max(0, flashRef.current - 0.04);

      // Radial nav animation
      const nav = navAnimRef.current;
      if (nav.active) {
        nav.progress = Math.min(nav.progress + 0.065, 1);
        const ease = 1 - Math.pow(1 - nav.progress, 3);
        radialLayoutRef.current = nav.targetNodes.map((nd) => ({
          ...nd,
          x: nav.cx + (nd.baseX - nav.cx) * ease,
          y: nav.cy + (nd.baseY - nav.cy) * ease,
        }));
        if (nav.progress >= 1) {
          nav.active = false;
          radialLayoutRef.current = nav.targetNodes.map((nd) => ({ ...nd, x: nd.baseX, y: nd.baseY }));
        }
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      particlesRef.current.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.91; p.life -= 0.04;
      });

      ringsRef.current = ringsRef.current.filter((r) => r.alpha > 0);
      ringsRef.current.forEach((r) => { r.r += 1.5; r.alpha -= 0.025; });

      drawFrame();
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [drawFrame]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resize = () => {
      canvas.width  = Math.floor(container.offsetWidth  / PIXEL_SCALE);
      canvas.height = Math.floor(container.offsetHeight / PIXEL_SCALE);
      const W = canvas.width, H = canvas.height;
      const lr0 = layoutLayers(graphNodesRef.current, W, H, showAllRef.current ? undefined : MAX_PER_LAYER);
      layerLayoutRef.current  = lr0.nodes;
      layerOverflowsRef.current = lr0.overflows;
      if (!navAnimRef.current.active) {
        const t = layoutRadial(currentRef.current, W, H);
        radialLayoutRef.current = t.map((nd) => ({ ...nd, x: nd.baseX, y: nd.baseY }));
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-layout on mode/data/current change ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const { W, H } = getWH();
    hoveredRef.current = null;
    hoverNode(null);
    flashRef.current = 0.4;

    if (mode === "layers") {
      const lr1 = layoutLayers(graphNodes, W, H, showAllRef.current ? undefined : MAX_PER_LAYER);
      layerLayoutRef.current = lr1.nodes;
      layerOverflowsRef.current = lr1.overflows;
    } else {
      if (!navAnimRef.current.active) {
        const t = layoutRadial(current, W, H);
        radialLayoutRef.current = t.map((nd) => ({ ...nd, x: nd.baseX, y: nd.baseY }));
      }
    }
  }, [mode, graphNodes, current, getWH, hoverNode]);

  // ── Re-layout when showAll toggle changes ─────────────────────────────────
  useEffect(() => {
    if (mode !== "layers") return;
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const { W, H } = getWH();
    const lr2 = layoutLayers(graphNodesRef.current, W, H, showAll ? undefined : MAX_PER_LAYER);
    layerLayoutRef.current = lr2.nodes;
    layerOverflowsRef.current = lr2.overflows;
  }, [showAll, mode, getWH]);

  // ── Radial navigation ─────────────────────────────────────────────────────
  const goInto = useCallback((item: TreeNode) => {
    if (item.type !== "folder") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const t = layoutRadial(item, W, H);
    flashRef.current = 0.85;
    particlesRef.current.push(...burst(W / 2, H / 2, HUB_COLOR));
    navAnimRef.current = { active: true, progress: 0, targetNodes: t, cx: W / 2, cy: H / 2 };
    setStack((prev) => [...prev, item]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const parent = prev[prev.length - 2];
      const canvas = canvasRef.current;
      if (canvas) {
        const W = canvas.width, H = canvas.height;
        const t = layoutRadial(parent, W, H);
        flashRef.current = 0.55;
        navAnimRef.current = { active: true, progress: 0, targetNodes: t, cx: W / 2, cy: H / 2 };
      }
      return prev.slice(0, -1);
    });
  }, []);

  const goToIdx = useCallback((idx: number) => {
    setStack((prev) => {
      if (idx >= prev.length - 1) return prev;
      const node = prev[idx];
      const canvas = canvasRef.current;
      if (canvas) {
        const W = canvas.width, H = canvas.height;
        const t = layoutRadial(node, W, H);
        flashRef.current = 0.55;
        navAnimRef.current = { active: true, progress: 0, targetNodes: t, cx: W / 2, cy: H / 2 };
      }
      return prev.slice(0, idx + 1);
    });
  }, []);

  // ── Mouse / click ─────────────────────────────────────────────────────────
  const cssToCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { mx: 0, my: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      mx: (e.clientX - rect.left) / PIXEL_SCALE,
      my: (e.clientY - rect.top)  / PIXEL_SCALE,
    };
  }, []);

  const findAt = useCallback((mx: number, my: number): CanvasNode | RadialNode | null => {
    if (modeRef.current === "layers") {
      for (const cn of layerLayoutRef.current) {
        const s = layerNodeHalf(cn.node) + 6;
        if (Math.abs(mx - cn.x) <= s && Math.abs(my - cn.y) <= s) return cn;
      }
    } else {
      for (const nd of radialLayoutRef.current) {
        const s = radialNodeHalf(nd.item) + 6;
        if (Math.abs(mx - nd.x) <= s && Math.abs(my - nd.y) <= s) return nd;
      }
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = cssToCanvas(e);
    const found = findAt(mx, my);
    if (hoveredRef.current !== found) {
      if (found) {
        const isL  = modeRef.current === "layers";
        const x    = isL ? (found as CanvasNode).x   : (found as RadialNode).x;
        const y    = isL ? (found as CanvasNode).y   : (found as RadialNode).y;
        const col  = isL ? nodeColor((found as CanvasNode).node) : treeColor((found as RadialNode).item);
        const s    = isL ? layerNodeHalf((found as CanvasNode).node) : radialNodeHalf((found as RadialNode).item);
        ringsRef.current.push({ x, y, r: s + 3, alpha: 0.75, color: col });
        hoverNode(
          isL ? (found as CanvasNode).node : ((found as RadialNode).item.graphNode ?? null),
        );
      } else {
        hoverNode(null);
      }
      hoveredRef.current = found;
    }
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = found ? "pointer" : "default";
  }, [cssToCanvas, findAt, hoverNode]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    hoverNode(null);
  }, [hoverNode]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = cssToCanvas(e);
    const found = findAt(mx, my);
    if (!found) return;

    const isL = modeRef.current === "layers";
    if (isL) {
      const cn = found as CanvasNode;
      particlesRef.current.push(...burst(cn.x, cn.y, nodeColor(cn.node)));
      flashRef.current = 0.4;
      selectNode(cn.node);
    } else {
      const rn = found as RadialNode;
      particlesRef.current.push(...burst(rn.x, rn.y, treeColor(rn.item)));
      if (rn.item.type === "folder") goInto(rn.item);
      else if (rn.item.graphNode) { flashRef.current = 0.4; selectNode(rn.item.graphNode); }
    }
  }, [cssToCanvas, findAt, goInto, selectNode]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full" style={{ background: BG }}>

      {/* ── Topbar ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Mode toggle */}
        <div
          className="flex items-center gap-1 rounded p-0.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(["layers", "radial"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-2 py-1 rounded text-[10px] font-mono transition-all"
              style={
                mode === m
                  ? { background: "rgba(224,123,84,0.85)", color: "#fff" }
                  : { color: "rgba(139,148,158,0.7)" }
              }
            >
              {m === "layers" ? "▤ Arch" : "◉ Files"}
            </button>
          ))}
        </div>

        {/* Radial breadcrumb */}
        {mode === "radial" && (
          <>
            <button
              onClick={goBack}
              disabled={stack.length <= 1}
              className="px-2.5 py-1 rounded text-xs font-mono transition-all"
              style={{
                background: stack.length <= 1 ? "rgba(255,255,255,0.03)" : "rgba(224,123,84,0.12)",
                color:      stack.length <= 1 ? "rgba(255,255,255,0.18)" : "rgba(224,123,84,0.9)",
                border:     stack.length <= 1 ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(224,123,84,0.35)",
                cursor:     stack.length <= 1 ? "not-allowed" : "pointer",
              }}
            >
              ← back
            </button>
            <div className="flex items-center gap-1 flex-wrap">
              {stack.map((node, i) => (
                <React.Fragment key={node.path || "root"}>
                  <button
                    onClick={() => i < stack.length - 1 && goToIdx(i)}
                    className="text-xs font-mono truncate max-w-[100px]"
                    style={{
                      color:      i === stack.length - 1 ? "rgba(224,123,84,0.92)" : "rgba(139,148,158,0.6)",
                      cursor:     i < stack.length - 1 ? "pointer" : "default",
                      fontWeight: i === stack.length - 1 ? 600 : 400,
                    }}
                  >
                    {node.name === "/" ? "~" : node.name}
                  </button>
                  {i < stack.length - 1 && (
                    <ChevronRight
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: "rgba(61,68,77,0.9)" }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </>
        )}

        {/* Layers: show-all toggle + hint */}
        {mode === "layers" && (
          <>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="px-2 py-1 rounded text-[10px] font-mono transition-all"
              style={
                showAll
                  ? { background: "rgba(224,123,84,0.2)", color: "rgba(224,123,84,0.9)", border: "1px solid rgba(224,123,84,0.35)" }
                  : { background: "rgba(255,255,255,0.03)", color: "rgba(139,148,158,0.6)", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              {showAll ? "all nodes" : `top ${MAX_PER_LAYER}`}
            </button>
            <span className="text-[10px] font-mono" style={{ color: "rgba(139,148,158,0.35)" }}>
              hover to trace connections
            </span>
          </>
        )}

        <div className="flex-1" />

        <input
          type="text"
          placeholder="search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs font-mono rounded px-2.5 py-1 outline-none w-32 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: searchQuery
              ? "1px solid rgba(224,123,84,0.55)"
              : "1px solid rgba(255,255,255,0.08)",
            color: "rgba(230,237,243,0.9)",
          }}
        />
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 relative overflow-hidden" style={{ zIndex: 0 }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: "auto" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
      </div>

      {/* ── Legend ── */}
      <div
        className="flex items-center gap-4 px-4 py-2 flex-shrink-0 flex-wrap"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {[
          { label: "core / entry",  color: HUB_COLOR },
          { label: "routes",        color: "#D4A857" },
          { label: "services",      color: NODE_COLORS.services.dot },
          { label: "models",        color: "#5B9BD5" },
          { label: "utils",         color: NODE_COLORS.utilities.dot },
          { label: "qa / config",   color: NODE_COLORS.qa.dot },
          { label: "risk ⚠",        color: RISK_COLORS.high },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color: "rgba(139,148,158,0.6)" }}>
              {label}
            </span>
          </div>
        ))}
        <span className="ml-auto text-[10px] font-mono" style={{ color: "rgba(139,148,158,0.3)" }}>
          {mode === "layers"
            ? "node size = how many files import it (importance)"
            : "[click] folder to drill in · [click] file to inspect"}
        </span>
      </div>
    </div>
  );
}

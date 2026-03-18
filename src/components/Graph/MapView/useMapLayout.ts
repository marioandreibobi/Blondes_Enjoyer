import { useMemo } from "react";
import type { GraphNode, GraphLink, NodeType } from "@/types";
import { getCategory, NODE_COLORS, STORE_CATEGORY_MAP, type CategoryType } from "@/lib/graph-constants";

// ─── Public types ─────────────────────────────────────────

export interface MapSector {
  id: string;
  label: string;        // short folder name
  streetName: string;   // full Romanian street name
  category: CategoryType;
  gridCol: number;
  gridRow: number;
  cx: number;           // card centre x (world)
  cy: number;           // card centre y (world)
  cardW: number;
  cardH: number;
  // compat rectangle (= card bounding box)
  x: number; y: number; width: number; height: number;
  radius: number;
  totalLines: number;
  fileCount: number;
}

export interface MapBuilding {
  id: string;
  node: GraphNode;
  sectorId: string;
  x: number;       // absolute world centre of the file square
  y: number;
  width: number;   // file-square width  (world units)
  height: number;  // file-square height (world units, fixed = FILE_H)
  color: string;
  category: CategoryType;
}

export interface MapEdge {
  sourceId: string;
  targetId: string;
}

export interface MapLayoutResult {
  sectors: MapSector[];
  buildings: MapBuilding[];
  edges: MapEdge[];
  gridCols: number;
  gridRows: number;
  cellW: number;
  cellH: number;
  roadW: number;
  mapMargin: number;
  totalWidth: number;
  totalHeight: number;
}

// ─── Layout constants ─────────────────────────────────────

const ROAD_W   = 72;  // white road band width
const BLOCK_W  = 285; // gray city-block width
const BLOCK_H  = 228; // gray city-block height
const MARGIN   = 88;  // outer margin (also road-like)
export const CELL_W = BLOCK_W + ROAD_W;  // 357
export const CELL_H = BLOCK_H + ROAD_W;  // 300

const CARD_PAD  = 14; // card inner padding
const HEADER_H  = 40; // card header (name + file count)
const FILE_H    = 18; // file square height (fixed)
const FILE_GAP  = 4;  // gap between squares

// ─── Helpers ──────────────────────────────────────────────

function matchesCategory(node: GraphNode, activeCategory: string | null): boolean {
  if (!activeCategory) return true;
  return STORE_CATEGORY_MAP[activeCategory]?.includes(getCategory(node.type)) ?? true;
}

function filterNodes(
  nodes: GraphNode[],
  typeFilters: Set<NodeType>,
  complexityFilter: string,
  activeCategory: string | null,
): GraphNode[] {
  return nodes.filter((n) => {
    if (typeFilters.has(n.type)) return false;
    if (complexityFilter !== "all" && n.complexity !== complexityFilter) return false;
    if (!matchesCategory(n, activeCategory)) return false;
    return true;
  });
}

function getSectorPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 1) return "(root)";
  if (parts.length === 2) return parts[0];
  return `${parts[0]}/${parts[1]}`;
}

function dominantCategory(files: GraphNode[]): CategoryType {
  const counts = new Map<CategoryType, number>();
  for (const f of files) {
    const cat = getCategory(f.type);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let best: CategoryType = "core";
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) { best = cat; bestCount = count; }
  }
  return best;
}

/** Romanian street prefix based on file count */
function streetName(folderLabel: string, fileCount: number): string {
  const n = folderLabel.toUpperCase().replace(/[/_\-]/g, " ").replace(/\s+/g, " ").trim();
  if (fileCount >= 12) return `BULEVARDUL ${n}`;
  if (fileCount >= 7)  return `STRADA ${n}`;
  if (fileCount >= 4)  return `CALEA ${n}`;
  if (fileCount >= 2)  return `ALEEA ${n}`;
  return `PIATA ${n}`;
}

/** File square width proportional to lines of code */
function fileSquareW(lines: number): number {
  return Math.max(14, Math.min(38, Math.sqrt(lines) * 1.8 + 10));
}

/** How many grid columns to use given N sectors */
function computeCols(n: number): number {
  if (n <= 2)  return 2;
  if (n <= 6)  return 2;
  if (n <= 12) return 3;
  return 4;
}

interface FileLayout {
  file: GraphNode;
  lx: number; // local x (from card content top-left)
  ly: number; // local y
  fw: number;
}

/** Compute card dimensions and file-square layout within the card */
function computeCardLayout(
  files: GraphNode[],
  maxCardW: number,
): { cardW: number; cardH: number; fileLayouts: FileLayout[] } {
  if (files.length === 0) {
    return { cardW: 120, cardH: HEADER_H + CARD_PAD, fileLayouts: [] };
  }

  const maxContentW = maxCardW - CARD_PAD * 2;
  const sorted = [...files].sort((a, b) => b.lines - a.lines);

  const fileLayouts: FileLayout[] = [];
  let curX = 0, curY = 0, usedW = 0;

  for (const file of sorted) {
    const fw = fileSquareW(file.lines);
    if (curX + fw > maxContentW && curX > 0) {
      curX = 0;
      curY += FILE_H + FILE_GAP;
    }
    fileLayouts.push({ file, lx: curX + fw / 2, ly: curY + FILE_H / 2, fw });
    curX += fw + FILE_GAP;
    usedW = Math.max(usedW, curX - FILE_GAP);
  }

  const contentH = curY + FILE_H;
  const cardW = Math.max(100, Math.min(maxCardW, usedW + CARD_PAD * 2));
  const cardH = HEADER_H + contentH + CARD_PAD;

  return { cardW, cardH, fileLayouts };
}

// ─── Hook ─────────────────────────────────────────────────

export function useMapLayout(
  nodes: GraphNode[] | undefined,
  links: GraphLink[] | undefined,
  typeFilters: Set<NodeType>,
  complexityFilter: string,
  activeCategory: string | null,
): MapLayoutResult {
  return useMemo(() => {
    const empty: MapLayoutResult = {
      sectors: [], buildings: [], edges: [],
      gridCols: 0, gridRows: 0,
      cellW: CELL_W, cellH: CELL_H, roadW: ROAD_W, mapMargin: MARGIN,
      totalWidth: 0, totalHeight: 0,
    };

    if (!nodes || !links) return empty;

    const filtered = filterNodes(nodes, typeFilters, complexityFilter, activeCategory);
    if (filtered.length === 0) return empty;

    // Group into sectors
    const sectorFiles = new Map<string, GraphNode[]>();
    const rootFiles: GraphNode[] = [];
    for (const node of filtered) {
      const sid = getSectorPath(node.id);
      if (sid === "(root)") {
        rootFiles.push(node);
      } else {
        const arr = sectorFiles.get(sid) ?? [];
        arr.push(node);
        sectorFiles.set(sid, arr);
      }
    }

    // Sort sectors: most files first
    const sorted = Array.from(sectorFiles.entries())
      .sort((a, b) => b[1].length - a[1].length);

    const n       = sorted.length;
    const cols    = computeCols(n);
    const rows    = Math.ceil(n / cols);

    const maxCardW = BLOCK_W - 30;

    const sectors: MapSector[]  = [];
    const allBuildings: MapBuilding[] = [];

    sorted.forEach(([sid, files], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cat  = dominantCategory(files);
      const label = sid.split("/").pop() ?? sid;

      // Card centre in world space
      const cx = MARGIN + ROAD_W + col * CELL_W + BLOCK_W / 2;
      const cy = MARGIN + ROAD_W + row * CELL_H + BLOCK_H / 2;

      const { cardW, cardH, fileLayouts } = computeCardLayout(files, maxCardW);

      // Card top-left
      const cardX = cx - cardW / 2;
      const cardY = cy - cardH / 2;
      // File content start
      const contentX = cardX + CARD_PAD;
      const contentY = cardY + HEADER_H;

      sectors.push({
        id: sid,
        label,
        streetName: streetName(label, files.length),
        category: cat,
        gridCol: col,
        gridRow: row,
        cx, cy,
        cardW, cardH,
        x: cardX, y: cardY, width: cardW, height: cardH,
        radius: Math.max(cardW, cardH) / 2,
        totalLines: files.reduce((s, f) => s + f.lines, 0),
        fileCount: files.length,
      });

      for (const { file, lx, ly, fw } of fileLayouts) {
        const bcat = getCategory(file.type);
        allBuildings.push({
          id: file.id,
          node: file,
          sectorId: sid,
          x: contentX + lx,
          y: contentY + ly,
          width: fw,
          height: FILE_H,
          color: NODE_COLORS[bcat].dot,
          category: bcat,
        });
      }
    });

    // Root (no-folder) files: scatter them in the margin areas
    rootFiles.forEach((file, i) => {
      const seed   = i * 37 + 1;
      const px     = (Math.sin(seed * 1.3) * 0.5 + 0.5) * (MARGIN - 20) + 10;
      const py     = (Math.sin(seed * 2.7) * 0.5 + 0.5) *
                     (MARGIN + ROAD_W + rows * CELL_H);
      const bcat   = getCategory(file.type);
      const fw     = fileSquareW(file.lines);
      allBuildings.push({
        id: file.id,
        node: file,
        sectorId: "(root)",
        x: px,
        y: py,
        width: fw,
        height: FILE_H,
        color: NODE_COLORS[bcat].dot,
        category: bcat,
      });
    });

    // Edges
    const idSet  = new Set(filtered.map((n) => n.id));
    const edges: MapEdge[] = links
      .filter((l) => idSet.has(l.source) && idSet.has(l.target))
      .map((l) => ({ sourceId: l.source, targetId: l.target }));

    const totalWidth  = MARGIN * 2 + ROAD_W + cols * CELL_W;
    const totalHeight = MARGIN * 2 + ROAD_W + rows * CELL_H;

    return {
      sectors, buildings: allBuildings, edges,
      gridCols: cols, gridRows: rows,
      cellW: CELL_W, cellH: CELL_H, roadW: ROAD_W, mapMargin: MARGIN,
      totalWidth, totalHeight,
    };
  }, [nodes, links, typeFilters, complexityFilter, activeCategory]);
}

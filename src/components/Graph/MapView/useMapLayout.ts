import { useMemo } from "react";
import type { GraphNode, GraphLink, NodeType } from "@/types";
import { getCategory, NODE_COLORS, STORE_CATEGORY_MAP, type CategoryType } from "@/lib/graph-constants";

// ─── Public types ─────────────────────────────────────────

export interface MapSector {
  id: string;            // directory path (e.g., "src/app")
  label: string;         // display name
  category: CategoryType;
  x: number;
  y: number;
  width: number;
  height: number;
  totalLines: number;
  fileCount: number;
}

export interface MapBuilding {
  id: string;            // file path
  node: GraphNode;
  sectorId: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  totalWidth: number;
  totalHeight: number;
}

// ─── Helpers ──────────────────────────────────────────────

const SECTOR_PADDING = 30;
const SECTOR_HEADER = 28;
const BUILDING_GAP = 4;
const MIN_BUILDING_SIZE = 12;
const MAX_BUILDING_SIZE = 60;
const STREET_WIDTH = 8;

function matchesCategory(node: GraphNode, activeCategory: string | null): boolean {
  if (!activeCategory) return true;
  const cat = getCategory(node.type);
  return STORE_CATEGORY_MAP[activeCategory]?.includes(cat) ?? true;
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

/** Get the top-level directory for grouping (first 2 path segments or root) */
function getSectorPath(filePath: string): string {
  const parts = filePath.split("/");
  // For paths like "src/app/api/route.ts" → "src/app"
  // For paths like "next.config.js" → "(root)"
  if (parts.length <= 1) return "(root)";
  if (parts.length === 2) return parts[0];
  return `${parts[0]}/${parts[1]}`;
}

/** Determine the dominant category for a sector based on its files */
function dominantCategory(files: GraphNode[]): CategoryType {
  const counts = new Map<CategoryType, number>();
  for (const f of files) {
    const cat = getCategory(f.type);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let best: CategoryType = "core";
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }
  return best;
}

/** Compute building size from lines of code */
function buildingSize(lines: number): number {
  const s = MIN_BUILDING_SIZE + Math.sqrt(lines) * 1.5;
  return Math.max(MIN_BUILDING_SIZE, Math.min(MAX_BUILDING_SIZE, s));
}

/** Simple squarified treemap layout for sectors */
function treemapLayout(
  sectors: Array<{ id: string; weight: number }>,
  containerWidth: number,
  containerHeight: number,
): Array<{ id: string; x: number; y: number; w: number; h: number }> {
  if (sectors.length === 0) return [];

  const totalWeight = sectors.reduce((s, sec) => s + sec.weight, 0);
  if (totalWeight === 0) return sectors.map((s) => ({ id: s.id, x: 0, y: 0, w: 50, h: 50 }));

  // Sort by weight descending for better aspect ratios
  const sorted = [...sectors].sort((a, b) => b.weight - a.weight);

  const results: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];

  function layoutSlice(
    items: Array<{ id: string; weight: number }>,
    x: number,
    y: number,
    w: number,
    h: number,
    sumWeight: number,
  ) {
    if (items.length === 0) return;
    if (items.length === 1) {
      results.push({ id: items[0].id, x, y, w, h });
      return;
    }

    // Split into two groups for better aspect ratios
    const horizontal = w >= h;
    let accum = 0;
    let splitIdx = 0;

    for (let i = 0; i < items.length; i++) {
      accum += items[i].weight;
      if (accum >= sumWeight / 2) {
        splitIdx = i + 1;
        break;
      }
    }
    splitIdx = Math.max(1, Math.min(items.length - 1, splitIdx));

    const group1 = items.slice(0, splitIdx);
    const group2 = items.slice(splitIdx);
    const w1 = group1.reduce((s, it) => s + it.weight, 0);
    const w2 = group2.reduce((s, it) => s + it.weight, 0);
    const ratio = w1 / (w1 + w2);

    if (horizontal) {
      const splitX = w * ratio;
      layoutSlice(group1, x, y, splitX - STREET_WIDTH / 2, h, w1);
      layoutSlice(group2, x + splitX + STREET_WIDTH / 2, y, w - splitX - STREET_WIDTH / 2, h, w2);
    } else {
      const splitY = h * ratio;
      layoutSlice(group1, x, y, w, splitY - STREET_WIDTH / 2, w1);
      layoutSlice(group2, x, y + splitY + STREET_WIDTH / 2, w, h - splitY - STREET_WIDTH / 2, w2);
    }
  }

  layoutSlice(sorted, 0, 0, containerWidth, containerHeight, totalWeight);
  return results;
}

/** Layout buildings within a sector in a grid */
function layoutBuildings(
  files: GraphNode[],
  sectorX: number,
  sectorY: number,
  sectorW: number,
  sectorH: number,
  sectorId: string,
): MapBuilding[] {
  const innerX = sectorX + SECTOR_PADDING;
  const innerY = sectorY + SECTOR_PADDING + SECTOR_HEADER;
  const innerW = sectorW - SECTOR_PADDING * 2;
  const innerH = sectorH - SECTOR_PADDING * 2 - SECTOR_HEADER;

  if (innerW <= 0 || innerH <= 0 || files.length === 0) return [];

  // Sort files by lines descending (big buildings first)
  const sorted = [...files].sort((a, b) => b.lines - a.lines);

  const buildings: MapBuilding[] = [];
  let curX = innerX;
  let curY = innerY;
  let rowHeight = 0;

  for (const file of sorted) {
    const size = buildingSize(file.lines);
    const bw = size;
    const bh = size * 0.75; // Slightly rectangular

    // Wrap to next row
    if (curX + bw > innerX + innerW) {
      curX = innerX;
      curY += rowHeight + BUILDING_GAP;
      rowHeight = 0;
    }

    // Overflow vertically — just keep placing (will be clipped)
    if (curY + bh > innerY + innerH && buildings.length > 0) {
      // Still place it, it'll be visible when zoomed in
    }

    const cat = getCategory(file.type);
    buildings.push({
      id: file.id,
      node: file,
      sectorId,
      x: curX,
      y: curY,
      width: bw,
      height: bh,
      color: NODE_COLORS[cat].dot,
      category: cat,
    });

    curX += bw + BUILDING_GAP;
    rowHeight = Math.max(rowHeight, bh);
  }

  return buildings;
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
    if (!nodes || !links) {
      return { sectors: [], buildings: [], edges: [], totalWidth: 0, totalHeight: 0 };
    }

    const filtered = filterNodes(nodes, typeFilters, complexityFilter, activeCategory);
    if (filtered.length === 0) {
      return { sectors: [], buildings: [], edges: [], totalWidth: 0, totalHeight: 0 };
    }

    // Group files by sector (top-level directory)
    const sectorFiles = new Map<string, GraphNode[]>();
    for (const node of filtered) {
      const sectorId = getSectorPath(node.id);
      const arr = sectorFiles.get(sectorId) ?? [];
      arr.push(node);
      sectorFiles.set(sectorId, arr);
    }

    // Compute sector weights (total lines)
    const sectorWeights = Array.from(sectorFiles.entries()).map(([id, files]) => ({
      id,
      weight: files.reduce((s, f) => s + f.lines, 0),
    }));

    // Find sector containing the most-imported file → place it first in the treemap
    // so it lands roughly in the center of the bisection split
    const maxImportedBy = Math.max(0, ...filtered.map((n) => n.importedBy));
    const centerFile = filtered.find((n) => n.importedBy === maxImportedBy);
    const centerSectorId = centerFile ? getSectorPath(centerFile.id) : null;

    const prioritizedWeights = centerSectorId
      ? [
          ...sectorWeights.filter((s) => s.id === centerSectorId),
          ...sectorWeights.filter((s) => s.id !== centerSectorId),
        ]
      : sectorWeights;

    // Compute total map size based on file count
    const totalLines = sectorWeights.reduce((s, sw) => s + sw.weight, 0);
    const scaleFactor = Math.max(1, Math.sqrt(totalLines / 500));
    const mapW = 600 * scaleFactor;
    const mapH = 450 * scaleFactor;

    // Layout sectors with treemap
    const sectorRects = treemapLayout(prioritizedWeights, mapW, mapH);

    // Build sectors + buildings
    const sectors: MapSector[] = [];
    const allBuildings: MapBuilding[] = [];

    for (const rect of sectorRects) {
      const files = sectorFiles.get(rect.id) ?? [];
      const cat = dominantCategory(files);

      sectors.push({
        id: rect.id,
        label: rect.id,
        category: cat,
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        totalLines: files.reduce((s, f) => s + f.lines, 0),
        fileCount: files.length,
      });

      const buildings = layoutBuildings(files, rect.x, rect.y, rect.w, rect.h, rect.id);
      allBuildings.push(...buildings);
    }

    // Build edge list
    const idSet = new Set(filtered.map((n) => n.id));
    const edges: MapEdge[] = links
      .filter((l) => idSet.has(l.source) && idSet.has(l.target))
      .map((l) => ({ sourceId: l.source, targetId: l.target }));

    return {
      sectors,
      buildings: allBuildings,
      edges,
      totalWidth: mapW,
      totalHeight: mapH,
    };
  }, [nodes, links, typeFilters, complexityFilter, activeCategory]);
}

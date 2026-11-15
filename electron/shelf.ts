import { BrowserWindow, shell, app } from "electron";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { basename } from "node:path";
import path from "node:path";

export interface ShelfItem {
  path: string;
  name: string;
  size: number;
  missing: boolean;
}

const MAX_ITEMS = 12;

let items: ShelfItem[] = [];

function file() {
  return path.join(app.getPath("userData"), "shelf.json");
}

function describe(p: string): ShelfItem {
  const name = basename(p) || p;
  try {
    const st = statSync(p);
    return { path: p, name, size: st.size, missing: false };
  } catch {
    return { path: p, name, size: 0, missing: true };
  }
}

export function loadShelf(): ShelfItem[] {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as { path?: string }[];
    items = raw
      .filter((x) => typeof x?.path === "string")
      .slice(0, MAX_ITEMS)
      .map((x) => describe(x.path as string));
  } catch {
    items = [];
  }
  return items;
}

function persist() {
  try {
    writeFileSync(file(), JSON.stringify(items.map((i) => ({ path: i.path })), null, 2), "utf8");
  } catch {}
}

export function getShelf(): ShelfItem[] {
  return items;
}

export function addToShelf(paths: unknown): ShelfItem[] {
  const list = Array.isArray(paths) ? paths : [paths];
  for (const p of list) {
    if (typeof p !== "string" || !p) continue;
    if (items.some((i) => i.path === p)) continue;
    items.unshift(describe(p));
  }
  items = items.slice(0, MAX_ITEMS);
  persist();
  return items;
}

export function removeFromShelf(p: string): ShelfItem[] {
  items = items.filter((i) => i.path !== p);
  persist();
  return items;
}

export function clearShelf(): ShelfItem[] {
  items = [];
  persist();
  return items;
}

export function openShelfItem(p: string) {
  if (existsSync(p)) shell.showItemInFolder(p);
}

export async function dragShelfItem(win: BrowserWindow | null, p: string) {
  if (!win || !existsSync(p)) return;
  try {
    const icon = await app.getFileIcon(p, { size: "small" });
    win.webContents.startDrag({ file: p, icon });
  } catch {}
}

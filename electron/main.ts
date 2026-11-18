import { app, BrowserWindow, ipcMain, screen, nativeImage, Tray, Menu, clipboard, Notification } from "electron";
import path from "node:path";
import { startMediaPolling, mediaCommand, mediaSeek } from "./media";
import { startSystemPolling } from "./system";
import { startForegroundPolling } from "./windowstate";
import { disposeWorkers } from "./ps";
import { loadSettings, getSettings, saveSettings, scaleFactor } from "./settings";
import { loadShelf, getShelf, addToShelf, removeFromShelf, clearShelf, openShelfItem, dragShelfItem } from "./shelf";

const isDev = process.env.NODE_ENV === "development" && !app.isPackaged;

let win: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let manualCompact: boolean | null = null;
let compactState = false;

const BASE_W = 470;
const BASE_H = 270;

// 16x16 opaque PNG (purple square + white dot) used only when no icon asset
// can be loaded, so the tray icon never ends up invisible.
const FALLBACK_TRAY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA8SURBVDhPY1jZ+v8/JZgBXYBUPJwNwAbQ1eA0AB9AV0t9AwgBdPUYBhAyBF0tbQzAZQi6GrwGEIuHgQEAG4xRjrquNPkAAAAASUVORK5CYII=";

function notchSize() {
  const s = scaleFactor();
  return { w: Math.round(BASE_W * s), h: Math.round(BASE_H * s) };
}

function targetDisplay() {
  const idx = getSettings().monitor;
  if (idx < 0) return screen.getPrimaryDisplay();
  const displays = screen.getAllDisplays();
  return displays[idx] ?? screen.getPrimaryDisplay();
}

function notchPosition(w: number, h: number) {
  const a = targetDisplay().workArea;
  return {
    x: Math.round(a.x + (a.width - w) / 2),
    y: Math.round(a.y),
  };
}

function resolveIcon() {
  const dirs = [
    path.join(__dirname, "../assets"),
    path.join(__dirname, "../resources"),
    path.join(process.resourcesPath || "", "assets"),
    path.join(process.resourcesPath || "", "app.asar.unpacked", "assets"),
  ];
  for (const d of dirs) {
    if (!d) continue;
    for (const f of ["icon.png", "icon.ico"]) {
      const p = path.join(d, f);
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img;
      } catch {}
    }
  }
  return undefined;
}

function applyBounds() {
  if (!win || win.isDestroyed()) return;
  const { w, h } = notchSize();
  const pos = notchPosition(w, h);
  win.setBounds({ x: pos.x, y: pos.y, width: w, height: h });
}

function createWindow() {
  const { w, h } = notchSize();
  const pos = notchPosition(w, h);

  win = new BrowserWindow({
    width: w,
    height: h,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.once("ready-to-show", () => win?.show());
  win.on("closed", () => (win = null));

  startMediaPolling((info) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send("media:update", info);
  });

  startSystemPolling((info) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send("system:update", info);
  });

  startForegroundPolling(
    () => {
      const b = targetDisplay().bounds;
      return { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
    },
    (state) => {
      const effective = manualCompact !== null ? manualCompact : state.compact;
      if (effective !== compactState) {
        compactState = effective;
        if (win && !win.isDestroyed()) win.webContents.send("notch:compact", effective);
      }
    }
  );
}

function createSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 460,
    height: 560,
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    title: "Pengaturan Raven",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    settingsWin.loadURL("http://localhost:5173/?settings");
  } else {
    settingsWin.loadFile(path.join(__dirname, "../dist/index.html"), { query: { settings: "1" } });
  }

  settingsWin.on("closed", () => (settingsWin = null));
}

function createTray() {
  const icon = resolveIcon();
  // Fallback: a 16x16 opaque image keeps the tray icon visible even if asset
  // loading fails, so the menu (Settings / Quit) stays reachable.
  const trayIcon = icon
    ? icon.resize({ width: 16, height: 16 })
    : nativeImage.createFromBuffer(Buffer.from(FALLBACK_TRAY_PNG, "base64")).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("Raven");
  const menu = Menu.buildFromTemplate([
    {
      label: "Show / Hide",
      click: () => {
        if (!win) return;
        if (win.isVisible()) win.hide();
        else win.showInactive();
      },
    },
    {
      label: "Ringkas / Tampil penuh",
      click: () => toggleCompact(),
    },
    {
      label: "Pengaturan…",
      click: () => createSettingsWindow(),
    },
    {
      label: "Reset position",
      click: () => {
        saveSettings({ x: null });
        applyBounds();
      },
    },
    { type: "separator" },
    {
      label: "Quit Raven",
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.showInactive();
  });
}

function applyAutostart(enabled: boolean) {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch {}
}

// ponytail: plain GitHub Releases check, no auto-download. Fires once per launch,
// notifies only when a newer tag exists. Upgrade to electron-updater if auto-install desired.
async function checkForUpdates() {
  try {
    const res = await fetch("https://api.github.com/repos/RiffaYP/R.A.V.E.N/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Raven" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { tag_name?: string };
    const latest = (data.tag_name || "").replace(/^v/i, "");
    if (!latest) return;
    const current = app.getVersion();
    if (compareVersions(latest, current) > 0 && Notification.isSupported()) {
      new Notification({
        title: "Raven versi baru tersedia",
        body: `v${latest} (kamu v${current}). Buka Releases untuk unduh.`,
        icon: resolveIcon(),
      }).show();
    }
  } catch {}
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

ipcMain.on("media:command", (_e, cmd: "toggle" | "next" | "prev") => mediaCommand(cmd));
ipcMain.on("media:seek", (_e, ms: number) => mediaSeek(ms));

ipcMain.on("win:clickthrough", (_e, ignore: boolean) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on("app:quit", () => {
  quitting = true;
  app.quit();
});

ipcMain.handle("shelf:get", () => getShelf());
ipcMain.handle("shelf:add", (_e, paths: string[]) => addToShelf(paths));
ipcMain.handle("shelf:remove", (_e, p: string) => removeFromShelf(p));
ipcMain.handle("shelf:clear", () => clearShelf());
ipcMain.on("shelf:open", (_e, p: string) => openShelfItem(p));
ipcMain.on("shelf:drag", (_e, p: string) => dragShelfItem(win, p));

// ponytail: todo reminders only fire while Raven is running.
ipcMain.on("todo:notify", (_e, payload: { text?: string; due?: number }) => {
  const text = String(payload?.text ?? "").slice(0, 120);
  if (!text) return;
  try {
    if (!Notification.isSupported()) return;
    new Notification({
      title: "Todo jatuh tempo",
      body: text,
      silent: false,
      icon: resolveIcon(),
    }).show();
  } catch {}
});

ipcMain.handle("clipboard:read", () => clipboard.readText());
ipcMain.handle("clipboard:write", (_e, text: string) => {
  clipboard.writeText(String(text ?? ""));
});

ipcMain.handle("settings:get", () => {
  const s = getSettings();
  return {
    ...s,
    displays: screen.getAllDisplays().map((d, i) => {
      const primary = d === screen.getPrimaryDisplay();
      return {
        index: i,
        label: `${primary ? "Layar utama" : `Layar ${i + 1}`} · ${d.bounds.width}×${d.bounds.height}`,
      };
    }),
  };
});

ipcMain.on("settings:open", () => createSettingsWindow());

function toggleCompact() {
  if (compactState) {
    manualCompact = false;
    compactState = false;
  } else {
    manualCompact = true;
    compactState = true;
  }
  if (win && !win.isDestroyed()) win.webContents.send("notch:compact", compactState);
}

ipcMain.on("notch:toggleCompact", () => toggleCompact());

function broadcastScale() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:scale", getSettings().scale);
}

function broadcastAccent() {
  if (!win || win.isDestroyed()) return;
  const s = getSettings();
  win.webContents.send("settings:accent", { mode: s.accentMode, color: s.accentColor });
}

function broadcastHour24() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:hour24", getSettings().hour24);
}

function broadcastMascot() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:mascot", getSettings().mascot);
}

function broadcastTheme() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:theme", getSettings().theme);
}

function broadcastShape() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:shape", getSettings().shape);
}

function broadcastGlow() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings:glow", getSettings().glow);
}

ipcMain.handle("settings:set", (_e, patch: Record<string, unknown>) => {
  if ("scale" in patch || "monitor" in patch) patch.x = null;
  const s = saveSettings(patch);
  if ("autostart" in patch) applyAutostart(s.autostart);
  if ("scale" in patch || "monitor" in patch || "x" in patch) applyBounds();
  if ("scale" in patch) broadcastScale();
  if ("accentMode" in patch || "accentColor" in patch) broadcastAccent();
  if ("hour24" in patch) broadcastHour24();
  if ("mascot" in patch) broadcastMascot();
  if ("theme" in patch) broadcastTheme();
  if ("shape" in patch) broadcastShape();
  if ("glow" in patch) broadcastGlow();
  return s;
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => win?.show());
  app.whenReady().then(() => {
    loadSettings();
    loadShelf();
    applyAutostart(getSettings().autostart);
    createWindow();
    createTray();
    setTimeout(() => checkForUpdates(), 5000);
  });
  app.on("before-quit", () => {
    quitting = true;
    tray?.destroy();
    tray = null;
    disposeWorkers();
  });  app.on("window-all-closed", () => {
    if (quitting) app.quit();
  });
}

# R.A.V.E.N

**Riffa's Autonomous Virtual Entity Navigation** — entitas virtual navigasi milik Riffa.

Aplikasi *notch* (poni) untuk Windows yang menempel di tengah-atas layar dan menampilkan
widget multi-halaman: musik, jam & kalender, pomodoro, status sistem, alat, jadwal sholat,
pengingat air, cuaca, dan terjemah. Berjalan diam-diam di background, memuat datanya sendiri,
dan hanya melebar saat kursor mendekat.

Dibangun dengan **Electron + React + TypeScript**.

---

## Fitur

| Halaman | Isi |
|---|---|
| **Musik** | Cover album, judul/artis, lirik sinkron (LRCLIB), progress + seek, kontrol prev/play/next, background blur dari cover |
| **Jam & Kalender** | Jam besar + detik, tanggal Indonesia, kalender bulanan |
| **Pomodoro** | Ring progres, mode Fokus/Istirahat, durasi atur, jalan lintas halaman |
| **Sistem** | Baterai & health, WiFi, Bluetooth (status + baterai GATT), Caps Lock, volume, kecerahan |
| **Alat** | To-do (dengan pengingat), Clipboard history, Shelf (drag file) |
| **Sholat** | 6 waktu dihitung offline (tanpa API), pilih kota, penanda waktu berikutnya |
| **Water** | Ring progres air minum, target 8 gelas, reset harian |
| **Cuaca** | Open-Meteo (tanpa API key): kondisi kini, strip 12 jam, prakiraan 7 hari |
| **Terjemah** | Terjemahan via Google Gemini, 9 bahasa, toggle transliterasi latin |

### Perilaku global
- **Idle peek** — notch tertutup bergantian jam ↔ judul lagu.
- **Raven mascot** — mata SVG ber-glow saat idle (bisa dimatikan).
- **Notifikasi transient** — melebar saat charger dicolok / headphone terhubung.
- **Auto-compact** — notch mengecil jadi strip mini saat ada fullscreen sungguhan.
- **Warna aksen** — preset atau mengikuti warna dominan cover album.
- **Tema mono gelap** dengan skala UI yang bisa diatur.

---

## Menjalankan

```powershell
npm install          # sekali
npm run dev          # dev: Vite + Electron (hot reload UI)
npm run build:ui     # typecheck + build UI
npm start            # build:ui lalu jalankan Electron
npm run build        # typecheck + build UI + electron-builder (exe)
```

Output build di `release/`:
- `Raven.exe` — portable (double-click, tanpa install)
- `Raven Setup x.y.z.exe` — installer NSIS

Catatan: tutup Raven lama sebelum build ulang (file `.exe` terkunci proses).
Klik kanan notch = keluar. Klik kanan tray = menu.

---

## Stack

- Electron 33 · React 19 · TypeScript 5.7 · Vite 6 · electron-builder 25
- Data: GSMTC (media), CIM/WinRT (sistem), Open-Meteo (cuaca), LRCLIB (lirik),
  iTunes (cover), Gemini (terjemah), perhitungan astronomi offline (sholat).
- Semua kredensial lokal (API key Gemini) disimpan di `settings.json` user data.

---

## Catatan build

`signAndEditExecutable: true` (icon ter-embed) butuh privilege symlink untuk extract
`winCodeSign`. Aktifkan **Windows Developer Mode** atau jalankan build sebagai admin.
Tanpa itu build gagal saat extract winCodeSign.

Data pengguna: `%APPDATA%\raven-tauri\` → `settings.json`, `shelf.json`, `covers\`.

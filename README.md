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
| **Musik** | Cover album (iTunes → Deezer), judul/artis, lirik sinkron (LRCLIB → lyrics.ovh) + jeda instrumen & marquee baris panjang, progress + seek (klik/geser), kontrol prev/play/next, background blur dari cover |
| **Jam & Kalender** | Jam besar + detik, tanggal Indonesia, kalender bulanan |
| **Pomodoro** | Ring progres, mode Fokus/Istirahat, durasi atur, jalan lintas halaman |
| **Sistem** | Baterai & health, WiFi, Bluetooth (status + baterai GATT), Caps Lock, volume, kecerahan |
| **Alat** | To-do (dengan pengingat), Clipboard history, Shelf (drag file) |
| **Sholat** | 6 waktu dihitung offline (tanpa API), pilih kota, penanda waktu berikutnya |
| **Water** | Ring progres air minum, target 8 gelas, reset harian |
| **Cuaca** | Open-Meteo (tanpa API key): kondisi kini, strip 12 jam, prakiraan 7 hari (muat penuh), retry otomatis saat jaringan gagal |
| **Terjemah** | Terjemahan via Google Gemini, 9 bahasa, toggle transliterasi latin |

### Perilaku global
- **Closed state hidup (Dynamic Island style)** — notch tertutup menampilkan breathing pulse saat Pomodoro aktif, dan mini audio visualizer 3 batang saat musik memutar.
- **Ringan di latar** — data diambil lewat worker PowerShell persisten (satu proses), bukan
  spawn proses baru tiap poll; lirik tetap sinkron ~500ms.
- **Idle peek** — notch tertutup bergantian jam ↔ judul lagu.
- **Raven mascot** — mata SVG ber-glow saat idle (bisa dimatikan).
- **Notifikasi transient** — melebar saat charger dicolok / headphone terhubung.
- **Auto-compact** — notch mengecil jadi strip mini saat ada fullscreen sungguhan.
- **Warna aksen** — preset atau mengikuti warna dominan cover album.
- **Glow cover** — aura tepi notch mengikuti aksen/cover, breathe halus hanya saat musik memutar (bisa dimatikan di Pengaturan).
- **Bentuk notch** — menempel ke tepi atas, melayang (pill), atau kaca translusen (tint + blur, bukan frosted sejati).
- **Visualizer** — badge bar di cover + strip di bawah artis, bergerak mengikuti posisi lagu.
- **Update check** — cek rilis GitHub sekali saat start; notifikasi bila ada versi baru (tanpa auto-download).
- **Tema mono gelap** (4 preset latar notch) dengan skala UI 75–130%.

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
- Data: GSMTC (media), CIM/WinRT (sistem), Open-Meteo (cuaca), LRCLIB → lyrics.ovh (lirik),
  iTunes → Deezer (cover), Gemini (terjemah), GitHub Releases (update check),
  perhitungan astronomi offline (sholat).
- Kredensial (API key Gemini) disimpan **terenkripsi** via `safeStorage` di `settings.json`
  user data (fallback plaintext hanya bila OS keychain tak tersedia).

---

## Catatan build

`signAndEditExecutable: true` (icon ter-embed) butuh privilege symlink untuk extract
`winCodeSign`. Aktifkan **Windows Developer Mode** atau jalankan build sebagai admin.
Tanpa itu build gagal saat extract winCodeSign.

Data pengguna: `%APPDATA%\raven-tauri\` → `settings.json`, `shelf.json`, `covers\`.

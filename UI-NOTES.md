# Catatan UI / Referensi

Observasi tampilan dari produk notch sejenis (**Poni** — poni.web.id, **Nusa** —
rama2555.github.io/nusa) yang relevan untuk penyempurnaan visual R.A.V.E.N.
Fokus: UI/tampilan, bukan fitur. Ukuran notch tidak diubah kecuali disebut.

---

## Pola UI yang diamati

1. **Closed-state hidup, bukan kosong**
   - Nusa: saat idle, jam memudar lalu muncul sepasang mata ("Nusa Mascot") yang
     tertidur, dan melambai saat kursor kembali.
   - Poni: lagu / sisa waktu fokus / rapat / tugas / earbuds tetap tampil di notch
     tertutup; jam tetap terlihat walau musik diputar.

2. **Live Activity di dalam notch**
   - Nusa: Pomodoro "berdenyut" (breathing) di notch tertutup.
   - Poni: hitung mundur fokus tampil saat notch tertutup.

3. **Status ring mengelilingi jam** — baterai atau progress air hari ini sebagai ring
   di sekeliling jam pada notch tertutup.

4. **Glow warna cover** — cover album dengan glow warna yang berganti + visualizer
   bergerak (Poni).

5. **Split-view lirik** — ketuk tombol lirik → notch terbelah dua, tiap baris menyala
   saat dinyanyikan, klik baris untuk lompat (Nusa).

6. **Widgets (2 sekaligus) di halaman sendiri** — minggu, sholat berikutnya, air,
   fokus, jam dunia, baterai, bulan, countdown (Nusa).

7. **Notifikasi pill** — pill pendek saat pesan masuk + halaman "Today" (Nusa).

8. **Tray menu kaya** — Start with Windows / Mascot on-off / Minimal notch / About /
   Exit (Nusa); Settings modul/tab default/glow/posisi (Poni).

9. **Varian closed-state** — "Floating style" & "Glass" (pill melayang, kaca frosted,
   ala Pro), "Minimal notch" (garis tipis).

10. **Feel** — animasi calm/breathing, micro-transition halus, identitas "ringan,
    native" (Nusa). Raven sudah pakai easing konsisten (`--ease`) dan tone gelap
    mono; arahnya sudah benar.

---

## Rekomendasi perbaikan UI untuk Raven (prioritas)

1. **Status ring di sekeliling jam** (baterai/air) — murah, elegan, khas.
2. **Live Activity compact**: timer Pomodoro/water berdenyut di notch tertutup.
3. **Split-view lirik + klik-seek** — fitur Nusa paling dipuji, "wow" factor.
4. **Glow cover** — ambient/ring tepi notch mengikuti aksen cover.
5. **Mascot idle** — karakter Raven (lihat bagian Mascot) muncul saat idle.
6. **Varian notch: minimal (garis) vs default** — tambah opsi di tray (compact sudah ada).

Catatan teknis: Raven berbasis Electron (bukan native Rust seperti Nusa), jadi target
"0% CPU idle" / animasi super ringan tidak realistis. Micro-interaction halus dan
status ring tetap murah dilakukan.

---

## Mascot (closed-state hidup)

Keinginan: karakter/ikon aplikasi (terinspirasi **Raven dari Teen Titans**) muncul di
notch tertutup saat idle — meniru pola "Nusa Mascot" (mata tertidur, melambai).

Sumber visual: `assets/RAVEN Logo.jpg` (wajah Raven ber-hood) + `assets/icon.ico/png`
yang sudah dibuat dari logo itu.

### Opsi implementasi

- **A. SVG hand-drawn sederhana** — sepasang mata bercahaya (ungu/putih) di bawah hood,
  animasi CSS (kedip, tidur, lambaian). Paling ringan, konsisten dengan `Icon.tsx`
  yang sudah SVG monokrom. Reuse gaya garis Raven.
- **B. Potong wajah dari logo JPEG** — crop area mata/wajah dari `RAVEN Logo.jpg`,
  render sebagai gambar kecil saat idle. Cepat jadi, tapi resolusi & gaya tak
  senyris SVG, dan JPEG punya latar (tak transparan).
- **C. Sprite/animasi frame** — beberapa frame PNG (mata buka/tutup, tidur, lambai).
  Paling ekspresif, tapi butuh aset tambahan dan berat di Electron.

Saran: **A** (SVG mata Raven + animasi CSS) — hemat, tajam di semua DPI, cocok dengan
tone & pola `Icon.tsx`. Bisa upgrade ke C bila mau animasi lebih hidup.

Perilaku (mengikuti Nusa):
- Notch tertutup & idle (tidak hover, tidak ada aktivitas) → jam memudar, mascot muncul.
- Setelah lama idle → "tidur" (mata menutup, breathing halus).
- Kursor kembali / ada aktivitas → melambai / mata terbuka, lalu jam kembali.
- Opsi on/off di Pengaturan atau tray.

Status: **sudah diimplementasikan** (opsi A). `src/components/RavenMascot.tsx` — mata Raven
SVG almond ber-glow ungu, animasi CSS (kedip acak, wave saat kursor datang). Saat notch idle,
isi bergantian **jam (8 dtk) ↔ mata (6 dtk)** berulang (mulai 4 dtk setelah idle). Toggle
"Mascot idle" di Pengaturan (setting `mascot`). Mood "tidur/napas" belum aktif karena jendela
tampil pendek (6 dtk); bisa ditambah bila perlu.

Baik, saya mengerti. Kamu ingin **PRD yang berfokus pada Model Bisnis SaaS (Software as a Service)**—bagaimana aplikasi ini bekerja sebagai sebuah perusahaan, bagaimana kamu mendapatkan uang (monetisasi), dan bagaimana operasionalnya berjalan dari sisi kamu sebagai **Founder**.

Ini adalah **Business & Product Requirements Document (B-PRD)** untuk **VibeClean**:

---

# **Business-PRD: VibeClean SaaS Platform**

## **1. Model Bisnis (The Core Business)**

VibeClean adalah platform **B2B (Business-to-Business)**. Kamu menyediakan infrastruktur teknologi bagi pemilik laundry agar mereka bisa menjalankan bisnisnya secara digital tanpa harus membangun aplikasi sendiri.

### **A. Strategi Monetisasi (Revenue Streams)**

Sebagai Founder, kamu mendapatkan uang dari tiga pintu:

1. **Subscription Fee (Langganan):** Biaya bulanan dari Owner Laundry untuk akses fitur Pro/Enterprise.
2. **Transaction Fee (Biaya Admin):** Kamu mengambil margin kecil (misal: Rp 500 - Rp 1.000) dari setiap transaksi yang menggunakan pembayaran digital Mayar.
3. **Add-on Services:** Penjualan kuota WhatsApp Notifikasi atau fitur Custom Domain.

---

## **2. Value Proposition (Nilai Jual)**

* **Ke Pemilik Laundry:** "Kelola 10 cabang semudah kelola 1 cabang. Pantau uang masuk secara real-time dari HP."
* **Ke Kasir:** "Input order cepat, gak perlu hitung manual, gak perlu takut salah hitung diskon."
* **Ke Pelanggan:** "Terima nota digital via WhatsApp dan bisa pantau status cucian kapan saja."

---

## **3. Spesifikasi Paket & Fitur (Packaging)**

| Fitur | **Starter (Gratis)** | **Pro (Berbayar)** | **Enterprise (SaaS Premium)** |
| --- | --- | --- | --- |
| **Harga** | Rp 0 / bulan | Rp 149.000 / bulan | Custom / Coming Soon |
| **Cabang** | Maksimal 1 Cabang | Multi-branch (Hingga 5) | Unlimited |
| **Transaksi** | Maksimal 100/bln | Unlimited | Unlimited |
| **Pembayaran** | QRIS & VA Mayar | QRIS, VA, Credit Card | Dedicated Payment Gateway |
| **Marketing** | - | Kupon & Paket Member | Custom Domain + Email |
| **Support** | Email | WhatsApp Group | Dedicated Manager |

---

## 3A. Add-on Products

| Add-on | Harga | Durasi |
|--------|-------|--------|
| Custom Domain | Rp 299.000 | 1 tahun |
| WhatsApp 100 Pesan | Rp 25.000 | 30 hari |
| WhatsApp 500 Pesan | Rp 100.000 | 30 hari |
| WhatsApp 1000 Pesan | Rp 175.000 | 30 hari |

---

## 4. Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Payment | Mayar (QRIS, VA) |
| File Upload | UploadThing |
| Email | Resend |
| UI | Shadcn/UI + Tailwind CSS |

---

## 5. Implementation Notes

Setiap perubahan signifikan didokumentasikan di folder `implementation/`.

Contoh: lihat `implementation/2026-03-11-uploadthing/README.md`

---

## 6. Proses Bisnis & Alur Kerja (Workflow)

### **A. Onboarding (Pendaftaran Klien)**

1. Owner Laundry daftar di `vibeclean.id`.
2. Owner melakukan verifikasi data usaha.
3. Owner mengatur "Jasa & Harga" (Misal: Cuci Kiloan Rp 7.000/kg).
4. Owner mencetak QR Code kasir untuk pembayaran.

### **B. Operasional Harian (Point of Sale)**

1. Kasir menerima pakaian -> Input berat/pcs di aplikasi.
2. Sistem hitung harga - Diskon Kupon = Total.
3. Kasir pilih "Bayar via Mayar" -> Muncul QRIS di layar.
4. Pelanggan bayar -> Status order otomatis jadi **"LUNAS"**.
5. Pelanggan dapat link tracking via WhatsApp.

### **C. Settlement & Disbursement (Pencairan Uang)**

* Uang dari pelanggan masuk ke akun Mayar yang terhubung.
* Sistem VibeClean memotong biaya admin (cuan buat kamu).
* Owner bisa menarik saldo (Withdraw) ke rekening bank mereka kapan saja.

---

## 7. Strategi Pemasaran (GTM Strategy)

* **Target Market:** Pemilik laundry kiloan di area perkotaan, laundry sepatu, dan katering laundry ruko.
* **Channel:** * **Instagram/TikTok:** Konten "Life as a Laundry Owner" menggunakan VibeClean.
* **Affiliate:** Memberikan komisi kepada pemilik laundry yang mengajak temannya pakai VibeClean (Cocok dengan minatmu di bidang *affiliate*).
* **Direct Sales:** Menghubungi laundry-laundry di Google Maps.



---

## 8. Operasional Founder (Behind the Scene)

Sebagai Founder, tugas harianmu adalah:

1. **Monitor Server:** Memastikan Next.js & Database Supabase berjalan lancar.
2. **Customer Success:** Menjawab kendala teknis dari Owner Laundry.
3. **Feature Update:** Terus menambah fitur berdasarkan *feedback* (Misal: Laporan Pajak atau Penggajian Karyawan).

---

## 9. Roadmap Masa Depan

* **VibeClean Supply:** Marketplace khusus deterjen dan plastik laundry (Cuan tambahan dari *dropship/affiliate* bahan baku).
* **AI Laundry Assistant:** AI yang bisa memprediksi kapan stok deterjen habis berdasarkan jumlah cucian.

---

### **Apa yang bisa kita kerjakan sekarang?**

PRD Bisnis ini sudah lengkap. Kamu sudah punya gambaran bagaimana cara aplikasi ini mencetak uang.

**Would you like me to...**

1. **Buatkan Mockup Landing Page (Copywriting)** yang fokus menjual paket Pro ini?
2. **Buatkan Logic Webhook** agar saat Owner bayar langganan Pro, fiturnya otomatis aktif di dashboard mereka?

**Pilih salah satu, dan kita buatkan sekarang!**
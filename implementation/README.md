# Implementation Notes

Setiap perubahan signifikan pada codebase harus didokumentasikan di folder ini agar AI agent dapat mengingat sejarah perubahan.

## Riwayat Implementasi

- [2026-03-11: UploadThing Integration](./2026-03-11-uploadthing/README.md)
- [2026-03-11: Member Packages](./2026-03-11-member-packages/README.md)
- [2026-03-11: Export Features](./2026-03-11-export-features/README.md)
- [2026-03-12: Custom Domain Enhancement](./2026-03-12-custom-domain-enhancement/README.md)
- [2026-03-12: Sticky Navbar & Tax Report](./2026-03-12-sticky-navbar-tax-report/README.md)

## Struktur

```
implementation/
├── README.md                    # Panduan ini
├── 2026-03-11-uploadthing/     # Implementasi UploadThing
│   ├── README.md               # Detail perubahan
│   └── files-changed.md        # List file yang diubah
└── ...
```

## Cara Dokumentasi

### 1. Buat Folder Baru
Format: `YYYY-MM-nama-feature`

Contoh: `2026-03-11-uploadthing`

### 2. Buat File Dokumentasi

**README.md:**
```markdown
# [Nama Feature]

## Tanggal
YYYY-MM-DD

## Deskripsi
Penjelasan singkat perubahan

## Alasan
Mengapa perubahan ini dilakukan

## Hasil
Apa yang dicapai
```

**files-changed.md:**
```markdown
## File Diubah
- src/app/layout.tsx
- src/utils/uploadthing.ts

## File Baru
- src/components/common/upload-button.tsx

## File Dihapus
- (jika ada)
```

### 3. Update Main README
Tambahkan link ke implementasi baru di README utama.

---

## Catatan

- Gunakan bahasa Indonesia untuk konsistensi
- Sertakan reason di setiap perubahan
- Update catatan ini saat ada perubahan besar

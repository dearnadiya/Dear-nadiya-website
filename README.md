# Dear Nadiya — Online Website + Upload Bukti Pembayaran

## Fitur baru
- Website customer
- Dashboard admin
- Database SQLite
- Checkout dan nomor pesanan
- Upload bukti pembayaran JPG/JPEG/PNG/WEBP/PDF
- Status pembayaran otomatis menjadi "Menunggu Verifikasi"
- Admin dapat melihat dan membuka bukti pembayaran
- Admin dapat memverifikasi pembayaran

## Jalankan lokal
```bash
pip install -r requirements.txt
python server.py
```

## Deploy ke Render
1. Upload project ke repository GitHub.
2. Masuk ke dashboard Render.
3. Buat New > Blueprint dan pilih repository.
4. Render akan membaca `render.yaml`.
5. Setelah selesai, URL public akan diberikan oleh Render.

## Penting untuk produksi
- Ganti akun admin default.
- Gunakan SECRET_KEY yang kuat.
- Gunakan persistent disk agar database dan bukti pembayaran tidak hilang.
- Untuk skala besar, pindahkan database dari SQLite ke PostgreSQL.

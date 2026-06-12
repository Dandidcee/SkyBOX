import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy dev untuk Cek Ongkir → hindari CORS browser ke RajaOngkir/Komerce.
    // Browser memanggil /ongkir-api (same-origin), Vite meneruskan ke Komerce di sisi server.
    // Hanya aktif saat `npm run dev`. Produksi: panggil via N8N.
    proxy: {
      '/ongkir-api': {
        target: 'https://rajaongkir.komerce.id',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ongkir-api/, '/api/v1'),
      },
    },
  },
})

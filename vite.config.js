import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pastikan dependensi ekspor PDF selalu di-pre-bundle (anti error dynamic import)
    include: ['html2canvas', 'jspdf'],
  },
})

// vite.config.js - For development with Vite
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        course: 'course.html',
        unit: 'unit.html',
        quiz: 'quiz-bank.html',
        admin: 'admin-dashboard.html'
      }
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  define: {
    // Make Node globals available in browser — required by @react-pdf/renderer
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@redux': path.resolve(__dirname, './src/redux'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@app': path.resolve(__dirname, './src/app'),
      '@metronic': path.resolve(__dirname, './src/_metronic'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@models': path.resolve(__dirname, './src/models'),
      '@pages': path.resolve(__dirname, './src/app/pages'),
      '@modules': path.resolve(__dirname, './src/modules'),
      'app': path.resolve(__dirname, './src/app'),
      // Polyfill Node's Buffer for browser bundles (@react-pdf/renderer needs it)
      'buffer': path.resolve(__dirname, './node_modules/buffer/index.js'),
    },
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers',
      // Lazily `await import()`ed packages MUST be pre-bundled: if Vite only
      // discovers them mid-session it re-optimizes the dep cache, the version
      // hash changes, and the browser's in-flight URL 404s with
      // "Failed to fetch dynamically imported module" (exceljs bug).
      'exceljs',
      'js-confetti',
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },
  base: "/",
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const chunks: Record<string, string[]> = {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux'],
            'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
            'vendor-charts': ['apexcharts', 'react-apexcharts', 'recharts', 'chart.js'],
            'vendor-pdf': ['@react-pdf/renderer', 'jspdf', 'jspdf-autotable', 'pdf-lib', 'pdfmake'],
            'vendor-forms': ['formik', 'react-hook-form', 'yup', 'zod'],
            'vendor-table': ['material-react-table', 'react-table', '@tanstack/react-query'],
            'vendor-maps': ['leaflet', 'react-leaflet', '@react-google-maps/api', '@vis.gl/react-google-maps'],
            'vendor-calendar': ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/multimonth'],
            'vendor-ui': ['antd', '@mantine/core', '@mantine/dates', 'framer-motion', 'react-select'],
            'vendor-utils': ['axios', 'dayjs', 'lodash', 'xlsx', 'papaparse', 'jszip'],
          };
          for (const [chunk, pkgs] of Object.entries(chunks)) {
            if (pkgs.some(pkg => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`))) {
              return chunk;
            }
          }
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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
      'app': path.resolve(__dirname, './src/app'),
    },
  },
  base: "/",
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
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
        },
      },
    },
  },
})

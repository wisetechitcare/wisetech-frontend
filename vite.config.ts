import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { kitExemption } from './scripts/postcss-kit-exemption'

function muiIconDeepImportPlugin() {
  return {
    name: 'mui-icon-deep-import-interop',
    enforce: 'pre' as const,
    // MUI's deep icon files are CommonJS; route them through the package's ESM barrel
    // so React receives the icon component instead of an optimized module namespace.
    resolveId(source: string) {
      const iconName = /^@mui\/icons-material\/([A-Za-z0-9_]+)$/.exec(source)?.[1]
      return iconName ? `\0mui-icon:${iconName}` : null
    },
    load(id: string) {
      const iconName = /^\0mui-icon:([A-Za-z0-9_]+)$/.exec(id)?.[1]
      return iconName ? `export { ${iconName} as default } from '@mui/icons-material'` : null
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    muiIconDeepImportPlugin(),
    tsconfigPaths(),
    tailwindcss(),
    // Opt-in bundle analysis: `ANALYZE=1 pnpm run build` writes dist/stats.json.
    // Off by default so normal builds are unaffected.
    ...(process.env.ANALYZE
      ? [visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true })]
      : []),
  ],
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
    // Prevent duplicate Emotion copies (Vite + MUI) which surface as
    // "styled_default is not a function" after a bad HMR / dep re-optimize.
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material'],
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
      // Force styles/Tooltip/Popper into the same prebundle crawl so init_styled()
      // runs before Popper evaluates styled_default (Vite+MUI known failure mode).
      '@mui/material/styles',
      '@mui/material/Tooltip',
      '@mui/material/Popper',
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
    // Bootstrap/Metronic utilities skip v2 kit elements (see the plugin file).
    postcss: { plugins: [kitExemption()] },
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
            // echarts + its renderer zrender were 2.9MB — 39% of the ENTRY chunk —
            // because manualChunks returns undefined for anything unlisted and unmatched
            // node_modules fall into the default (entry) chunk. Only 6 lazy routes import
            // echarts-for-react, so every other user was downloading it for nothing.
            // Its own group, not vendor-charts: grouping it with apexcharts/recharts would
            // make the 21 apexcharts screens pull echarts too.
            'vendor-echarts': ['echarts', 'echarts-for-react', 'zrender'],
            'vendor-pdf': ['@react-pdf/renderer'],
            'vendor-forms': ['formik', 'react-hook-form', 'yup', 'zod'],
            'vendor-table': ['material-react-table', 'react-table', '@tanstack/react-query'],
            'vendor-maps': ['leaflet', 'react-leaflet', '@react-google-maps/api', '@vis.gl/react-google-maps'],
            'vendor-calendar': ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/multimonth'],
            'vendor-ui': ['framer-motion', 'react-select'],
            'vendor-utils': ['axios', 'dayjs', 'lodash', 'jszip'],
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

// vite.config.ts
import { defineConfig } from "file:///C:/Users/PC31/Desktop/irfan/webapp/wisetech-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/PC31/Desktop/irfan/webapp/wisetech-frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import tsconfigPaths from "file:///C:/Users/PC31/Desktop/irfan/webapp/wisetech-frontend/node_modules/vite-tsconfig-paths/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\PC31\\Desktop\\irfan\\webapp\\wisetech-frontend";
var vite_config_default = defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@redux": path.resolve(__vite_injected_original_dirname, "./src/redux"),
      "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
      "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
      "@app": path.resolve(__vite_injected_original_dirname, "./src/app"),
      "@metronic": path.resolve(__vite_injected_original_dirname, "./src/_metronic"),
      "@constants": path.resolve(__vite_injected_original_dirname, "./src/constants"),
      "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
      "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
      "@models": path.resolve(__vite_injected_original_dirname, "./src/models"),
      "@pages": path.resolve(__vite_injected_original_dirname, "./src/app/pages"),
      "app": path.resolve(__vite_injected_original_dirname, "./src/app")
    }
  },
  base: "/",
  build: {
    chunkSizeWarningLimit: 3e3,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom", "react-redux"],
          "vendor-mui": ["@mui/material", "@mui/icons-material", "@mui/x-date-pickers"],
          "vendor-charts": ["apexcharts", "react-apexcharts", "recharts", "chart.js"],
          "vendor-pdf": ["@react-pdf/renderer", "jspdf", "jspdf-autotable", "pdf-lib", "pdfmake"],
          "vendor-forms": ["formik", "react-hook-form", "yup", "zod"],
          "vendor-table": ["material-react-table", "react-table", "@tanstack/react-query"],
          "vendor-maps": ["leaflet", "react-leaflet", "@react-google-maps/api", "@vis.gl/react-google-maps"],
          "vendor-calendar": ["@fullcalendar/react", "@fullcalendar/daygrid", "@fullcalendar/timegrid", "@fullcalendar/interaction", "@fullcalendar/multimonth"],
          "vendor-ui": ["antd", "@mantine/core", "@mantine/dates", "framer-motion", "react-select"],
          "vendor-utils": ["axios", "dayjs", "lodash", "xlsx", "papaparse", "jszip"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQQzMxXFxcXERlc2t0b3BcXFxcaXJmYW5cXFxcd2ViYXBwXFxcXHdpc2V0ZWNoLWZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQQzMxXFxcXERlc2t0b3BcXFxcaXJmYW5cXFxcd2ViYXBwXFxcXHdpc2V0ZWNoLWZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9QQzMxL0Rlc2t0b3AvaXJmYW4vd2ViYXBwL3dpc2V0ZWNoLWZyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3YydcclxuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocydcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCksIHRzY29uZmlnUGF0aHMoKV0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgJ0ByZWR1eCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9yZWR1eCcpLFxyXG4gICAgICAnQHNlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXHJcbiAgICAgICdAdXRpbHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdXRpbHMnKSxcclxuICAgICAgJ0BhcHAnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvYXBwJyksXHJcbiAgICAgICdAbWV0cm9uaWMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvX21ldHJvbmljJyksXHJcbiAgICAgICdAY29uc3RhbnRzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbnN0YW50cycpLFxyXG4gICAgICAnQGNvbXBvbmVudHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cycpLFxyXG4gICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXHJcbiAgICAgICdAbW9kZWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL21vZGVscycpLFxyXG4gICAgICAnQHBhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2FwcC9wYWdlcycpLFxyXG4gICAgICAnYXBwJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2FwcCcpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJhc2U6IFwiL1wiLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDMwMDAsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAncmVhY3QtcmVkdXgnXSxcclxuICAgICAgICAgICd2ZW5kb3ItbXVpJzogWydAbXVpL21hdGVyaWFsJywgJ0BtdWkvaWNvbnMtbWF0ZXJpYWwnLCAnQG11aS94LWRhdGUtcGlja2VycyddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1jaGFydHMnOiBbJ2FwZXhjaGFydHMnLCAncmVhY3QtYXBleGNoYXJ0cycsICdyZWNoYXJ0cycsICdjaGFydC5qcyddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1wZGYnOiBbJ0ByZWFjdC1wZGYvcmVuZGVyZXInLCAnanNwZGYnLCAnanNwZGYtYXV0b3RhYmxlJywgJ3BkZi1saWInLCAncGRmbWFrZSddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1mb3Jtcyc6IFsnZm9ybWlrJywgJ3JlYWN0LWhvb2stZm9ybScsICd5dXAnLCAnem9kJ10sXHJcbiAgICAgICAgICAndmVuZG9yLXRhYmxlJzogWydtYXRlcmlhbC1yZWFjdC10YWJsZScsICdyZWFjdC10YWJsZScsICdAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcclxuICAgICAgICAgICd2ZW5kb3ItbWFwcyc6IFsnbGVhZmxldCcsICdyZWFjdC1sZWFmbGV0JywgJ0ByZWFjdC1nb29nbGUtbWFwcy9hcGknLCAnQHZpcy5nbC9yZWFjdC1nb29nbGUtbWFwcyddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1jYWxlbmRhcic6IFsnQGZ1bGxjYWxlbmRhci9yZWFjdCcsICdAZnVsbGNhbGVuZGFyL2RheWdyaWQnLCAnQGZ1bGxjYWxlbmRhci90aW1lZ3JpZCcsICdAZnVsbGNhbGVuZGFyL2ludGVyYWN0aW9uJywgJ0BmdWxsY2FsZW5kYXIvbXVsdGltb250aCddLFxyXG4gICAgICAgICAgJ3ZlbmRvci11aSc6IFsnYW50ZCcsICdAbWFudGluZS9jb3JlJywgJ0BtYW50aW5lL2RhdGVzJywgJ2ZyYW1lci1tb3Rpb24nLCAncmVhY3Qtc2VsZWN0J10sXHJcbiAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydheGlvcycsICdkYXlqcycsICdsb2Rhc2gnLCAneGxzeCcsICdwYXBhcGFyc2UnLCAnanN6aXAnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRWLFNBQVMsb0JBQW9CO0FBQ3pYLE9BQU8sV0FBVztBQUNsQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUM7QUFBQSxFQUNsQyxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLGFBQWEsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLE1BQ3JELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxRQUFRLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDM0MsYUFBYSxLQUFLLFFBQVEsa0NBQVcsaUJBQWlCO0FBQUEsTUFDdEQsY0FBYyxLQUFLLFFBQVEsa0NBQVcsaUJBQWlCO0FBQUEsTUFDdkQsZUFBZSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsTUFDekQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLFdBQVcsS0FBSyxRQUFRLGtDQUFXLGNBQWM7QUFBQSxNQUNqRCxVQUFVLEtBQUssUUFBUSxrQ0FBVyxpQkFBaUI7QUFBQSxNQUNuRCxPQUFPLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsSUFDNUM7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsb0JBQW9CLGFBQWE7QUFBQSxVQUN4RSxjQUFjLENBQUMsaUJBQWlCLHVCQUF1QixxQkFBcUI7QUFBQSxVQUM1RSxpQkFBaUIsQ0FBQyxjQUFjLG9CQUFvQixZQUFZLFVBQVU7QUFBQSxVQUMxRSxjQUFjLENBQUMsdUJBQXVCLFNBQVMsbUJBQW1CLFdBQVcsU0FBUztBQUFBLFVBQ3RGLGdCQUFnQixDQUFDLFVBQVUsbUJBQW1CLE9BQU8sS0FBSztBQUFBLFVBQzFELGdCQUFnQixDQUFDLHdCQUF3QixlQUFlLHVCQUF1QjtBQUFBLFVBQy9FLGVBQWUsQ0FBQyxXQUFXLGlCQUFpQiwwQkFBMEIsMkJBQTJCO0FBQUEsVUFDakcsbUJBQW1CLENBQUMsdUJBQXVCLHlCQUF5QiwwQkFBMEIsNkJBQTZCLDBCQUEwQjtBQUFBLFVBQ3JKLGFBQWEsQ0FBQyxRQUFRLGlCQUFpQixrQkFBa0IsaUJBQWlCLGNBQWM7QUFBQSxVQUN4RixnQkFBZ0IsQ0FBQyxTQUFTLFNBQVMsVUFBVSxRQUFRLGFBQWEsT0FBTztBQUFBLFFBQzNFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

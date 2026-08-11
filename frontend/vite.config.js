import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/configs/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    // Strip console.* calls from production builds only (kept in dev).
    drop: mode === 'production' ? ['console'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor libraries into their own
        // named chunks so route code changes don't invalidate their
        // browser cache entry, and so Rollup's default chunking heuristic
        // can't silently glue one onto a chunk every route shares (that's
        // how react-markdown/remark-gfm previously ended up bundled into
        // the AppLayout chunk that every authenticated route imports).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@fullcalendar')) return 'vendor-calendar';
          if (
            id.includes('react-markdown') ||
            id.includes('remark') ||
            id.includes('rehype') ||
            id.includes('micromark') ||
            id.includes('mdast') ||
            id.includes('hast') ||
            id.includes('unist') ||
            id.includes('vfile') ||
            id.includes('unified')
          ) {
            return 'vendor-markdown';
          }
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
}));

import { defineConfig } from 'vite';

// All pages are plain HTML; preserve their public URLs in the publish directory.
export default defineConfig({
  root: 'public',
  publicDir: false,
  build: { outDir: '../dist', emptyOutDir: true, copyPublicDir: false },
  plugins: [{
    name: 'copy-static-site',
    async closeBundle() {
      const { cp } = await import('node:fs/promises');
      await cp('public', 'dist', { recursive: true });
    },
  }],
});

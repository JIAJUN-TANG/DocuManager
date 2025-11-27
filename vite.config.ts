import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './', // Ensure paths are relative for Electron file:// protocol
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Inject the process.env.API_KEY into the client code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
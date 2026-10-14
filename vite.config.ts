import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Icons are generated from the owner's source image by `npm run icons`.
 * Until that runs, the manifest ships without icons rather than with a placeholder.
 */
function manifestIcons(): { src: string; sizes: string; type: string; purpose?: string }[] {
  const path = 'public/icons/manifest-icons.json';
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as ReturnType<typeof manifestIcons>;
}

/**
 * Link the generated icons only once they exist; otherwise suppress the browser's automatic
 * favicon request so the console stays free of 404s.
 */
function iconLinks(): Plugin {
  return {
    name: 'ftb-icon-links',
    transformIndexHtml() {
      const tags = [];
      if (existsSync('public/icons/apple-touch-icon.png')) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' },
        });
      }
      if (existsSync('public/icons/favicon-32.png')) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'icon', type: 'image/png', href: 'icons/favicon-32.png' },
        });
      } else {
        tags.push({ tag: 'link', attrs: { rel: 'icon', href: 'data:,' } });
      }
      return tags;
    },
  };
}

/** Build version from git: commit count and short hash, e.g. "v41 f700d5e". */
function appVersion(): string {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    const sha = execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim();
    return `v${count} ${sha}`;
  } catch {
    return 'v0 local';
  }
}

// GitHub Pages serves project sites under /<repo>/ ; CI sets BASE_PATH accordingly.
// `vite build --mode devbuild` produces the development build (dev arena, tuning panel)
// under <base>dev/ so production never contains it.
export default defineConfig(({ mode }) => {
  const devBuild = mode === 'devbuild';
  const base = (process.env.BASE_PATH ?? '/') + (devBuild ? 'dev/' : '');
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(appVersion() + (devBuild ? ' dev' : '')),
    },
    plugins: [
      iconLinks(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/*.png'],
        manifest: {
          name: devBuild ? 'Fable Token Burner (dev)' : 'Fable Token Burner',
          short_name: devBuild ? 'Burner dev' : 'Token Burner',
          description: 'A Might and Magic VI inspired first-person party RPG.',
          display: 'standalone',
          orientation: 'landscape',
          background_color: '#0b0a08',
          theme_color: '#0b0a08',
          start_url: '.',
          scope: '.',
          icons: manifestIcons(),
        },
        workbox: {
          // Babylon and future level data are large; raise the precache limit.
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,png,svg,webp,wasm,glb,json,bin,woff2}'],
          // Compiled levels are only loaded by the development build for now.
          globIgnores: devBuild ? [] : ['levels/**'],
          // The production worker's scope contains /dev/. It must never answer a /dev/
          // navigation with its own cached page, or the dev build is unreachable.
          navigateFallbackDenylist: devBuild ? [] : [/\/dev\//],
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['@babylonjs/havok'],
    },
    build: {
      outDir: devBuild ? 'dist/dev' : 'dist',
      target: 'es2022',
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('@babylonjs/core')) return 'babylon';
            return undefined;
          },
        },
      },
    },
    test: {
      include: ['src/**/*.test.ts', 'kernel/**/*.test.ts', 'tools/**/*.test.ts'],
      environment: 'node',
    },
  };
});

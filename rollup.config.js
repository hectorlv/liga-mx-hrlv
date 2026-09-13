import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { rollupPluginHTML as html } from "@web/rollup-plugin-html";
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import _esbuild from 'rollup-plugin-esbuild';
import { injectManifest } from 'rollup-plugin-workbox';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { createRequire } from 'node:module';
import { createAppVersionDefines } from './buildMetadata.mjs';

const require = createRequire(import.meta.url);

const esbuild = _esbuild.default || _esbuild;
const appVersionDefines = createAppVersionDefines();
const socialPreview = new URL(
  './src/assets/images/social-preview.png',
  import.meta.url,
);
export default {
  input: 'index.html',
  output: {
    entryFileNames: '[hash].js',
    chunkFileNames: '[hash].js',
    assetFileNames: '[hash][extname]',
    format: 'es',
    dir: 'dist',
  },
  preserveEntrySignatures: false,

  plugins: [
    {
      name: 'copy-social-preview',
      buildStart() {
        this.emitFile({
          type: 'asset',
          fileName: 'social-preview.png',
          source: readFileSync(socialPreview),
        });
      },
    },
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
      injectServiceWorker: false,
    }),
    image(),
    json(),
    /** Resolve bare module imports */
    nodeResolve(),
    /** Minify JS, compile JS to a lower language target */
    esbuild({
      minify: true,
      target: 'es2020',
      tsconfig: 'tsconfig.json',
      include: /\.[jt]s?$/,
      define: appVersionDefines,
    }),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
    /** Minify html and css tagged template literals */
    babel({
      plugins: [
        [
          require.resolve('babel-plugin-template-html-minifier'),
          {
            modules: { lit: ['html', { name: 'css', encapsulation: 'style' }] },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
      exclude: ['node_modules/**'],
      babelHelpers: 'bundled',
    }),
    /** Build our version-safe service worker after Rollup has emitted assets. */
    injectManifest({
      swSrc: path.join('src', 'service-worker.js'),
      swDest: path.join('dist', 'sw.js'),
      globDirectory: path.join('dist'),
      globPatterns: ['**/*.{html,js,css,webmanifest,png,svg,webp,jpg,jpeg}'],
      globIgnores: ['sw.js', 'sw.js.map', 'workbox-*.js', 'workbox-*.js.map'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    }),
  ],
};

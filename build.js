import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2020',
  external: ['@tempad-dev/plugins'],
  sourcemap: true,
})
  .catch(() => process.exit(1)) 
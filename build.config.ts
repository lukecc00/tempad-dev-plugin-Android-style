import { defineBuildConfig } from 'unbuild'

const entries = ['src/index']

export default defineBuildConfig(
  entries.map(entry => ({
    entries: [entry],
    clean: true,
    rollup: {
      inlineDependencies: true,
      esbuild: {
        minify: true,
      },
    },
  })),
)

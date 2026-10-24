import esbuildModule from 'rollup-plugin-esbuild';

const esbuild = esbuildModule.default || esbuildModule;

export default {
  input: 'functions/public-data.ts',
  output: { file: 'functions/generated/public-data.js', format: 'es' },
  plugins: [esbuild({ target: 'node22', platform: 'node', tsconfig: 'tsconfig.json' })],
};

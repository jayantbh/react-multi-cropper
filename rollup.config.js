// import typescript from 'rollup-plugin-typescript2';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';
import url from '@rollup/plugin-url';
import json from '@rollup/plugin-json';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import fileAsBlob from 'rollup-plugin-file-as-blob';

process.env.SASS_PATH = 'src';

// Plugin order matters
const plugins = [
  external(),
  commonjs(),
  resolve({
    preferBuiltins: false,
    browser: true,
  }),
  postcss({
    autoModules: true,
  }),
  url(),
  globals(),
  builtins(),
  json(),
  fileAsBlob({
    include: '**/*/worker.bundle.js',
  }),
];

const pluginsTsExt = [
  ...plugins,
  typescript(),
];

const commonExternal = [
  'react',
  'react-dom',
];
const commonConfig = {
  exports: 'named',
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};

export default [
  {
    external: commonExternal,
    input: 'src/worker.js',
    output: [
      {
        file: 'src/worker.bundle.js',
        format: 'cjs',
        ...commonConfig,
      },
    ],
    plugins,
  },
  {
    external: commonExternal,
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        ...commonConfig,
        sourcemap: true
      },
    ],
    plugins: pluginsTsExt,
  },
];

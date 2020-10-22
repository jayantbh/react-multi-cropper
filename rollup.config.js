import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';
import url from '@rollup/plugin-url';
import svgr from '@svgr/rollup';
import json from '@rollup/plugin-json';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import { terser } from 'rollup-plugin-terser';
import dts from "rollup-plugin-dts";

import pkg from './package.json';

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
  svgr(),
  globals(),
  builtins(),
  json(),
  terser(),
];

const pluginsTsExt = [
  ...plugins,
  typescript({
    rollupCommonJSResolveHack: true,
    clean: true,
    exclude: ['src/fabric.d.ts']
  }),
];

const commonExternal = [
  'react',
  'react-dom',
];
const commonConfig = {
  exports: 'named',
  sourcemap: true,
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};

export default [
  {
    input: "src/fabric.d.ts",
    output: [{ file: "dist/fabric.d.ts", format: "es" }],
    plugins: [dts()],
  },
  {
    external: commonExternal,
    input: 'src/index.ts',
    output: [
      {
        file: pkg.browser,
        format: 'cjs',
        ...commonConfig,
      },
    ],
    plugins: pluginsTsExt,
  }
];

const fs = require("fs");
const pkg = require(process.cwd() + "/package.json");

let copyright = `Copyright (c) ${pkg.author ? pkg.author.name || pkg.author : ""}`;
try {
  const licenseFile = fs.readFileSync(process.cwd() + "/LICENSE", { encoding: "utf8" });
  const result = licenseFile.match(/^copy.*$/img);

  if (result && result[0]) {
    copyright = result[0];
  }

} catch (e) { }
const defaultBanner = `/*
${copyright}
name: ${pkg.name}
license: ${pkg.license}
author: ${pkg.author ? pkg.author.name || pkg.author : ""}
repository: ${pkg.repository.url}
version: ${pkg.version}
*/`;
const prototypeMinify = require("rollup-plugin-prototype-minify");
const commonjsPlugin = require("@rollup/plugin-commonjs")();
const typescriptPlugin = require("@rollup/plugin-typescript");
const typescriptPlugin2 = require("rollup-plugin-typescript2");
const replacePlugin = require("@rollup/plugin-replace")({
  "#__VERSION__#": pkg.version,
  "/** @class */": "/*#__PURE__*/",
  delimiters: ["", ""],
  sourcemap: true,
});
const resolvePlugin = require("@rollup/plugin-node-resolve")();
const terserPlugin = require("@rollup/plugin-terser").default;
const visualizerPlugin = require("rollup-plugin-visualizer").visualizer;

module.exports = function config(options) {
  if (Array.isArray(options)) {
    return options.map(options2 => config(options2)).reduce((prev, cur) => prev.concat(cur), []);
  }
  if (Array.isArray(options.output)) {
    return options.output.map(file => config({
      ...options,
      output: file,
    }));
  }
  const {
    input,
    output, // string | string[]
    tsconfig = "tsconfig.json",
    tsconfigOverride,
    typescript2 = false,
    format = "umd", // "umd", "cjs", "es"
    exports = "default", // "default", "named"
    sourcemap = true, // boolean,
    plugins = [],
    name, // string,
    uglify, // boolean or except string
    resolve, // boolean
    commonjs, // boolean,
    visualizer, //  options
    external, // {object}
    inputOptions, // other input options
    outputOptions, // other output options
    banner = defaultBanner,
    minifyPrototype, // minify prototype
  } = options;
  const nextPlugins = [
    ...plugins,
  ];

  if (typescript2) {
    nextPlugins.push(typescriptPlugin2({
      tsconfig,
      tsconfigOverride: tsconfigOverride || {
        compilerOptions: {
          sourceMap: sourcemap,
        },
      },
    }));
  } else {
    nextPlugins.push(typescriptPlugin({
      tsconfig,
      "sourceMap": true,
    }));
  }
  nextPlugins.push(replacePlugin);

  nextPlugins.push(...plugins);
  minifyPrototype && nextPlugins.push(prototypeMinify({
    sourcemap,
    exclude: /node_modules/g,
  }));
  commonjs && nextPlugins.push(commonjsPlugin);
  resolve && nextPlugins.push(resolvePlugin);

  if (uglify) {
    const condition = typeof uglify === "string" ? uglify : `name:(\\s*)${pkg.name.replace(/\//g, "\\/")}`;
    const uglifyFunction = eval(`(function () {
      return function (node, comment) {
        var text = comment.value;
        var type = comment.type;
        if (type === "comment2") {
        // multiline comment
          return /${condition}/g.test(text);
        }
      }
      })();`);
    nextPlugins.push(terserPlugin({
      sourceMap: true,
      output: {
        comments: uglifyFunction,
      },
    }));
  }
  visualizer && nextPlugins.push(visualizerPlugin({
    sourcemap: true,
    filename: './statistics/index.html',
    title: '',
    ...visualizer,
  }));

  return {
    input,
    plugins: nextPlugins,
    external: Object.keys(external || {}),
    ...inputOptions,
    output: {
      banner,
      format: "es",
      freeze: false,
      esModule: false,
      interop: "default",
      globals: external,
      format,
      name,
      exports,
      file: output,
      sourcemap,
      ...outputOptions,
    },
  };
}

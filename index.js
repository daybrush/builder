const pkg = require(process.cwd() + "/package.json");
const banner = `/*
Copyright (c) 2019 ${pkg.author}
name: ${pkg.name}
license: ${pkg.license}
author: ${pkg.author}
repository: ${pkg.repository.url}
version: ${pkg.version}
*/`;
const typescriptPlugin = require("rollup-plugin-typescript")({
  "module": "es2015",
  "target": "es3",
  "lib": ["es2015", "dom"],
  "exclude": "node_modules/**",
  "sourceMap": true,
});
const replacePlugin = require("rollup-plugin-replace")({
  "#__VERSION__#": pkg.version,
  "/** @class */": "/*#__PURE__*/",
  delimiters: ["", ""],
  sourcemap: true,
});
const minifyPlugin = require("rollup-plugin-prototype-minify")({ sourcemap: true })
const resolvePlugin = require("rollup-plugin-node-resolve")();


const uglifyFunction = eval(`(function () {
  return function (node, comment) {
    var text = comment.value;
    var type = comment.type;
    if (type === "comment2") {
      // multiline comment
      return /name:(\\s*)${pkg.name.replace(/\//g, "\\/")}/g.test(text);
    }
  }
})();`);
const uglifyPlugin = require("rollup-plugin-uglify").uglify({
  sourcemap: true,
  output: {
    comments: uglifyFunction,
  },
});

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
    format = "umd", // "umd", "cjs", "es"
    exports = "default", // "default", "named"
    sourcemp, // boolean,
    name, // string,
    uglify, // boolean
    resolve, // boolean
    visualizer, //  options
    external, // {object}
  } = options;
  const plugins = [typescriptPlugin, minifyPlugin, replacePlugin];

  resolve && plugins.push(resolvePlugin);
  uglify && plugins.push(uglifyPlugin);
  visualizer && plugins.push(visualizerPlugin({
    sourcemap: true,
    filename: './statistics/scene.min.html',
    title: 'scene.min.js',
    ...visualizer,
  }));

  return {
    input,
    plugins,
    external: Object.keys(external || {}),
    output: {
      banner,
      format: "es",
      freeze: false,
      esModule: false,
      interop: false,
      globals: external,
      format,
      name,
      exports,
      file: output,
      sourcemap: sourcemp,
    },
  };
}

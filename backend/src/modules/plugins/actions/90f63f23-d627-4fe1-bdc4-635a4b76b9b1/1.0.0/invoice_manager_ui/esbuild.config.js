const esbuild = require("esbuild");
const path = require("path");

esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  outfile: "dist/bundle.js",
  loader: { ".js": "jsx", ".jsx": "jsx" },
  minify: true,
  sourcemap: false,
  target: ["chrome90", "firefox90"],
})
.then(() => console.log("UI Plugin build complete!"))
.catch((e) => console.error(e));

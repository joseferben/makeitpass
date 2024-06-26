import { defineConfig } from "tsup";

export default defineConfig({
  target: "node18",
  noExternal: [],
  format: ["cjs"],
  entry: ["src/mip.ts"],
  outDir: "dist",
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});

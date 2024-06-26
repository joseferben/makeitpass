import { defineConfig } from "tsup";

export default defineConfig({
  target: "node22",
  format: ["cjs"],
  entry: ["src/bin.ts"],
  outDir: "dist",
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});

import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
    entry: ["./src/app.ts"],
    format: ["cjs", 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    ...options,
}));
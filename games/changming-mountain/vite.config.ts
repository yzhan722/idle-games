import { defineConfig } from "vite";

// 相对路径：同一份产物既能放网页，也能放进桌面壳。
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
});

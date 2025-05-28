import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
            plugins: [
                NodeGlobalsPolyfillPlugin({
                    buffer: true,
                }),
            ],
        },
    },
    resolve: {
        alias: {
            buffer: "buffer",
            "@": "/src",
            "@components": "/src/components",
            "@pages": "/src/pages",
            "@stores": "/src/stores",
            "@styles": "/src/styles",
            "@assets": "/src/assets",
            "@common": "/src/common",
            "@config": "/src/config",
            "@reducers": "/src/stores/reducers",
            "@actions": "/src/stores/actions",
        },
    },
});

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const iotProxyTarget = env.VITE_IOT_PROXY_TARGET || "https://thegreenlab.xyz";
    const iotProxyPath = env.VITE_IOT_PROXY_PATH || "/Datums/DataByDateJson";
    const iotProxyUser = env.VITE_IOT_PROXY_USER || "";
    const iotProxyPass = env.VITE_IOT_PROXY_PASS || "";

    const hasIotProxyAuth = Boolean(iotProxyUser && iotProxyPass);
    const iotProxyAuth = hasIotProxyAuth
        ? `Basic ${Buffer.from(`${iotProxyUser}:${iotProxyPass}`).toString("base64")}`
        : null;

    return {
        plugins: [react()],
        server: {
            proxy: {
                "/api/iot": {
                    target: iotProxyTarget,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (proxyPath) => proxyPath.replace(/^\/api\/iot/, iotProxyPath),
                    configure: (proxy) => {
                        proxy.on("proxyReq", (proxyReq) => {
                            if (iotProxyAuth) {
                                proxyReq.setHeader("Authorization", iotProxyAuth);
                            }
                        });
                    },
                },
            },
        },
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
                "@": path.resolve(__dirname, "./src"),
                "@components": path.resolve(__dirname, "./src/components"),
                "@pages": path.resolve(__dirname, "./src/pages"),
                "@stores": path.resolve(__dirname, "./src/stores"),
                "@styles": path.resolve(__dirname, "./src/styles"),
                "@assets": path.resolve(__dirname, "./src/assets"),
                "@common": path.resolve(__dirname, "./src/common"),
                "@config": path.resolve(__dirname, "./src/config"),
                "@services": path.resolve(__dirname, "./src/services"),
                "@reducers": path.resolve(__dirname, "./src/stores/reducers"),
                "@actions": path.resolve(__dirname, "./src/stores/actions"),
            },
        },
    };
});

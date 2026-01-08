import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/iot': {
                target: 'https://thegreenlab.xyz',
                changeOrigin: true,
                secure: false, // Bypass SSL verification
                rewrite: (path) => path.replace(/^\/api\/iot/, '/Datums/DataByDateJson'),
                headers: {
                    'Authorization': 'Basic ' + Buffer.from('nguyenduyliem@hcmuaf.edu.vn:DHNL@2345').toString('base64')
                },
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        // Add basic auth header
                        const auth = Buffer.from('nguyenduyliem@hcmuaf.edu.vn:DHNL@2345').toString('base64');
                        proxyReq.setHeader('Authorization', `Basic ${auth}`);
                        console.log('Proxy request URL:', req.url);
                        console.log('Proxy auth header:', `Basic ${auth}`);
                        console.log('Decoded credentials:', Buffer.from(auth, 'base64').toString());
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log('Proxy response status:', proxyRes.statusCode);
                        if (proxyRes.statusCode === 401) {
                            console.log('401 Unauthorized - Check credentials');
                        }
                    });
                }
            }
        }
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
            "@": "/src",
            "@components": "/src/components",
            "@pages": "/src/pages",
            "@stores": "/src/stores",
            "@styles": "/src/styles",
            "@assets": "/src/assets",
            "@common": "/src/common",
            "@config": "/src/config",
            "@services": "/src/services",
            "@reducers": "/src/stores/reducers",
            "@actions": "/src/stores/actions",
        },
    },
});

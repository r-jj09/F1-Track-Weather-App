import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Serve the Vercel function at /api/weather during `npm run dev`
function weatherApiDev() {
	return {
		name: "weather-api-dev",
		configureServer(server) {
			server.middlewares.use("/api/weather", async (req, res) => {
				const { default: handler } = await server.ssrLoadModule("/api/weather.js");
				// connect strips the mount path, the handler wants the full URL
				req.url = req.originalUrl;
				await handler(req, res);
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	// The API function reads its keys from process.env, like on Vercel
	Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ""), ...process.env });

	return {
		plugins: [
			vue(),
			weatherApiDev(),
			VitePWA({
				registerType: "autoUpdate",
				includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
				workbox: {
					// Never answer API requests with the cached app shell
					navigateFallbackDenylist: [/^\/api\//],
				},
				manifest: {
					name: "F1 Track Weather",
					short_name: "F1 Track Weather",
					description: "Weather + UV info for every F1 race 🏁",
					theme_color: "#ff0267",
					background_color: "#ff0267",
					display: "standalone",
					start_url: "/",
					icons: [
						{
							src: "pwa-192x192.png",
							sizes: "192x192",
							type: "image/png",
						},
						{
							src: "pwa-512x512.png",
							sizes: "512x512",
							type: "image/png",
						},
					],
				},
			}),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	};
});

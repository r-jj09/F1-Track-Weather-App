import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
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
});

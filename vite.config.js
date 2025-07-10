import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "pwa-192x192.jpg", "pwa-512x512.jpg"],
			manifest: {
				name: "F1 Track Weather",
				short_name: "F1Weather",
				description: "Weather + UV info for every F1 race 🏁",
				theme_color: "#ff0267",
				background_color: "#0000",
				display: "standalone",
				start_url: "/",
				icons: [
					{
						src: "pwa-192x192.jpg",
						sizes: "192x192",
						type: "image/jpg",
					},
					{
						src: "pwa-512x512.jpg",
						sizes: "512x512",
						type: "image/jpg",
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

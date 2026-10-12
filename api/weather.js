// GET /api/weather: weather for every race on the calendar, from the shared cache.
// Vercel runs this as a serverless function; `npm run dev` mounts it through a Vite plugin.
import { waitUntil } from "@vercel/functions";
import { createStoreFromEnv, createWeatherService } from "./_lib/weather.js";

// Created once per server instance and reused across requests
let servicePromise = null;

function getService() {
	servicePromise ??= createStoreFromEnv(process.env).then((store) => {
		if (!store.shared) {
			console.warn("[weather] No Redis configured, caching per instance only");
		}
		return createWeatherService({
			store,
			// Server-only key; falls back to the old client-side variable name
			apiKey: process.env.OPENWEATHER_API_KEY ?? process.env.VITE_WEATHER_API_KEY,
		});
	});
	return servicePromise;
}

export default async function handler(req, res) {
	const url = new URL(req.url, "http://localhost");
	const isDev = process.env.NODE_ENV !== "production";

	try {
		const service = await getService();
		const result = await service.getWeather({
			background: waitUntil,
			mockLightsOut: isDev && url.searchParams.has("mockLightsOut"),
		});

		const nothing = result.missing === result.total;
		res.statusCode = nothing ? 503 : 200;
		res.setHeader("Content-Type", "application/json");
		// Short CDN cache on top of the shared store; never cache a total failure
		res.setHeader(
			"Cache-Control",
			nothing ? "no-store" : "public, s-maxage=120, stale-while-revalidate=600"
		);
		res.end(JSON.stringify(result));
	} catch (e) {
		console.error("[weather] handler failed", e);
		res.statusCode = 500;
		res.setHeader("Content-Type", "application/json");
		res.setHeader("Cache-Control", "no-store");
		res.end(JSON.stringify({ error: "server" }));
	}
}

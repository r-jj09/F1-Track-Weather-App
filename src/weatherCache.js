const weatherCache = {};

/**
 * Fetch weather data with caching.
 * @param {number} lat - Latitude of the location.
 * @param {number} lon - Longitude of the location.
 * @param {string} date - Race day date (used for race day forecast).
 * @returns {Promise<Object>} - Weather data and race day forecast.
 */
export const fetchWeatherWithCache = async (lat, lon, date) => {
	const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
	const cacheExpiration = 3600000; // 1 hour

	// Check if data exists in the cache and is still valid
	if (
		weatherCache[cacheKey] &&
		weatherCache[cacheKey].timestamp > Date.now() - cacheExpiration
	) {
		return weatherCache[cacheKey].data;
	}

	try {
		// Fetch fresh data from the API
		const res = await fetch(
			`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${
				import.meta.env.VITE_WEATHER_API_KEY
			}&units=metric`
		);

		const data = await res.json();

		// Find the race day forecast
		let raceDayForecast = null;
		if (data.daily) {
			const raceDate = new Date(date);
			raceDayForecast =
				data.daily.find((day) => {
					const forecastDate = new Date(day.dt * 1000);
					return (
						forecastDate.getUTCFullYear() === raceDate.getUTCFullYear() &&
						forecastDate.getUTCMonth() === raceDate.getUTCMonth() &&
						forecastDate.getUTCDate() === raceDate.getUTCDate()
					);
				}) || null;
		}

		// Cache the data
		weatherCache[cacheKey] = {
			data: { weather: data, raceDayForecast },
			timestamp: Date.now(),
		};

		return { weather: data, raceDayForecast };
	} catch (err) {
		console.error("❌ Fetch error:", err);
		throw new Error("Failed to fetch weather data");
	}
};

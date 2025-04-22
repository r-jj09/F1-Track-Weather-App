<script setup>
	import { computed, watch, onMounted } from "vue";
	import { Skycons } from "skycons-ts";

	const { track } = defineProps({
		track: Object,
	});

	// UV Index
	const uvLevel = computed(() => {
		const uvi = track.weather?.current?.uvi;

		if (uvi === undefined || uvi === null) return null;

		if (uvi <= 2) return { label: "Low", color: "green", textColor: "white" };
		if (uvi <= 5)
			return { label: "Moderate", color: "yellow", textColor: "black" };
		if (uvi <= 7) return { label: "High", color: "orange", textColor: "white" };
		if (uvi <= 10)
			return { label: "Very High", color: "red", textColor: "white" };

		return { label: "Extreme", color: "purple", textColor: "white" };
	});

	// Is it Race Day?
	const isRaceDay = computed(() => {
		const today = new Date();
		const todayDateOnly = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);

		const raceDate = new Date(track.date);
		const raceDateOnly = new Date(
			raceDate.getFullYear(),
			raceDate.getMonth(),
			raceDate.getDate()
		);

		return raceDateOnly.getTime() === todayDateOnly.getTime();
	});

	// Race Day Forecast
	const raceDayForecast = computed(() => {
		// if (!isRaceDay.value) return null;

		const forecastArray = track.weather?.daily;
		if (!forecastArray) return null;

		const raceDate = new Date(track.date);

		// Find the forecast for the race day
		const match = forecastArray.find((day) => {
			const forecastDate = new Date(day.dt * 1000);
			return (
				forecastDate.getUTCFullYear() === raceDate.getUTCFullYear() &&
				forecastDate.getUTCMonth() === raceDate.getUTCMonth() &&
				forecastDate.getUTCDate() === raceDate.getUTCDate()
			);
		});

		return match || null;
	});

	const iconId = `skycon-${track.raceName.replace(/\s+/g, "-").toLowerCase()}`;

	// Helper function to get the matching icon
	const getSkyconType = (desc) => {
		if (!desc || typeof desc !== "string") return "partly-cloudy-day";

		const d = desc.toLowerCase();
		if (d.includes("clear")) return "clear-day";
		if (d.includes("cloud")) return "cloudy";
		if (d.includes("rain")) return "rain";
		if (d.includes("storm") || d.includes("thunder")) return "sleet";
		if (d.includes("snow")) return "snow";
		if (d.includes("fog") || d.includes("mist") || d.includes("haze"))
			return "fog";

		return "partly-cloudy-day"; // safe fallback
	};

	onMounted(() => {
		const desc = track.weather?.current?.weather?.[0]?.description;
		const icon = getSkyconType(desc);

		const skycons = new Skycons({ color: "white" });
		skycons.add(iconId, icon); // ✅ just pass the string directly
		skycons.play();
	});

	watch(
		() => track.weather?.current?.weather?.[0]?.description,
		(newDesc) => {
			const icon = getSkyconType(newDesc);

			const skycons = new Skycons({ color: "white" });
			skycons.set(iconId, icon);
		}
	);
</script>

<template>
	<div class="track-card">
		<div class="track-title-uv">
			<div v-if="isRaceDay">
				<p class="nextRace-text">Race Day</p>
			</div>
			<div v-else-if="track.isNext">
				<p class="nextRace-text">Up Next</p>
			</div>
			<p
				v-if="uvLevel"
				class="uv-badge"
				:style="{ backgroundColor: uvLevel.color, color: uvLevel.textColor }"
			>
				<span>UV Index: </span>
				<span :style="{ fontWeight: 'bold' }">
					{{ uvLevel.label }}
				</span>
			</p>

			<h2 class="italic-text">{{ track.raceName }}</h2>
		</div>
		<h2 class="italic-text">
			{{
				new Date(track.date).toLocaleDateString("en-US", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric",
				})
			}}
		</h2>
		<p class="italic-text">{{ track.circuitName }}, {{ track.country }}</p>
		<div v-if="track.weather && !isRaceDay">
			<p style="font-size: 29px; color: white">
				{{ Math.round(track.weather.current.temp) }}°C
			</p>
			<div style="display: flex; align-items: center; justify-content: center">
				<p style="color: white">
					{{ track.weather.current.weather[0].description }}
				</p>
				<canvas
					class="weather-icon"
					:id="iconId"
					width="70"
					height="70"
				></canvas>
			</div>
			<p style="color: white">
				Humidity: {{ track.weather.current.humidity }}%
			</p>
			<p v-if="track.weather.current.rain">
				Chance of Rain (1h): {{ track.weather.current.rain["1h"] }} mm
			</p>
			<br />
			<div v-if="raceDayForecast" class="race-forecast">
				<p>Race Day Temp: {{ Math.round(raceDayForecast.temp.day) }}°C</p>
				Race Day Condition: {{ raceDayForecast.weather[0].description }}
				<font-awesome-icon
					:icon="[
						'fas',
						getWeatherIcon(raceDayForecast?.weather?.[0]?.description),
					]"
					class="weather-icon"
				/>
				<p>Chance of Rain: {{ Math.round(raceDayForecast.pop * 100) }}%</p>
			</div>
			<div v-else-if="isRaceDay">
				<p class="forecast-unavailable">
					Race day forecast is not available yet.
				</p>
			</div>
		</div>
		<div v-else>
			<p>Loading weather...</p>
		</div>
	</div>
</template>

<style scoped>
	.track-card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 50vh;
		background-color: #14a5a570;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 0 8px 5px rgba(0, 0, 0, 0.1);
		text-align: center;
		width: 80%;
		margin: auto;
	}

	.uv-badge:before {
		content: "";
		display: absolute;
		width: 100%;
		height: 2px;
		background-image: url("/public/uv-index-svgrepo-com.svg");
		margin-bottom: 10px;
	}

	.track-title-uv {
		position: relative;
	}

	.uv-badge {
		top: -35px;
		right: 0;
		position: absolute;
		color: white;
		border-radius: 15px;
		padding: 5px 10px;
		margin-top: 10px;
		display: inline-block;
		transform: rotate(15deg);
	}

	.nextRace-text {
		text-transform: uppercase;
		font-size: 25px;
		color: #860303;
	}

	.italic-text {
		font-style: italic;
	}

	.weather-icon {
		display: flex;
	}
</style>

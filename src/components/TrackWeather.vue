<script setup>
	import { computed } from "vue";

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

	// Icons for the weather conditions described in the API response.
	// const getWeatherIcon = (desc) => {
	// 	const d = desc.toLowerCase();
	// 	if (d.includes("clear")) return "☀️";
	// 	if (d.includes("cloud")) return "☁️";
	// 	if (d.includes("rain")) return "🌧️";
	// 	if (d.includes("storm")) return "⛈️";
	// 	if (d.includes("snow")) return "❄️";
	// 	return "🌡️";
	// };

	const getWeatherIcon = (desc) => {
		if (!desc) return "smog"; // fallback icon

		const d = desc.toLowerCase();

		if (d.includes("clear")) return "sun";
		if (d.includes("cloud")) return "cloud";
		if (d.includes("rain")) return "cloud-rain";
		if (d.includes("storm") || d.includes("thunder")) return "bolt";
		if (d.includes("snow")) return "snowflake";
		if (d.includes("fog") || d.includes("mist") || d.includes("haze"))
			return "smog";

		return "smog"; // fallback
	};
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

			<h2>{{ track.raceName }}</h2>
		</div>
		<h2>
			{{
				new Date(track.date).toLocaleDateString("en-US", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric",
				})
			}}
		</h2>
		<p>{{ track.circuitName }}, {{ track.country }}</p>
		<div v-if="track.weather">
			<p>Current temperature: {{ Math.round(track.weather.current.temp) }}°C</p>
			<p>
				Current Condition:
				{{ track.weather.current.weather[0].description }}
				<font-awesome-icon
					:icon="['fas', getWeatherIcon(track?.weather?.[0]?.description)]"
					class="weather-icon"
				/>
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
		background-color: #14a5a5;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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

	/* Loading */

	.loader {
		width: 44.8px;
		height: 44.8px;
		position: relative;
		transform: rotate(45deg);
	}

	.loader:before,
	.loader:after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 50% 50% 0 50%;
		background: #0000;
		background-image: radial-gradient(
			circle 11.2px at 50% 50%,
			#0000 94%,
			#ff4747
		);
	}

	.loader:after {
		animation: pulse-ytk0dhmd 1s infinite;
		transform: perspective(336px) translateZ(0px);
	}

	@keyframes pulse-ytk0dhmd {
		to {
			transform: perspective(336px) translateZ(168px);
			opacity: 0;
		}
	}
</style>

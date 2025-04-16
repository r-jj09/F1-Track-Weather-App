<script setup>
	import { computed } from "vue";

	const props = defineProps(["track", "weather"]);

	const raceDayForecast = computed(() => {
		if (!props.weather?.daily) return null;

		const raceDate = new Date(props.track.date);
		return (
			props.weather.daily.find((day) => {
				const forecastDate = new Date(day.dt * 1000);
				return (
					forecastDate.getUTCFullYear() === raceDate.getUTCFullYear() &&
					forecastDate.getUTCMonth() === raceDate.getUTCMonth() &&
					forecastDate.getUTCDate() === raceDate.getUTCDate()
				);
			}) || null
		);
	});

	const uvLevel = computed(() => {
		const uvi = props.weather?.current?.uvi;

		if (uvi === undefined || uvi === null) return null;

		if (uvi <= 2) return { label: "Low", color: "green", textColor: "white" };
		if (uvi <= 5)
			return { label: "Moderate", color: "yellow", textColor: "black" };
		if (uvi <= 7) return { label: "High", color: "orange", textColor: "white" };
		if (uvi <= 10)
			return { label: "Very High", color: "red", textColor: "white" };

		return { label: "Extreme", color: "purple", textColor: "white" };
	});
</script>

<template>
	<div class="track-card" v-if="weather && weather.current && uvLevel">
		<div class="track-title-uv">
			<p
				class="uv-badge"
				:style="{ backgroundColor: uvLevel.color, color: uvLevel.textColor }"
			>
				<span>UV Index: </span>
				<span :style="{ fontWeight: 'bold' }">{{ uvLevel.label }}</span>
			</p>
			<h2>{{ track.raceName }}</h2>
		</div>
		<p>{{ track.circuitName }}</p>
		<p>{{ track.date }}</p>
		<p>{{ track.country }}</p>
		<p>Current Temp: {{ Math.round(weather.current.temp) }} °C</p>
		<p>Current Condition: {{ weather.current.weather[0].description }}</p>
		<div v-if="raceDayForecast">
			<p>
				Race Day Forecast Temp: {{ Math.round(raceDayForecast.temp.day) }} °C
			</p>
			<p>
				Race Day Forecast Condition:
				{{ raceDayForecast.weather[0].description }}
			</p>
		</div>
		<div v-else>
			<p>Race day forecast not available yet.</p>
		</div>
	</div>
	<div v-else>
		<p>Loading weather data...</p>
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
</style>

<script setup>
	import { ref, onMounted, computed } from "vue";

	import tracks from "@/data/tracks.json";

	const now = new Date();

	// Find next race based on date
	const nextRaceIndex = tracks.findIndex((track) => new Date(track.date) > now);
	const trackIndex = ref(nextRaceIndex !== -1 ? nextRaceIndex : 0);
	const selectedTrack = computed(() => tracks[trackIndex.value]);
	const weatherData = ref(null);

	const fetchWeather = async () => {
		const { lat, long } = selectedTrack.value.location;

		const res = await fetch(
			`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,daily,alerts&appid=${
				import.meta.env.VITE_WEATHER_API_KEY
			}&units=metric`
		);

		const data = await res.json();
		weatherData.value = data;
	};

	onMounted(() => {
		fetchWeather();
	});
</script>
<template>
	<div v-if="weatherData && weatherData.current">
		<h2>{{ selectedTrack.raceName }}</h2>
		<p>Track: {{ selectedTrack.circuitName }}</p>
		<p>Date: {{ selectedTrack.date }}</p>

		<p>Current Temp: {{ Math.round(weatherData.current.temp) }} °C</p>
		<p>Current Condition: {{ weatherData.current.weather[0].description }}</p>
		<p>Current UV Index: {{ weatherData.current.uvi }}</p>
		<!-- TODO Race Day Weather Data if possible  -->
	</div>

	<div v-else>
		<p>Loading weather data...</p>
	</div>
</template>

<script setup>
	import { ref, onMounted, computed } from "vue";

	import tracks from "@/data/tracks.json";

	const props = defineProps(["track"]); // this gives you access to the track

	const weatherData = ref(null);

	const fetchWeather = async () => {
		const { lat, long } = props.track.location;

		const res = await fetch(
			`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,daily,alerts&appid=${
				import.meta.env.VITE_WEATHER_API_KEY
			}&units=metric`
		);

		const data = await res.json();
		weatherData.value = data;
		console.log("weatherData:", weatherData.value);
	};

	onMounted(() => {
		fetchWeather();
	});

	const uvLevel = computed(() => {
		const uvi = weatherData.value?.current?.uvi;

		if (uvi === undefined || uvi === null) return null;

		if (uvi <= 2) return { label: "Low", color: "green" };
		if (uvi <= 5) return { label: "Moderate", color: "yellow" };
		if (uvi <= 7) return { label: "High", color: "orange" };
		if (uvi <= 10) return { label: "Very High", color: "red" };

		return { label: "Extreme", color: "purple" };
	});
</script>
<template>
	<!-- <pre>{{ weatherData }}</pre> -->

	<div v-if="weatherData && weatherData.current && uvLevel">
		<h2>{{ track.raceName }}</h2>
		<p>{{ track.circuitName }}</p>
		<p>{{ track.date }}</p>
		<p>{{ track.country }}</p>

		<p>Current Temp: {{ Math.round(weatherData.current.temp) }} °C</p>
		<p>Current Condition: {{ weatherData.current.weather[0].description }}</p>
		<p>
			UV Index:
			<span :style="{ color: uvLevel.color, fontWeight: 'bold' }">
				{{ uvLevel.label }}
			</span>
		</p>
		<!-- TODO Race Day Weather Data if possible  -->
	</div>

	<div v-else>
		<p>Loading weather data...</p>
	</div>
</template>

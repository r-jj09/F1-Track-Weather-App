<script setup>
	import { ref, onMounted, computed, watch } from "vue";
	import tracks from "@/data/tracks.json";

	const weatherData = ref(null);
	const raceDayForecast = ref(null);

	const props = defineProps(["track"]); // this gives you access to the track

	const fetchWeather = async () => {
		const { lat, long } = props.track.location;
		const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,alerts&appid=${
			import.meta.env.VITE_WEATHER_API_KEY
		}&units=metric`;

		console.log("📡 Fetching from:", url);

		const res = await fetch(
			`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,alerts&appid=${
				import.meta.env.VITE_WEATHER_API_KEY
			}&units=metric`
		);

		const data = await res.json();
		weatherData.value = data;

		if (props.track.isNext && data.daily) {
			const raceTimestamp = Math.floor(
				new Date(props.track.date).getTime() / 1000
			);

			const forecastMatch = data.daily.find(
				(day) => Math.abs(day.dt - raceTimestamp) < 43200
			);

			raceDayForecast.value = forecastMatch || null;
		}

		try {
			const res = await fetch(url);
			const data = await res.json();
			console.log("✅ API response:", data);

			weatherData.value = data;
			// Forecast logic...
		} catch (err) {
			console.error("❌ Fetch error:", err);
		}
	};

	onMounted(() => {
		fetchWeather();
	});

	watch(() => props.track, fetchWeather);

	const uvLevel = computed(() => {
		const uvi = weatherData.value?.current?.uvi;

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
	<div class="track-card" v-if="weatherData && weatherData.current && uvLevel">
		<div class="track-title-uv">
			<p
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
		<p>{{ track.circuitName }}</p>
		<p>{{ track.date }}</p>
		<p>{{ track.country }}</p>
		<br />
		<p>Current Temp: {{ Math.round(weatherData.current.temp) }} °C</p>
		<p>Current Condition: {{ weatherData.current.weather[0].description }}</p>
		<!-- TODO Race Day Weather Data if possible  -->
		<div v-if="track.isNext && raceForecast">
			<p>
				Race Day Forecast:
				{{ Math.round(raceForecast.temp.day) }}°C,
				{{ raceForecast.weather[0].description }}
			</p>
		</div>

		<div v-else-if="track.isNext && !raceForecast">
			<p>Race day forecast not available yet.</p>
		</div>
	</div>

	<div v-else>
		<!-- TODO Loading Animation and maybe a message after a certain amout of time (it will run to this branch of I have no more free API calls) -->

		<p>Loading weather data...</p>
	</div>
</template>

<style scoped>
	.track-card {
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
</style>

<script setup>
	import { ref, onMounted, computed, watch } from "vue";
	import tracks from "@/data/tracks.json";

	const weatherCache = {};
	const weatherData = ref(null);
	const raceDayForecast = ref(null);

	const props = defineProps(["track"]);

	const fetchWeather = async () => {
		const { lat, long } = props.track.location;
		const cacheKey = `${lat},${long}`;

		if (weatherCache[cacheKey]) {
			weatherData.value = weatherCache[cacheKey].weather;
			raceDayForecast.value = weatherCache[cacheKey].forecast;
			return;
		}

		try {
			const res = await fetch(
				`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,alerts&appid=${
					import.meta.env.VITE_WEATHER_API_KEY
				}&units=metric`
			);

			const data = await res.json();
			weatherData.value = data;

			let forecast = null;
			if (props.track.isNext && data.daily) {
				const raceDate = new Date(props.track.date);

				forecast =
					data.daily.find((day) => {
						const forecastDate = new Date(day.dt * 1000);
						return (
							forecastDate.getUTCFullYear() === raceDate.getUTCFullYear() &&
							forecastDate.getUTCMonth() === raceDate.getUTCMonth() &&
							forecastDate.getUTCDate() === raceDate.getUTCDate()
						);
					}) || null;
			}

			raceDayForecast.value = forecast;

			weatherCache[cacheKey] = {
				weather: data,
				forecast,
			};
		} catch (err) {
			console.error("❌ Fetch error:", err);
			weatherData.value = null;
			raceDayForecast.value = null;
		}
	};

	onMounted(() => {
		fetchWeather();
	});

	watch(() => props.track, fetchWeather, { immediate: true });

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
			<div v-if="track.isNext">
				<p class="nextRace-text">Up next</p>
			</div>
			<h2>{{ track.raceName }}</h2>
		</div>
		<p>{{ track.circuitName }}</p>
		<p>{{ track.date }}</p>
		<p>{{ track.country }}</p>
		<p>Current Temp: {{ Math.round(weatherData.current.temp) }} °C</p>
		<p>Current Condition: {{ weatherData.current.weather[0].description }}</p>
		<!-- TODO Race Day Weather Data if possible  -->
		<br />
		<div v-if="track.isNext && raceDayForecast">
			<p>Race Day Temp: {{ Math.round(raceDayForecast.temp.day) }} °C</p>
			<p>Race Day Condition: {{ raceDayForecast.weather[0].description }}</p>
		</div>
		<div v-else-if="track.isNext && !raceDayForecast">
			<p>Race day forecast not available yet.</p>
		</div>
	</div>

	<div v-else>
		<!-- TODO Loading Animation and maybe a message after a certain amout of time (it will run to this branch of I have no more free API calls) Badsh*t crazy idea https://codepen.io/tholman/pen/AvWXMr -->

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

	.nextRace-text {
		text-transform: uppercase;
		font-size: 25px;
		color: #860303;
	}
</style>

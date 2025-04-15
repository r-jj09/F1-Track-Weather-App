<script setup>
	import { ref, onMounted, computed, watch } from "vue";
	import { fetchWeatherWithCache } from "../weatherCache.js";

	const props = defineProps(["track"]);
	const { lat, long } = props.track.location;

	const weatherData = ref(null);
	const raceDayForecast = ref(null);

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Check if the race day is today
	const isRaceDay = computed(() => {
		const raceDate = new Date(props.track.date);
		const raceDay = new Date(
			raceDate.getFullYear(),
			raceDate.getMonth(),
			raceDate.getDate()
		);
		return raceDay.getTime() === today.getTime();
	});

	// Fetch weather data using the centralized cache manager
	const fetchWeather = async () => {
		try {
			const { weather, raceDayForecast: forecast } =
				await fetchWeatherWithCache(lat, long, props.track.date);
			weatherData.value = weather;
			raceDayForecast.value = forecast;
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
</script>

<template>
	<div class="track-card" v-if="weatherData">
		<div class="track-title-uv">
			<p
				class="uv-badge"
				:style="{ backgroundColor: uvLevel.color, color: uvLevel.textColor }"
			>
				<span>UV Index: </span>
				<span :style="{ fontWeight: 'bold' }">{{ uvLevel.label }}</span>
			</p>
			<div v-if="isRaceDay">
				<p class="nextRace-text">Race Day</p>
			</div>
			<div v-else-if="track.isNext">
				<p class="nextRace-text">Up Next</p>
			</div>
			<h2>{{ track.raceName }}</h2>
		</div>
		<p>{{ track.circuitName }}</p>
		<p>{{ track.date }}</p>
		<p>{{ track.country }}</p>
		<p>Current Temp: {{ Math.round(weatherData.current.temp) }} °C</p>
		<p>Current Condition: {{ weatherData.current.weather[0].description }}</p>
		<div v-if="track.isNext && raceDayForecast">
			<p>
				Race Day Forecast Temp: {{ Math.round(raceDayForecast.temp.day) }} °C
			</p>
			<p>
				Race Day Forecast Condition:
				{{ raceDayForecast.weather[0].description }}
			</p>
		</div>
		<div v-else-if="track.isNext && !raceDayForecast">
			<p>Race day forecast not available yet.</p>
		</div>
	</div>
	<div v-else>
		<div class="hourglass">
			<i class="fa-solid fa-hourglass fa-2xl"></i>
		</div>
		<div class="loading-text">
			<span class="loading" ref="loading"></span>
		</div>
	</div>
</template>

<style scoped>
	.track-card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		background-color: #14a5a5;
		border-radius: 25px;
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

	.hourglass {
		padding: 10px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.fa-hourglass {
		animation: flip 2s ease-in-out infinite;
	}

	@keyframes flip {
		0% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(180deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
	.loading-text {
		margin: 2px;
		padding: 30px;
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}
	.loading {
		font-size: 25px;
	}
</style>

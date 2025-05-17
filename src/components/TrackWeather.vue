<script setup>
	import { computed, onMounted, watch } from "vue";
	import { Skycons } from "skycons-ts";

	// Define the props to receive track data
	const { track } = defineProps({
		track: Object,
	});

	// UV Index logic
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
		const raceDate = new Date(track.date);
		const todayDateOnly = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);
		const raceDateOnly = new Date(
			raceDate.getFullYear(),
			raceDate.getMonth(),
			raceDate.getDate()
		);

		return raceDateOnly.getTime() === todayDateOnly.getTime();
	});

	// Race Day Forecast logic
	const raceDayForecast = computed(() => {
		const forecastArray = track.weather?.daily;
		if (!forecastArray) return null;

		const raceDate = new Date(track.date);
		return (
			forecastArray.find((day) => {
				const forecastDate = new Date(day.dt * 1000);
				return forecastDate.toDateString() === raceDate.toDateString();
			}) || null
		);
	});

	// Generate Skycons icon ID
	const iconId = `skycon-${track.raceName.replace(/\s+/g, "-").toLowerCase()}`;

	// Helper function to get the matching Skycon icon based on description
	const getSkyconType = (desc) => {
		if (!desc) return "partly-cloudy-day";
		const d = desc.toLowerCase();
		if (d.includes("clear")) return "clear-day";
		if (d.includes("cloud")) return "cloudy";
		if (d.includes("rain")) return "rain";
		if (d.includes("storm") || d.includes("thunder")) return "sleet";
		if (d.includes("snow")) return "snow";
		if (d.includes("fog") || d.includes("mist") || d.includes("haze"))
			return "fog";
		return "partly-cloudy-day"; // Fallback
	};

	// Skycons initialization and icon update
	onMounted(() => {
		const desc = track.weather?.current?.weather?.[0]?.description;
		const icon = getSkyconType(desc);

		const skycons = new Skycons({ color: "black" });
		skycons.add(iconId, icon);
		skycons.play();
	});

	// Watch for weather description updates and update the icon
	watch(
		() => track.weather?.current?.weather?.[0]?.description,
		(newDesc) => {
			const icon = getSkyconType(newDesc);
			const skycons = new Skycons({ color: "white" });
			skycons.set(iconId, icon);
		}
	);

	// Format local time
	const localUnix = computed(
		() => track.weather.current.dt + track.weather.timezone_offset
	);
	const formattedTime = computed(() =>
		new Date(localUnix.value * 1000).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "UTC",
		})
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

			<!-- UV Index Badge -->
			<p
				v-if="(uvLevel && isRaceDay) || track.isNext"
				class="uv-badge"
				:style="{ backgroundColor: uvLevel.color, color: uvLevel.textColor }"
			>
				<span>UV Index: </span
				><span :style="{ fontWeight: 'bold' }">{{ uvLevel.label }}</span>
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

		<!-- Weather Data -->
		<div v-if="track.weather">
			<p>Local Time: {{ formattedTime }}</p>
			<p style="font-size: 29px">
				{{ Math.round(track.weather.current.temp) }}°C
			</p>

			<div style="display: flex; align-items: center; justify-content: center">
				<p>{{ track.weather.current.weather[0].description }}</p>
				<canvas
					class="weather-icon"
					:id="iconId"
					width="70"
					height="70"
				></canvas>
			</div>

			<p>Humidity: {{ track.weather.current.humidity }}%</p>
			<p>Clouds: {{ track.weather.current.clouds }}%</p>
			<p>Wind: {{ track.weather.current.wind_speed }} metre/sec</p>
			<p v-if="track.weather.current.rain">
				Chance of Rain (1h): {{ track.weather.current.rain["1h"] }} mm
			</p>

			<div v-if="raceDayForecast && !isRaceDay" class="race-forecast">
				<p>Race Day Temp: {{ Math.round(raceDayForecast.temp.day) }}°C</p>
				Race Day Condition: {{ raceDayForecast.weather[0].description }}
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
		height: 70%;
		background-color: #ffffffb7;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 0 8px 5px rgba(0, 0, 0, 0.1);
		text-align: center;
		width: 80%;
		margin: auto;
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
		font-weight: 700;
	}

	.italic-text {
		font-style: italic;
	}

	.weather-icon {
		display: flex;
	}

	/* Mobile view */

	@media (max-width: 768px) {
		.track-card {
			height: max-content;
			padding: 10px;
		}

		.nextRace-text {
			font-size: 20px;
		}

		.italic-text {
			font-size: 16px;
		}

		.weather-icon {
			width: 50px;
			height: 50px;
		}
	}
</style>

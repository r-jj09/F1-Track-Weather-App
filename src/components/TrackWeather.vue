<script setup>
	import { computed, onMounted, watch, ref, onUnmounted, toRefs } from "vue";
	import { Skycons } from "skycons-ts";
	import VanillaTilt from "vanilla-tilt";

	const props = defineProps({
		track: Object,
		isMobileDevice: Boolean,
	});

	const track = props.track; // plain prop, not reactive
	const { isMobileDevice } = toRefs(props); // just the one that needs reactivity

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

	// Weather icons
	const iconId = `skycon-${track.raceName.replace(/\s+/g, "-").toLowerCase()}`;

  const isDaytime =
      track.weather?.current &&
      track.weather.current.dt >= track.weather.current.sunrise &&
      track.weather.current.dt <= track.weather.current.sunset;

	console.log(track.Circuit.Location.country, isDaytime);

	const getSkyconType = (desc) => {
		if (!desc) return "partly-cloudy-day";
		const d = desc.toLowerCase();
		if (d.includes("clear")) return isDaytime ? "clear-day" : "clear-night";
		if (d.includes("few clouds"))
			return isDaytime ? "partly-cloudy-day" : "partly-cloudy-night";
		if (d.includes("scattered clouds"))
			return isDaytime ? "partly-cloudy-day" : "partly-cloudy-night";
		if (d.includes("broken clouds")) return "cloudy";
		if (d.includes("overcast clouds")) return "cloudy";
		if (d.includes("rain")) return "rain";
		if (d.includes("storm") || d.includes("thunder")) return "sleet";
		if (d.includes("snow")) return "snow";
		if (d.includes("fog") || d.includes("mist") || d.includes("haze"))
			return "fog";
		return "partly-cloudy-day";
	};

	onMounted(() => {
		const desc = track.weather?.current?.weather?.[0]?.description;
		const icon = getSkyconType(desc);

		const skycons = new Skycons({ color: "white" });
		skycons.add(iconId, icon);
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

	// console.log(track);

	// VanillaTilt logic
	const card = ref(null);

	const handleDeviceOrientation = (event) => {
		const { alpha, beta, gamma } = event;

		if (card.value) {
			card.value.style.transform = `rotateX(${beta}deg) rotateY(${gamma}deg) rotateZ(${alpha}deg)`;
		}
	};

	onMounted(() => {
		if (card.value && !isMobileDevice.value) {
			VanillaTilt.init(card.value, {
				reverse: false,
				max: 5,
				speed: 300,
			});

			window.addEventListener("deviceorientation", handleDeviceOrientation);
		}
	});

	onUnmounted(() => {
		if (!isMobileDevice.value) {
			window.removeEventListener("deviceorientation", handleDeviceOrientation);
		}
	});
</script>

<template>
	<div class="track-card" ref="card">
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
		<p class="italic-text">
			{{ track.Circuit.circuitName }}, {{ track.Circuit.Location.locality }} ,
			{{ track.Circuit.Location.country }}
		</p>
		<div class="weather-text" v-if="track.weather">
			<p>Local Time: {{ formattedTime }}</p>
			<div
				style="
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: center;
				"
			>
				<p class="weather-temp" style="font-size: 29px">
					{{ Math.round(track.weather.current.temp) }}°C
				</p>
				<div
					style="
						display: flex;
						align-items: center;
						justify-content: center;
						flex-direction: column;
					"
				>
					<canvas
						class="weather-icon"
						:id="iconId"
						width="70"
						height="70"
						color="white"
					></canvas>
					<!-- <p style="font-size: 10px">
						{{ track.weather.current.weather[0].description }}
					</p> -->
				</div>
			</div>

			<p>Humidity: {{ track.weather.current.humidity }}%</p>
			<p>Clouds: {{ track.weather.current.clouds }}%</p>
			<p v-if="track.weather.current.rain">
				Chance of Rain (1h): {{ track.weather.current.rain["1h"] }} mm
			</p>
			<div v-if="raceDayForecast && !isRaceDay" class="race-forecast">
				<p>Race Day Temp: {{ Math.round(raceDayForecast.temp.day) }}°C</p>
				<p>Race Day Condition: {{ raceDayForecast.weather[0].description }}</p>
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
		height: 80%;
		background-color: hsla(336, 100%, 50%, 0.5);
		border-radius: 35px;
		padding: 20px;
		box-shadow: 0 0 8px 5px rgba(255, 255, 255, 0.863);
		text-align: center;
		width: 50%;
		margin: auto;
		/* border: 5px solid #cb007b; */
		color: #ffff;
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
		font-size: 22px !important;
		color: #ff0267;
		text-shadow: #ffffff 2px 2px 1px;
		font-weight: 700;
	}

	.italic-text {
		font-style: italic;
	}

	.weather-text p,
	.race-forecast p,
	.italic-text {
		text-shadow: 1px 1px 2px #000000 !important;
	}

	.race-forecast p {
		font-size: 17px;
		font-weight: 900;
		color: #cb007b;
		text-shadow: 1px 1px 2px #ffffff !important;
	}

	.weather-icon {
		padding: 10px;
		display: flex;
	}

	/* Mobile view */

	@media (max-width: 768px) {
		.track-card {
			height: 80%;
			width: 80%;
			padding: 10px;
		}

		.italic-text,
		.weather-text p {
			font-size: 16px;
		}
		.uv-badge {
			font-size: 14px !important;
		}

		.weather-temp {
			font-size: 24px !important;
		}

		.nextRace-text {
			font-size: 20px !important;
		}

		.weather-icon {
			width: 50px;
			height: 50px;
		}
	}
</style>

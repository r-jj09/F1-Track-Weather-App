<script setup>
	import { computed, onMounted, watch, ref, onUnmounted, toRefs } from "vue";
	import { Skycons } from "skycons-ts";
	import VanillaTilt from "vanilla-tilt";

	const props = defineProps({
		track: Object,
		totalRounds: Number,
		isMobileDevice: Boolean,
	});

	const track = props.track; // plain prop, not reactive
	const { isMobileDevice } = toRefs(props); // just the one that needs reactivity

	// UV Index logic
	const uvLevel = computed(() => {
		const uvi = track.weather?.current?.uvi;
		if (uvi === undefined || uvi === null) return null;

		if (uvi <= 2) return { label: "Low", color: "#2FB45A", textColor: "#111111" };
		if (uvi <= 5)
			return { label: "Moderate", color: "#FFD60A", textColor: "#111111" };
		if (uvi <= 7) return { label: "High", color: "#FF8A1F", textColor: "#111111" };
		if (uvi <= 10)
			return { label: "Very High", color: "#E5262B", textColor: "#ffffff" };

		return { label: "Extreme", color: "#8E3BD9", textColor: "#ffffff" };
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

	// Already raced this season
	const isPastRace = computed(
		() => !isRaceDay.value && new Date(track.date) < new Date()
	);

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

	const formattedDate = new Date(track.date).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "short",
		day: "numeric",
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
				max: 3,
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
	<div class="track-card" :class="{ finished: isPastRace }" ref="card">
		<div
			v-if="uvLevel"
			class="label uv-badge"
			:style="{ backgroundColor: uvLevel.color, color: uvLevel.textColor }"
		>
			<span>UV INDEX</span><span>{{ uvLevel.label.toUpperCase() }}</span>
		</div>

		<div class="label status-row">
			<div v-if="isRaceDay" class="status-chip">RACE DAY</div>
			<div v-else-if="track.isNext" class="status-chip">UP NEXT</div>
			<div v-else-if="isPastRace" class="status-chip finished-chip">
				<i class="fa-solid fa-flag-checkered"></i>FINISHED
			</div>
			<div class="round">ROUND {{ track.round }}/{{ totalRounds }}</div>
		</div>

		<div class="title-block">
			<h2 class="race-name">{{ track.raceName }}</h2>
			<div class="label race-meta">
				{{ formattedDate }} · {{ track.Circuit.circuitName }},
				{{ track.Circuit.Location.locality }}, {{ track.Circuit.Location.country }}
			</div>
		</div>

		<template v-if="track.weather">
			<div class="section">
				<div class="label section-title">
					<span class="section-dot"></span>NOW AT CIRCUIT
					<span class="local-time">LOCAL {{ formattedTime }}</span>
				</div>

				<div class="weather-grid">
					<div class="hero-cell">
						<div class="label cell-label">TEMP</div>
						<div class="hero-value">
							{{ Math.round(track.weather.current.temp) }}<span class="unit">°C</span>
						</div>
					</div>
					<div class="hero-cell condition-cell">
						<div class="label cell-label">CONDITION</div>
						<div class="condition">
							<canvas
								class="weather-icon"
								:id="iconId"
								width="70"
								height="70"
							></canvas>
							<span>{{ track.weather.current.weather[0].description }}</span>
						</div>
					</div>
					<div class="stats-row">
						<div class="stat-cell">
							<span class="label cell-label">HUMIDITY</span>
							<span class="stat-value">{{ track.weather.current.humidity }}%</span>
						</div>
						<div class="stat-cell">
							<span class="label cell-label">CLOUDS</span>
							<span class="stat-value">{{ track.weather.current.clouds }}%</span>
						</div>
						<div v-if="track.weather.current.rain" class="stat-cell">
							<span class="label cell-label">RAIN (1H)</span>
							<span class="stat-value rain">{{ track.weather.current.rain["1h"] }} mm</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="raceDayForecast && !isRaceDay" class="section">
				<div class="label section-title muted">RACE DAY FORECAST</div>
				<div class="stats-row forecast-row">
					<div class="stat-cell">
						<span class="label cell-label">TEMP</span>
						<span class="stat-value">{{ Math.round(raceDayForecast.temp.day) }}°C</span>
					</div>
					<div class="stat-cell">
						<span class="label cell-label">CHANCE OF RAIN</span>
						<span class="stat-value rain">{{ Math.round(raceDayForecast.pop * 100) }}%</span>
					</div>
					<div class="stat-cell wide">
						<span class="label cell-label">CONDITION</span>
						<span class="stat-value capitalize">{{ raceDayForecast.weather[0].description }}</span>
					</div>
				</div>
			</div>
			<div v-else-if="isRaceDay" class="forecast-unavailable">
				Race day forecast is not available yet.
			</div>
		</template>
		<div v-else class="forecast-unavailable">Loading weather...</div>
	</div>
</template>

<style scoped>
	.track-card {
		position: relative;
		width: 100%;
		max-width: 880px;
		margin: auto;
		box-sizing: border-box;
		background: var(--panel-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-top: 6px solid var(--team-color);
		padding: clamp(18px, 3vw, 36px);
		display: flex;
		flex-direction: column;
		gap: clamp(14px, 2.2vw, 26px);
		color: #fff;
		text-align: left;
	}

	/* Finished races: chequered flag stripe instead of the team color */
	.track-card.finished {
		border-top: 1px solid rgba(255, 255, 255, 0.14);
		padding-top: calc(clamp(18px, 3vw, 36px) + 12px);
	}

	.track-card.finished::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 12px;
		background-color: #fff;
		background-image: conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0);
		background-size: 12px 12px;
	}

	.uv-badge {
		position: absolute;
		top: -20px;
		right: -10px;
		transform: rotate(15deg);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 8px 14px;
		border-radius: 4px;
		display: flex;
		gap: 8px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
		z-index: 1;
	}

	.status-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
		font-size: 12px;
	}

	.status-chip {
		background: var(--team-color);
		color: var(--team-ink);
		padding: 6px 12px;
		transform: skewX(-12deg);
		font-weight: 700;
	}

	.status-chip.finished-chip {
		background: #fff;
		color: #0e0e0e;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.round {
		color: rgba(255, 255, 255, 0.7);
	}

	.title-block,
	.section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.race-name {
		margin: 0;
		font-size: clamp(28px, 4.6vw, 58px);
		line-height: 1;
		font-style: italic;
		font-weight: 400;
		text-transform: uppercase;
		text-wrap: balance;
	}

	.race-meta {
		font-size: 13px;
		line-height: 1.6;
		letter-spacing: normal;
		color: rgba(255, 255, 255, 0.72);
		text-wrap: pretty;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.8);
	}

	.section-title.muted {
		color: rgba(255, 255, 255, 0.6);
	}

	.section-dot {
		width: 8px;
		height: 8px;
		background: var(--team-color);
		outline: 1px solid rgba(255, 255, 255, 0.4);
	}

	.local-time {
		margin-left: auto;
		color: rgba(255, 255, 255, 0.6);
	}

	.weather-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		background: rgba(255, 255, 255, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.16);
		overflow: hidden;
	}

	.hero-cell {
		background: var(--cell-bg);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.cell-label {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.hero-value {
		font-size: clamp(52px, 7.6vw, 96px);
		line-height: 0.95;
	}

	.unit {
		font-size: 0.4em;
	}

	.condition-cell {
		justify-content: space-between;
	}

	.condition {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 20px;
		line-height: 1.15;
		text-transform: capitalize;
	}

	.weather-icon {
		width: clamp(44px, 5vw, 64px);
		height: clamp(44px, 5vw, 64px);
		flex-shrink: 0;
	}

	.stats-row {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
		gap: 1px;
	}

	.forecast-row {
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
	}

	.stat-cell {
		background: var(--cell-bg);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-cell.wide {
		grid-column: span 2;
	}

	.stat-value {
		font-size: 20px;
	}

	.stat-value.rain {
		color: var(--team-text);
	}

	.capitalize {
		text-transform: capitalize;
	}

	.forecast-unavailable {
		border: 1px dashed rgba(255, 255, 255, 0.3);
		padding: 18px;
		font-size: 18px;
		color: rgba(255, 255, 255, 0.85);
	}

	@media (max-width: 768px) {
		.weather-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.condition {
			font-size: 18px;
		}

		.stat-cell.wide {
			grid-column: 1 / -1;
		}
	}
</style>

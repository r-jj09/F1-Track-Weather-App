<script setup>
	import { computed, onMounted, watch, ref, onUnmounted, toRefs } from "vue";
	import { Skycons } from "skycons-ts";
	import VanillaTilt from "vanilla-tilt";
	import { todayAtTrack, trackDate, raceStartUnix, raceDateAtTrack } from "../utils/dates";
	import { buildAlerts, glossaryTitle, langForCountry, LANG_NAMES, translate } from "../utils/alerts";

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

	// Is it Race Day? Compared in the track's local time
	const todayHere = todayAtTrack(track.weather);
	const raceDate = raceDateAtTrack(track);
	const isRaceDay = computed(() => raceDate === todayHere);

	// Already raced this season
	const isPastRace = computed(() => raceDate < todayHere);

	// Today's forecast at the track: chance of rain (`pop`) only exists in forecasts, not in `current`
	const todayForecast = computed(() => {
		const forecastArray = track.weather?.daily;
		if (!forecastArray) return null;

		const offset = track.weather.timezone_offset ?? 0;
		return forecastArray.find((day) => trackDate(day.dt, offset) === todayHere) ?? null;
	});

	// Race Day Forecast logic
	// `daily` covers today + the next 7 days, so this only matches once the race is inside that window
	const raceDayForecast = computed(() => {
		const forecastArray = track.weather?.daily;
		if (!forecastArray) return null;

		const offset = track.weather.timezone_offset ?? 0;
		return (
			forecastArray.find((day) => trackDate(day.dt, offset) === raceDate) ||
			null
		);
	});

	// Lights-out forecast
	// `hourly` covers the next 48h and is only requested for a race starting inside that window
	const raceStart = raceStartUnix(track);
	const now = ref(Date.now() / 1000);
	const clock = setInterval(() => (now.value = Date.now() / 1000), 60_000);

	const formatHour = (unix) =>
		new Date((unix + (track.weather?.timezone_offset ?? 0)) * 1000).toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "UTC",
		});

	const hourIcon = (hour) => {
		const weather = hour.weather?.[0];
		const night = weather?.icon?.endsWith("n");
		switch (weather?.main) {
			case "Clear":
				return night ? "fa-moon" : "fa-sun";
			case "Clouds":
				if (weather.id === 801) return night ? "fa-cloud-moon" : "fa-cloud-sun";
				return "fa-cloud";
			case "Drizzle":
				return "fa-cloud-rain";
			case "Rain":
				return weather.id >= 502 ? "fa-cloud-showers-heavy" : "fa-cloud-rain";
			case "Thunderstorm":
				return "fa-cloud-bolt";
			case "Snow":
				return "fa-snowflake";
			default:
				return "fa-smog";
		}
	};

	// The hour before the start, the start hour and the two race hours after it
	const lightsOut = computed(() => {
		const hourly = track.weather?.hourly;
		if (!raceStart || !Array.isArray(hourly)) return null;

		const startIndex = hourly.findIndex(
			(hour) => hour.dt <= raceStart && raceStart < hour.dt + 3600
		);
		if (startIndex === -1) return null;

		return hourly.slice(Math.max(startIndex - 1, 0), startIndex + 3).map((hour) => ({
			dt: hour.dt,
			time: formatHour(hour.dt),
			temp: Math.round(hour.temp),
			pop: Math.round((hour.pop ?? 0) * 100),
			rain: hour.rain?.["1h"] ?? 0,
			wind: Math.round((hour.wind_speed ?? 0) * 3.6),
			icon: hourIcon(hour),
			description: hour.weather?.[0]?.description ?? "",
			isStart: hour.dt === hourly[startIndex].dt,
		}));
	});

	const countdown = computed(() => {
		if (!raceStart) return null;
		const diff = raceStart - now.value;
		if (diff <= 0) return diff > -2 * 3600 ? "RACE ON" : "FINISHED";
		const days = Math.floor(diff / 86400);
		const hours = Math.floor((diff % 86400) / 3600);
		const minutes = Math.floor((diff % 3600) / 60);
		if (days) return `IN ${days}D ${hours}H`;
		if (hours) return `IN ${hours}H ${minutes}M`;
		return `IN ${minutes}M`;
	});

	const lightsOutLabel = raceStart
		? new Date((raceStart + (track.weather?.timezone_offset ?? 0)) * 1000).toLocaleString("en-GB", {
				weekday: "short",
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "UTC",
			}).toUpperCase()
		: null;

	// Next race, start time known, but still more than 48h away
	const showLightsOutHint = computed(
		() => track.isNext && raceStart && !lightsOut.value && raceStart > now.value
	);

	// Weather alerts → flags (cleaned up, merged per event, translated on demand)
	const alertLang = langForCountry(track.Circuit.Location.country);
	const alerts = computed(() => buildAlerts(track.weather?.alerts));

	const formatTrackTime = (unix) =>
		new Date((unix + (track.weather?.timezone_offset ?? 0)) * 1000).toLocaleString(
			"en-GB",
			{ weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }
		);

	const nowSeconds = Date.now() / 1000;

	// English text by original text, filled in as translations come back
	const translations = ref({});
	const translating = ref({});

	async function translateText(text, isTitle = false) {
		if (!text || text in translations.value || translating.value[text]) return;
		translating.value[text] = true;
		const english = await translate(text, alertLang, isTitle);
		translations.value[text] = english;
		translating.value[text] = false;
	}

	const alertTitle = (alert) =>
		glossaryTitle(alert.event) ?? translations.value[alert.event] ?? alert.event;

	const isTranslated = (text) =>
		Boolean(translations.value[text]) && translations.value[text] !== text;

	// Titles are always visible, so translate those up front (cached after the first time)
	watch(
		alerts,
		(list) => {
			for (const alert of list) {
				if (!glossaryTitle(alert.event)) translateText(alert.event, true);
			}
		},
		{ immediate: true }
	);

	// Descriptions only when a flag is opened, to keep within MyMemory's free daily quota
	function onAlertToggle(alert, event) {
		if (!event.target.open) return;
		for (const part of alert.parts) translateText(part.description);
	}

	const formattedDate = new Date(raceDate).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC", // "YYYY-MM-DD" parses as UTC, keep it there so it doesn't shift a day
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
		// No weather = no icon canvas on the card
		if (!track.weather) return;
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
		clearInterval(clock);
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

		<div v-if="alerts.length" class="alerts">
			<details
				v-for="alert in alerts"
				:key="alert.key"
				class="alert"
				:style="{ '--flag': alert.flag.color, '--flag-ink': alert.flag.ink }"
				@toggle="onAlertToggle(alert, $event)"
			>
				<summary>
					<span class="label alert-flag">
						<i class="fa-solid fa-flag"></i>{{ alert.flag.name }}
					</span>
					<span class="alert-text">
						<span class="alert-event" :title="alert.event">{{ alertTitle(alert) }}</span>
						<span class="label alert-until">
							<template v-if="alert.start > nowSeconds">FROM {{ formatTrackTime(alert.start) }} · </template>
							<template v-if="alert.end">UNTIL {{ formatTrackTime(alert.end) }}</template>
						</span>
					</span>
					<i class="fa-solid fa-chevron-down alert-toggle"></i>
				</summary>
				<div class="alert-parts">
					<div v-for="(part, i) in alert.parts" :key="i" class="alert-part">
						<div v-if="alert.parts.length > 1" class="label alert-part-time">
							<span class="alert-part-dot" :style="{ background: part.flag.color }"></span>
							{{ formatTrackTime(part.start) }} – {{ formatTrackTime(part.end) }}
						</div>
						<p class="label alert-description">
							<template v-if="translating[part.description]">Translating…</template>
							<template v-else>{{ translations[part.description] || part.description }}</template>
						</p>
					</div>
				</div>
				<p class="label alert-sender">
					{{ alert.sender }}
					<template v-if="alert.parts.some((part) => isTranslated(part.description))">
						· Translated from {{ LANG_NAMES[alertLang] ?? "the original" }} by MyMemory
					</template>
				</p>
			</details>
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
						<div v-if="todayForecast" class="stat-cell">
							<span class="label cell-label">RAIN TODAY</span>
							<span class="stat-value rain">
								{{ Math.round(todayForecast.pop * 100) }}%<span v-if="todayForecast.rain" class="stat-extra"> · {{ todayForecast.rain.toFixed(1) }} mm</span>
							</span>
						</div>
						<div v-if="track.weather.current.rain" class="stat-cell">
							<span class="label cell-label">RAIN (1H)</span>
							<span class="stat-value rain">{{ track.weather.current.rain["1h"] }} mm</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="lightsOut" class="section">
				<div class="label section-title">
					<span class="section-dot"></span>LIGHTS OUT
					<span class="local-time">{{ lightsOutLabel }} LOCAL · {{ countdown }}</span>
				</div>
				<div class="hours-row">
					<div
						v-for="hour in lightsOut"
						:key="hour.dt"
						class="hour-cell"
						:class="{ start: hour.isStart }"
					>
						<span class="label cell-label">
							{{ hour.time }}<template v-if="hour.isStart"> · START</template>
						</span>
						<span class="hour-main">
							<i class="fa-solid" :class="hour.icon" :title="hour.description"></i>
							{{ hour.temp }}°
						</span>
						<span class="label hour-rain">
							<i class="fa-solid fa-droplet"></i>{{ hour.pop }}%<template v-if="hour.rain"> · {{ hour.rain.toFixed(1) }} mm</template>
						</span>
						<span class="label hour-wind">
							<i class="fa-solid fa-wind"></i>{{ hour.wind }} km/h
						</span>
					</div>
				</div>
			</div>
			<div v-else-if="showLightsOutHint" class="label lights-out-hint">
				<i class="fa-regular fa-clock"></i>
				Hour-by-hour lights-out forecast opens 48 hours before the start ·
				{{ lightsOutLabel }} LOCAL
			</div>

			<div v-if="raceDayForecast" class="section">
				<div class="label section-title muted">RACE DAY FORECAST</div>
				<div class="stats-row forecast-row">
					<div class="stat-cell">
						<span class="label cell-label">TEMP</span>
						<span class="stat-value">{{ Math.round(raceDayForecast.temp.day) }}°C</span>
					</div>
					<div class="stat-cell">
						<span class="label cell-label">CHANCE OF RAIN</span>
						<span class="stat-value rain">
							{{ Math.round(raceDayForecast.pop * 100) }}%<span v-if="raceDayForecast.rain" class="stat-extra"> · {{ raceDayForecast.rain.toFixed(1) }} mm</span>
						</span>
					</div>
					<div class="stat-cell wide">
						<span class="label cell-label">CONDITION</span>
						<span class="stat-value capitalize">{{ raceDayForecast.weather[0].description }}</span>
					</div>
				</div>
			</div>
		</template>
		<div v-else class="forecast-unavailable no-weather">
			<i class="fa-solid fa-cloud" aria-hidden="true"></i>
			<span>Weather for this track isn't available right now.</span>
		</div>
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

	/* Lights-out hourly forecast */
	.hours-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.hour-cell {
		background: var(--cell-bg);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		border-top: 3px solid transparent;
	}

	.hour-cell.start {
		border-top-color: var(--team-color);
		background: color-mix(in srgb, var(--team-color) 12%, var(--cell-bg));
	}

	.hour-cell.start .cell-label {
		color: var(--team-text);
	}

	.hour-main {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 24px;
	}

	.hour-main i {
		font-size: 20px;
		width: 24px;
		text-align: center;
	}

	.hour-rain,
	.hour-wind {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.75);
	}

	.hour-rain {
		color: var(--team-text);
	}

	.lights-out-hint {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 11px;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
	}

	.stat-extra {
		font-size: 0.7em;
		color: rgba(255, 255, 255, 0.6);
	}

	.capitalize {
		text-transform: capitalize;
	}

	/* Weather alerts as track flags */
	.alerts {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.alert {
		border: 1px solid var(--flag);
		background: var(--cell-bg);
	}

	.alert summary {
		list-style: none;
		cursor: pointer;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 14px;
		padding-right: 14px;
	}

	.alert summary::-webkit-details-marker {
		display: none;
	}

	.alert-flag {
		align-self: stretch;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--flag);
		color: var(--flag-ink);
		font-size: 12px;
		font-weight: 700;
		animation: flagWave 1.6s ease-in-out infinite;
	}

	@keyframes flagWave {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(0.75); }
	}

	.alert-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 2px 14px;
		padding: 10px 0;
	}

	.alert-event {
		font-size: 16px;
		line-height: 1.2;
	}

	.alert-until {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.alert-toggle {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
		transition: transform 0.2s;
	}

	.alert[open] .alert-toggle {
		transform: rotate(180deg);
	}

	.alert-parts {
		max-height: 220px;
		overflow-y: auto;
		padding: 12px 14px 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.alert-part-time {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.alert-part-dot {
		width: 8px;
		height: 8px;
		flex-shrink: 0;
	}

	.alert-description {
		margin: 0;
		font-size: 12px;
		line-height: 1.6;
		letter-spacing: normal;
		white-space: pre-line;
		color: rgba(255, 255, 255, 0.82);
	}

	.alert-sender {
		margin: 0;
		padding: 8px 14px 12px;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (prefers-reduced-motion: reduce) {
		.alert-flag {
			animation: none;
		}
	}

	.forecast-unavailable {
		border: 1px dashed rgba(255, 255, 255, 0.3);
		padding: 18px;
		font-size: 18px;
		color: rgba(255, 255, 255, 0.85);
	}

	.no-weather {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.no-weather i {
		font-size: 24px;
		color: rgba(255, 255, 255, 0.5);
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

		.hours-row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		/* Flag shrinks to its icon, title and time stack */
		.alert-flag {
			font-size: 0;
			gap: 0;
		}

		.alert-flag i {
			font-size: 14px;
		}

		.alert-text {
			flex-direction: column;
			align-items: flex-start;
		}

		.alert-event {
			font-size: 15px;
		}
	}
</style>

<script setup>
	import { ref, onMounted, computed, watch, nextTick } from "vue";
  import { Swiper, SwiperSlide } from "swiper/vue";
	import "swiper/css";
	import TrackWeather from "./components/TrackWeather.vue";
	import OffSeason from "./components/OffSeason.vue";
	import WeatherError from "./components/WeatherError.vue";
	import { todayLocal } from "./utils/dates";
	const currentYear = new Date().getFullYear();
  const modules = import.meta.glob("/src/data/*tracks.json", { eager: true });
  const tracksBackUp = modules["/src/data/tracks.json"];


  const hasValidWeather = ref(false);
	const isLoading = ref(true);
	var tracks = ref([]);
	const weatherData = ref({});
	const trackIndex = ref(0);
  const isOffSeason = ref(false);

	const swiperInstance = ref(null);
	const activeIndex = ref(0);

	const apiUrl = `https://api.jolpi.ca/ergast/f1/${currentYear}/races.json`;

	// Race Data
  const fetchTracks = async () => {
    isLoading.value = true;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Race API failed with status ${response.status}`);
      }

      const data = await response.json();

      const races =
          data?.MRData?.RaceTable?.Races &&
          Array.isArray(data.MRData.RaceTable.Races)
              ? data.MRData.RaceTable.Races
              : [];

      if (races.length > 0) {
        console.log("🟢 Loaded tracks from API");
        tracks.value = races;
      } else {
        console.warn("🟡 API returned empty — using backup JSON");
        tracks.value = tracksBackUp?.default ?? [];
      }
    } catch (error) {
      console.warn("🔴 API failed — using backup JSON");
      tracks.value = tracksBackUp?.default ?? [];

      console.log("Backup array:", tracksBackUp.default);
    }

    if (tracks.value && tracks.value.length) {
      const today = todayLocal();

      const todayRaceIndex = tracks.value.findIndex((track) =>
          isToday(track.date)
      );

      if (todayRaceIndex !== -1) {
        // There is a race today
        trackIndex.value = todayRaceIndex;
        isOffSeason.value = false;
      } else {
        // Look for the next race in the future
        const nextIdx = tracks.value.findIndex(
            (track) => track.date >= today
        );

        if (nextIdx !== -1) {
          // We still have a future race this season
          trackIndex.value = nextIdx;
          isOffSeason.value = false;
        } else {
          // 👉 No future races = OFF SEASON
          trackIndex.value = tracks.value.length - 1; // last race of the season
          isOffSeason.value = true;
          console.log("Off season! Enjoy winter break!")
        }
      }
    } else {
      trackIndex.value = 0;
      isOffSeason.value = false;
    }

    isLoading.value = false;
  };

  // Weather Data
  // Comes from our own /api/weather, which caches OpenWeather for every visitor
  // (one call per track per visitor used to burn through the daily quota)
  const WEATHER_TIMEOUT_MS = 25_000; // the very first fetch after a cold cache can take a while

  // fetch() never times out on its own, a hanging request would keep the loader up forever
  async function fetchWithTimeout(url, ms = WEATHER_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  const trackKey = (track) => track.raceName.toLowerCase().replace(/\s+/g, "-");

  // Dev only: `?mockWeatherError=quota|auth|server|timeout|network|partial` previews the error states
  const mockWeatherError = import.meta.env.DEV
      ? new URLSearchParams(location.search).get("mockWeatherError")
      : null;

  // { kind, failed, total } when some or all tracks have no weather
  const weatherError = ref(null);

  const fetchAllWeather = async () => {
    const params = new URLSearchParams();

    // Dev only: `?mockLightsOut` moves the opening race to ~20h from now to preview the lights-out forecast
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("mockLightsOut")) {
      const opening = tracks.value[trackIndex.value];
      const start = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000 + 20 * 3_600_000);
      if (opening) {
        opening.date = start.toISOString().slice(0, 10);
        opening.time = start.toISOString().slice(11, 19) + "Z";
      }
      params.set("mockLightsOut", "1");
    }

    let body = null;
    let kind = null;
    if (mockWeatherError && mockWeatherError !== "partial") {
      kind = mockWeatherError;
    } else {
      try {
        const query = params.toString();
        const res = await fetchWithTimeout("/api/weather" + (query ? "?" + query : ""));
        body = await res.json().catch(() => null);
        if (!body?.weather) kind = body?.error ?? "server";
      } catch (e) {
        kind = e.name === "AbortError" ? "timeout" : "network";
      }
    }

    const results = {};
    for (const [index, track] of tracks.value.entries()) {
      const data = body?.weather?.[trackKey(track)] ?? null;
      results[trackKey(track)] = mockWeatherError === "partial" && index % 4 === 1 ? null : data;
    }

    // Dev only: `?mockAlerts` puts sample alerts on the opening race to preview the flag banners
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("mockAlerts")) {
      const { mockAlerts } = await import("./data/mockAlerts.js");
      const opening = tracks.value[trackIndex.value];
      if (opening && results[trackKey(opening)]) results[trackKey(opening)].alerts = mockAlerts();
    }

    weatherData.value = results;
    hasValidWeather.value = Object.values(results).some((d) => d && d.current);

    const failed = tracks.value.filter((track) => !results[trackKey(track)]).length;
    weatherError.value = failed
        ? { kind: kind ?? body?.error ?? "server", failed, total: tracks.value.length }
        : null;
    isLoading.value = false;
  };

  // The server only re-requests what's missing and backs off after errors, so a retry is cheap
  const isRetrying = ref(false);
  const showWithoutWeather = ref(false);
  const bannerDismissed = ref(false);

  async function retryWeather() {
    isRetrying.value = true;
    bannerDismissed.value = false;
    await fetchAllWeather();
    isRetrying.value = false;
  }

  const showErrorScreen = computed(
      () => !isLoading.value && !hasValidWeather.value && !showWithoutWeather.value
  );
  const showPitWall = computed(
      () => !isLoading.value && (hasValidWeather.value || showWithoutWeather.value)
  );


  // Find next race index
	const nextRaceIndex = computed(() => {
		return tracks.value.findIndex(
			(track) => track.date >= todayLocal()
		);
	});

	// Tag the next race
	const tracksWithNextIndicator = computed(() =>
		tracks.value.map((track, index) => {
			const key = trackKey(track);
			return {
				...track,
				isNext: index === nextRaceIndex.value,
				weather: weatherData.value[key] || null, // Attach weather here
			};
		})
	);

	const totalRounds = computed(() => tracksWithNextIndicator.value.length);

	const isMobileDevice = ref(false);
	onMounted(() => {
		const ua = navigator.userAgent || window.opera;
		isMobileDevice.value = /android|iphone|ipad|ipod|mobile/i.test(ua);
	});

	// Progress bar + racecar
	// One continuous position (0 … totalRounds - 1) drives both the fill and the car,
	// so the car's nose always sits on the edge of the fill, also while dragging.
	const position = ref(-1); // -1 = empty bar, the car drives in from here on load
	const isDragging = ref(false);
	const isMoving = ref(false);
	const isReversing = ref(false);
	const isIntro = ref(true);
	let movingTimer = null;

	const progressPercent = computed(() => {
		const total = totalRounds.value;
		if (!total) return 0;
		const clamped = Math.min(Math.max(position.value, -1), total - 1);
		return ((clamped + 1) / total) * 100;
	});

	// Never let the car leave the screen on round 1
	const racecarLeft = computed(() => `max(var(--car-width), ${progressPercent.value}%)`);

	function setPosition(next) {
		const delta = next - position.value;
		if (Math.abs(delta) > 0.001) {
			isReversing.value = delta < 0;
			isMoving.value = true;
			clearTimeout(movingTimer);
			movingTimer = setTimeout(() => {
				isMoving.value = false;
				isReversing.value = false;
			}, isIntro.value ? 1200 : 400);
		}
		position.value = next;
	}

	// Watch for Swiper slide changes
	function onSwiper(swiper) {
		swiperInstance.value = swiper;
		activeIndex.value = swiper.activeIndex;
		swiper.on("slideChange", () => {
			activeIndex.value = swiper.activeIndex;
		});

		// Continuous while dragging, then once more with the final value when it snaps
		swiper.on("progress", (_swiper, progress) => {
			if (isIntro.value) return;
			setPosition(progress * (totalRounds.value - 1));
		});
		swiper.on("sliderFirstMove", () => (isDragging.value = true));
		swiper.on("touchEnd", () => (isDragging.value = false));

		// Drive in from the start line to the opening race
		requestAnimationFrame(() => {
			setPosition(swiper.activeIndex);
			setTimeout(() => {
				isIntro.value = false;
				// Catch up if the user already swiped during the intro
				setPosition(swiper.progress * (totalRounds.value - 1));
			}, 1200);
		});
	}

	const slidePrev = () => swiperInstance.value?.slidePrev();
	const slideNext = () => swiperInstance.value?.slideNext();

	// Click anywhere on the bar to jump to that round
	function jumpToRound(event) {
		const bar = event.currentTarget.getBoundingClientRect();
		const fraction = (event.clientX - bar.left) / bar.width;
		const round = Math.min(
			Math.max(Math.floor(fraction * totalRounds.value), 0),
			totalRounds.value - 1
		);
		swiperInstance.value?.slideTo(round);
	}

	onMounted(async () => {
		await fetchTracks();
		await fetchAllWeather();

		isLoading.value = false;

		await nextTick();
	});

	function isToday(dateStr) {
		return dateStr === todayLocal();
	}

	const teamColors = {
		ferrari: "#DC0000", // Iconic Scuderia Ferrari red
		redbull: "#00106a", // Dark navy-blue with a vibrant punch
		mercedes: "#00D2BE", // Petronas turquoise
		audi: "#818181", // Chrome gray
		mclaren: "#FF8000", // Papaya orange
		williams: "#1666f8", // Deep Williams blue
		alpine: "#FF87BC", // Pink BWT Alpine (common in some races)
		haas: "#7D1A1A", // Rich maroon with a gritty race feel
		racingbulls: "#FFFFFF", // VCARB: mostly white with navy trim
		aston: "#00665E", // British racing green (dark green-teal)
    cadilac: "#262626", // Dark gray, almost black (update after the car launch pls!!)
	};

	const randomTeamEntry = computed(() => {
		const entries = Object.entries(teamColors);
		const randomIndex = Math.floor(Math.random() * entries.length);
		const [team, color] = entries[randomIndex];
		return { team, color };
	});

	// Relative luminance, used to keep team-colored text and chips readable
	function luminance(hex) {
		const n = hex.replace("#", "");
		const [r, g, b] = [0, 2, 4]
			.map((i) => parseInt(n.substr(i, 2), 16) / 255)
			.map((v) =>
				v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
			);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}

	// Black or white text, whichever contrasts more with the background (white on papaya orange doesn't)
	function inkFor(hex) {
		const L = luminance(hex);
		const onDark = (L + 0.05) / (luminance("#0e0e0e") + 0.05);
		const onWhite = 1.05 / (L + 0.05);
		return onDark >= onWhite ? "#0e0e0e" : "#ffffff";
	}

	// Raise the lightness (keeping hue and saturation) until the color stands out on the dark background
	function lighten(hex, minLuminance = 0.12) {
		if (luminance(hex) >= minLuminance) return hex;

		const n = hex.replace("#", "");
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.substr(i, 2), 16) / 255);
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const d = max - min;
		let h = 0;
		if (d) {
			if (max === r) h = ((g - b) / d) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
		}
		h = (h * 60 + 360) % 360;
		const l0 = (max + min) / 2;
		const sat = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;

		const toHex = (l) => {
			const c = (1 - Math.abs(2 * l - 1)) * sat;
			const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
			const m = l - c / 2;
			const [r1, g1, b1] =
				h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
				h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
			return "#" + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
		};

		for (let l = l0; l <= 1; l += 0.02) {
			const candidate = toHex(l);
			if (luminance(candidate) >= minLuminance) return candidate;
		}
		return "#ffffff";
	}

	watch(
		() => randomTeamEntry.value.color,
		(newColor) => {
			const L = luminance(newColor);
			const root = document.documentElement.style;
			root.setProperty("--team-color", newColor);
			// Dark team colors (Red Bull, Cadillac...) fall back to white for text on dark panels
			root.setProperty("--team-text", L > 0.12 ? newColor : "#ffffff");
			// Text placed on top of a team-colored background
			root.setProperty("--team-ink", inkFor(newColor));
			// Glowing elements (start lights) and buttons: lightened team color so it stands out on dark
			const glow = lighten(newColor);
			root.setProperty("--team-glow", glow);
			root.setProperty("--team-glow-ink", inkFor(glow));
		},
		{ immediate: true }
	);
</script>

<template>
  <!-- Loader: start lights -->
  <div v-if="isLoading" class="preloader">
    <div class="start-lights">
      <span v-for="i in 5" :key="i" :style="{ animationDelay: `${(i - 1) * 0.32}s` }"></span>
    </div>
    <div class="label preloader-text">LOOKING OUTSIDE FOR YOU... ONE SEC</div>
  </div>

  <!-- Nothing loaded at all: red flag screen -->
  <WeatherError
      v-else-if="showErrorScreen"
      :kind="weatherError?.kind"
      :failed="weatherError?.failed"
      :total="weatherError?.total"
      :retrying="isRetrying"
      @retry="retryWeather"
      @continue="showWithoutWeather = true"
  />

	<div v-if="showPitWall" class="pit-wall">
		<Swiper
			:slides-per-view="1"
			:initial-slide="trackIndex"
			:space-between="0"
			:grab-cursor="true"
			class="full-screen-swiper"
			@swiper="onSwiper"
		>
			<SwiperSlide v-for="(track, index) in tracksWithNextIndicator" :key="index">
				<TrackWeather
					:key="track.weather ? 'weather' : 'no-weather'"
					:track="track"
					:total-rounds="totalRounds"
					:is-mobile-device="isMobileDevice"
				/>
			</SwiperSlide>
		</Swiper>

		<div
			class="race-progress"
			:class="{ dragging: isDragging, intro: isIntro }"
			role="progressbar"
			aria-label="Season progress"
			:aria-valuenow="activeIndex + 1"
			aria-valuemin="1"
			:aria-valuemax="totalRounds"
			title="Jump to a round"
			@click="jumpToRound"
		>
			<div class="race-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
			<div
				class="racecar-marker"
				:class="{ moving: isMoving, reversing: isReversing }"
				:style="{ left: racecarLeft }"
			></div>
		</div>

		<!-- Missing weather: safety car, the races are still there, just not at full speed -->
		<div
			v-if="weatherError && !bannerDismissed"
			class="weather-banner"
			role="status"
		>
			<span class="label weather-banner-flag">
				<span class="sc-lights" aria-hidden="true"><span></span><span></span></span>
				<i class="fa-solid fa-car-side" aria-hidden="true"></i>
				<span class="flag-full">SAFETY CAR</span><span class="flag-short">SC</span>
			</span>
			<span class="label weather-banner-text">
				<template v-if="weatherError.kind === 'quota'">Out of weather data for today · </template>
				<template v-else-if="weatherError.kind === 'timeout' || weatherError.kind === 'network'">Weather service not responding · </template>
				Weather missing for {{ weatherError.failed }} of {{ weatherError.total }} races
			</span>
			<button class="label weather-banner-btn" :disabled="isRetrying" @click="retryWeather">
				<i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': isRetrying }"></i>{{ isRetrying ? "RETRYING…" : "RETRY" }}
			</button>
			<button class="weather-banner-close" aria-label="Dismiss" @click="bannerDismissed = true">
				<i class="fa-solid fa-xmark"></i>
			</button>
		</div>

		<!-- Desktop: side arrows -->
		<button
			class="nav-btn nav-side nav-side-prev"
			aria-label="Previous race"
			:disabled="activeIndex === 0"
			@click="slidePrev"
		><i class="fa-solid fa-chevron-left"></i></button>
		<button
			class="nav-btn nav-side nav-side-next"
			aria-label="Next race"
			:disabled="activeIndex === totalRounds - 1"
			@click="slideNext"
		><i class="fa-solid fa-chevron-right"></i></button>

		<!-- Mobile: bottom bar with round counter -->
		<div class="nav-bottom">
			<button
				class="nav-btn"
				aria-label="Previous race"
				:disabled="activeIndex === 0"
				@click="slidePrev"
			><i class="fa-solid fa-chevron-left"></i></button>
			<div class="label nav-count">{{ activeIndex + 1 }} / {{ totalRounds }}</div>
			<button
				class="nav-btn"
				aria-label="Next race"
				:disabled="activeIndex === totalRounds - 1"
				@click="slideNext"
			><i class="fa-solid fa-chevron-right"></i></button>
		</div>
	</div>

  <OffSeason v-if="isOffSeason"></OffSeason>
</template>

<style>
	:root {
		--team-color: #ff0000; /* Default color */
		--team-text: #ff0000;
		--team-ink: #ffffff;
		--team-glow: #ff0000;
		--team-glow-ink: #ffffff;
		--panel-bg: rgba(8, 8, 10, 0.9);
		--cell-bg: #0b0b0d;
		--label-font: "JetBrains Mono", monospace;
	}

	.label {
		font-family: var(--label-font);
		letter-spacing: 0.14em;
	}

	/* Loader */
	.preloader {
		position: fixed;
		inset: 0;
		z-index: 11;
		background: #0e0e0e;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 32px;
	}

	.start-lights {
		display: flex;
		gap: 14px;
	}

	.start-lights span {
		width: 30px;
		height: 30px;
		border-radius: 999px;
		background: #26262a;
		animation: lightOn 2.6s infinite;
	}

	@keyframes lightOn {
		0%, 6% { background: #26262a; box-shadow: none; }
		10%, 78% { background: var(--team-glow); box-shadow: 0 0 22px var(--team-glow); }
		82%, 100% { background: #26262a; box-shadow: none; }
	}

	.preloader-text {
		font-size: 13px;
		color: #fff;
		text-align: center;
		max-width: 240px;
		line-height: 1.7;
	}

	/* Pit wall */
	.pit-wall {
		position: relative;
	}

	.full-screen-swiper {
		width: 100%;
		height: 100dvh;
	}

	.swiper-slide {
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		padding: 44px 96px 48px;
		overflow-y: auto;
	}

	/* Checkered progress bar + racecar */
	.race-progress {
		--car-width: 60px;
		--progress-speed: 0.3s;
		position: absolute;
		top: 8px;
		left: 0;
		right: 0;
		height: 20px;
		z-index: 2;
		cursor: pointer;
		background-color: #fff;
		background-image: conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0);
		background-size: 20px 20px;
	}

	.race-progress.intro {
		--progress-speed: 1.2s;
	}

	/* Follow the finger 1:1 while dragging, ease when it snaps */
	.race-progress.dragging {
		--progress-speed: 0s;
	}

	.race-progress-fill {
		height: 100%;
		background-color: var(--team-color);
		transition: width var(--progress-speed) cubic-bezier(0.25, 0.8, 0.35, 1);
	}

	.racecar-marker {
		position: absolute;
		top: -25px;
		width: var(--car-width);
		height: 70px;
		background-image: url(/racecar.svg);
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
		/* Nose on the edge of the fill */
		transform: translateX(-100%);
		/* White outline so the black car shows on dark team colors */
		filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff);
		transition: left var(--progress-speed) cubic-bezier(0.25, 0.8, 0.35, 1),
			transform 0.2s ease;
		pointer-events: none;
	}

	/* Turn around when driving back to an earlier round */
	.racecar-marker.reversing {
		transform: translateX(-100%) scaleX(-1);
	}

	/* Engine rumble while moving */
	.racecar-marker.moving {
		animation: rumble 0.12s linear infinite;
	}

	@keyframes rumble {
		0%, 100% { margin-top: 0; }
		50% { margin-top: -1px; }
	}

	@media (prefers-reduced-motion: reduce) {
		.race-progress,
		.race-progress.intro {
			--progress-speed: 0s;
		}

		.racecar-marker.moving {
			animation: none;
		}
	}

	.nav-btn {
		width: 44px;
		height: 44px;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.28);
		border-radius: 0;
		background: rgba(8, 8, 10, 0.7);
		color: #fff;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.nav-btn:hover:not(:disabled) {
		border-color: var(--team-text);
		background: rgba(8, 8, 10, 0.9);
	}

	.nav-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.nav-side {
		position: absolute;
		top: 50%;
		margin-top: -22px;
		z-index: 2;
	}

	.nav-side-prev {
		left: 20px;
	}

	.nav-side-next {
		right: 20px;
	}

	.nav-bottom {
		display: none;
		position: absolute;
		left: 0;
		right: 0;
		bottom: 24px;
		align-items: center;
		justify-content: center;
		gap: 20px;
		z-index: 2;
	}

	.nav-count {
		font-size: 14px;
		letter-spacing: 0.1em;
		min-width: 72px;
		text-align: center;
		color: #fff;
	}

	/* Missing weather banner */
	.weather-banner {
		--flag: #ffd60a;
		--flag-ink: #111111;
		position: absolute;
		top: 40px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		width: max-content;
		max-width: calc(100% - 32px);
		display: flex;
		align-items: center;
		background: rgba(8, 8, 10, 0.92);
		border: 1px solid var(--flag);
		color: #fff;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	}

	.weather-banner-flag {
		align-self: stretch;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--flag);
		color: var(--flag-ink);
		font-size: 11px;
		font-weight: 700;
		white-space: nowrap;
	}

	.flag-short {
		display: none;
	}

	/* The two orange lights on the safety car's roof, flashing in turn */
	.sc-lights {
		display: flex;
		gap: 3px;
	}

	.sc-lights span {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: #ff8a1f;
		box-shadow: 0 0 6px #ff8a1f;
		animation: scFlash 0.8s steps(1) infinite;
	}

	.sc-lights span:last-child {
		animation-delay: 0.4s;
	}

	@keyframes scFlash {
		0% { opacity: 1; }
		50% { opacity: 0.2; box-shadow: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		.sc-lights span {
			animation: none;
		}
	}

	.weather-banner-text {
		padding: 8px 14px;
		font-size: 11px;
		letter-spacing: 0.06em;
		line-height: 1.5;
	}

	.weather-banner-btn,
	.weather-banner-close {
		align-self: stretch;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px;
		background: transparent;
		border: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.16);
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
	}

	.weather-banner-btn:hover:not(:disabled),
	.weather-banner-close:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.weather-banner-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	/* Mobile view */
	@media (max-width: 768px) {
		.weather-banner {
			top: 36px;
		}

		/* Short like the TV graphic: "SC", or just the flag */
		.flag-full {
			display: none;
		}

		.flag-short {
			display: inline;
		}

		.swiper-slide {
			padding: 44px 16px 96px;
		}

		.nav-side {
			display: none;
		}

		.race-progress {
			--car-width: 44px;
		}

		.racecar-marker {
			top: -16px;
			height: 52px;
		}

		.nav-bottom {
			display: flex;
		}
	}
</style>

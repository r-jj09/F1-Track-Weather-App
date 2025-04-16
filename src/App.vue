<script setup>
	import { ref, onMounted } from "vue";
	import { Swiper, SwiperSlide } from "swiper/vue";
	import "swiper/css";
	import "swiper/css/pagination";
	import "swiper/css/navigation";
	import tracks from "@/data/tracks.json";
	import TrackWeather from "./components/TrackWeather.vue";

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const nextRaceIndex = tracks.findIndex((track) => {
		const raceDate = new Date(track.date);
		const raceDay = new Date(
			raceDate.getFullYear(),
			raceDate.getMonth(),
			raceDate.getDate()
		);
		return raceDay >= today;
	});

	const tracksWithLabel = tracks.map((track, index) => ({
		...track,
		isNext: index === nextRaceIndex,
	}));

	const trackIndex = ref(nextRaceIndex !== -1 ? nextRaceIndex : 0);
	const weatherData = ref({}); // Store weather data for all tracks
	const isLoading = ref(true); // Loading state

	// Fetch weather data for all tracks
	const fetchAllWeatherData = async () => {
		try {
			const promises = tracks.map(async (track) => {
				const { lat, long } = track.location;
				const res = await fetch(
					`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,alerts&appid=${
						import.meta.env.VITE_WEATHER_API_KEY
					}&units=metric`
				);
				const data = await res.json();
				return { trackId: track.id, weather: data };
			});

			// Resolve all promises and store the data
			const results = await Promise.all(promises);
			results.forEach(({ trackId, weather }) => {
				weatherData.value[trackId] = weather;
			});
		} catch (err) {
			console.error("❌ Failed to fetch weather data:", err);
		} finally {
			isLoading.value = false;
		}
	};

	onMounted(() => {
		fetchAllWeatherData();
	});

	// Handle slide change
	const onSlideChange = (swiper) => {
		trackIndex.value = swiper.activeIndex;
	};
</script>

<template>
	<div v-if="isLoading" class="loading-container">
		<p>Loading weather data for all tracks...</p>
	</div>
	<div v-else>
		<Swiper
			:slides-per-view="1"
			:initial-slide="nextRaceIndex"
			:space-between="0"
			@slideChange="onSlideChange"
			class="full-screen-swiper"
			:grab-cursor="true"
		>
			<SwiperSlide v-for="(track, index) in tracksWithLabel" :key="index">
				<TrackWeather :track="track" :weather="weatherData[track.id]" />
			</SwiperSlide>
		</Swiper>
	</div>
</template>

<style scoped>
	.full-screen-swiper {
		width: 100%;
		height: 100vh;
	}

	.swiper-slide {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f0f0f0;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 1.5rem;
		color: #333;
	}
</style>

<script setup>
	import { ref, onMounted, computed, watch } from "vue";
	import { Swiper, SwiperSlide } from "swiper/vue";
	import "swiper/css";
	import "swiper/css/pagination";
	import "swiper/css/navigation";
	import tracks from "@/data/tracks.json"; // Track data
	import TrackWeather from "./components/TrackWeather.vue";

	//Get the current date and time (with hours and minutes)
	const now = new Date();

	//Use 'now' to get the current date (without hours and minutes)
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	//Based on the 'tracks' array's 'date' and 'today' identify witch race is next and index it
	const nextRaceIndex = tracks.findIndex((track) => {
		const raceDate = new Date(track.date);
		const raceDay = new Date(
			raceDate.getFullYear(),
			raceDate.getMonth(),
			raceDate.getDate()
		);
		return raceDay >= today;
	});

	// Maps through the tracks and adds an 'isNext' property to each track object.
	// The 'isNext' property is true for the track that corresponds to the next race (based on the nextRaceIndex).
	// This property is used in the template to visually indicate the next race.
	const tracksWithNextIndicator = tracks.map((track, index) => ({
		...track,
		isNext: index === nextRaceIndex,
	}));

	//Okay this one gives back a array with all the races with all the data (circuitName, date, location, etc.) AND with the isNext boolean property.
	// console.log(tracksWithNextIndicator);
	// console.log(track.raceName, track.location);

	const weatherData = ref({});

	const fetchAllWeather = async () => {
		const results = {};

		for (const track of tracksWithNextIndicator) {
			const { lat, long } = track.location;

			try {
				const res = await fetch(
					`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${long}&exclude=minutely,hourly,alerts&appid=${
						import.meta.env.VITE_WEATHER_API_KEY
					}&units=metric`
				);
				const data = await res.json();

				// Use race name or create a slug for better readability
				const key = track.raceName.toLowerCase().replace(/\s+/g, "-");
				results[key] = data;
			} catch (error) {
				console.error(`Failed to fetch weather for ${track.raceName}:`, error);
			}
		}

		weatherData.value = results;
	};

	const createWeatherKey = (raceName) =>
		raceName.toLowerCase().replace(/\s+/g, "-");

	const TrackData = computed(() => {
		return tracksWithNextIndicator.map((track) => {
			const key = createWeatherKey(track.raceName);
			return {
				...track,
				weather: weatherData.value[key] || null,
			};
		});
	});

	console.log("TrackData: ", TrackData.value);

	//Keeps trackIndex in sync with the Swiper component.
	const trackIndex = ref(nextRaceIndex !== -1 ? nextRaceIndex : 0);

	const onSlideChange = (swiper) => {
		trackIndex.value = swiper.realIndex;
	};

	onMounted(() => {
		fetchAllWeather();
	});
</script>

<template>
	<Swiper
		:slides-per-view="1"
		:initial-slide="nextRaceIndex"
		:space-between="0"
		:grab-cursor="true"
		@slideChange="onSlideChange"
		class="full-screen-swiper"
	>
		<SwiperSlide v-for="(track, index) in tracksWithNextIndicator" :key="index">
			<TrackWeather />
		</SwiperSlide>
	</Swiper>
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
</style>

<!-- ! Fix the repeat of API calls. Move the API request to App.vue and go through all the 24 tracks once. Then pass that to the TrackWeather.vue to make the Swiper with said data. No repeat of the API call and no running out of the daily limit... Hopefully-->

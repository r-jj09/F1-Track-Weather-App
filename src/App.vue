<script setup>
	import { ref, computed } from "vue";
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
	const selectedTrack = computed(() => tracksWithLabel[trackIndex.value]);

	const dataLoaded = ref(false);

	const onSlideChange = (swiper) => {
		trackIndex.value = swiper.activeIndex;
	};
</script>

<template>
	<Swiper
		:slides-per-view="1"
		:initial-slide="nextRaceIndex"
		:space-between="0"
		:grab-cursor="true"
		class="full-screen-swiper"
		@slideChange="onSlideChange"
	>
		<SwiperSlide v-if="!dataLoaded">
			<TrackWeather
				:track="tracksWithLabel[nextRaceIndex]"
				@data-loaded="dataLoaded = true"
			/>
		</SwiperSlide>

		<template v-else>
			<SwiperSlide v-for="(track, index) in tracksWithLabel" :key="index">
				<TrackWeather :track="track" />
			</SwiperSlide>
		</template>
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

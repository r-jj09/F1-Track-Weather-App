<script setup>
	import { ref } from "vue";
	import { Swiper, SwiperSlide } from "swiper/vue";
	import "swiper/css";
	import "swiper/css/bundle";
	import tracks from "@/data/tracks.json";

	import TrackWeather from "./components/TrackWeather.vue";

	const now = new Date();
	const nextRaceIndex = tracks.findIndex((track) => new Date(track.date) > now);
</script>

<template>
	<Swiper
		:slides-per-view="1"
		:initial-slide="nextRaceIndex"
		:space-between="0"
		@slideChange="onSlideChange"
		class="full-screen-swiper"
		grab-cursor="true"
	>
		<SwiperSlide v-for="(track, index) in tracks" :key="index">
			<TrackWeather :track="track" />
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
		background-color: #f0f0f0; /* Light background for better visibility */
	}
</style>

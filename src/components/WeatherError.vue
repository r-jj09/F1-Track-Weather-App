<script setup>
	import { computed } from "vue";

	const props = defineProps({
		kind: String, // quota | auth | server | timeout | network
		failed: Number,
		total: Number,
		retrying: Boolean,
	});

	defineEmits(["retry", "continue"]);

	// OpenWeather's daily call count resets at 00:00 UTC
	const resetTime = (() => {
		const now = new Date();
		const midnightUtc = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
		);
		return midnightUtc.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	})();

	const COPY = {
		quota: {
			icon: "fa-gas-pump",
			title: "Out of fuel",
			text: `We've used up today's weather data allowance. It resets at midnight UTC (${resetTime} your time).`,
		},
		timeout: {
			icon: "fa-tower-broadcast",
			title: "No radio contact",
			text: "The weather service didn't answer in time. Check your connection and try again.",
		},
		network: {
			icon: "fa-tower-broadcast",
			title: "No radio contact",
			text: "We couldn't reach the weather service. Check your connection and try again.",
		},
		auth: {
			icon: "fa-id-badge",
			title: "Paddock pass rejected",
			text: "The weather service didn't accept our API key, so there's no weather data right now.",
		},
		server: {
			icon: "fa-screwdriver-wrench",
			title: "Session suspended",
			text: "The weather service is having problems. Try again in a few minutes.",
		},
	};

	const copy = computed(() => COPY[props.kind] ?? COPY.server);
</script>

<template>
	<div class="weather-error" role="alert">
		<div class="panel">
			<div class="label kicker">
				<span class="flag"><i class="fa-solid fa-flag"></i>RED FLAG</span>
				<span>WEATHER {{ failed }}/{{ total }} UNAVAILABLE</span>
			</div>

			<div class="title-row">
				<i class="fa-solid" :class="copy.icon"></i>
				<h2>{{ copy.title }}</h2>
			</div>
			<p class="label text">{{ copy.text }}</p>

			<div class="actions">
				<button class="label btn primary" :disabled="retrying" @click="$emit('retry')">
					<i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': retrying }"></i>
					{{ retrying ? "RETRYING…" : "TRY AGAIN" }}
				</button>
				<button class="label btn" :disabled="retrying" @click="$emit('continue')">
					SHOW RACES WITHOUT WEATHER
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
	.weather-error {
		position: fixed;
		inset: 0;
		z-index: 11;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		box-sizing: border-box;
		background: #000 url("/F1_track_weather_app_background.webp") center / cover no-repeat;
	}

	.weather-error::before {
		content: "";
		position: absolute;
		inset: 0;
		background: rgba(5, 5, 15, 0.75);
		backdrop-filter: blur(4px);
	}

	.panel {
		position: relative;
		width: 100%;
		max-width: 520px;
		box-sizing: border-box;
		background: var(--panel-bg);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-top: 6px solid #e5262b;
		padding: clamp(20px, 4vw, 36px);
		display: flex;
		flex-direction: column;
		gap: 18px;
		color: #fff;
	}

	.kicker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 14px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.flag {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: #e5262b;
		color: #fff;
		font-weight: 700;
		transform: skewX(-12deg);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.title-row i {
		font-size: 28px;
		color: #e5262b;
	}

	h2 {
		margin: 0;
		font-size: clamp(28px, 5vw, 40px);
		line-height: 1;
		font-style: italic;
		font-weight: 700;
		text-transform: uppercase;
	}

	.text {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		letter-spacing: normal;
		color: rgba(255, 255, 255, 0.82);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	.btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		font-size: 12px;
		font-weight: 700;
		color: #fff;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.28);
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.btn:hover:not(:disabled) {
		border-color: #fff;
	}

	/* Lightened team color: plain Red Bull navy or Cadillac grey disappears on the dark panel */
	.btn.primary {
		background: var(--team-glow);
		color: var(--team-glow-ink);
		border-color: var(--team-glow);
	}

	.btn.primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>

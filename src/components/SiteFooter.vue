<script setup>
	import { ref } from "vue";

	const dialog = ref(null);
	const year = new Date().getFullYear();
</script>

<!-- SiteFooter.vue: fan-project disclaimer + data credits, always visible -->
<template>
	<footer class="label site-footer">
		<span class="long">Unofficial fan project, not associated with the Formula 1 companies</span>
		<span class="short">Unofficial fan project</span>
		<span aria-hidden="true">·</span>
		<span>
			Weather data by
			<a href="https://openweathermap.org/" target="_blank" rel="noopener">OpenWeather</a>
		</span>
		<span aria-hidden="true">·</span>
		<button type="button" @click="dialog.showModal()">Legal &amp; credits</button>
	</footer>

	<dialog ref="dialog" class="legal" aria-labelledby="legal-title" @click.self="dialog.close()">
		<div class="legal-panel">
			<div class="label legal-kicker">
				<span>LEGAL &amp; CREDITS</span>
				<button type="button" class="legal-close" aria-label="Close" @click="dialog.close()">
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>

			<h2 id="legal-title">Unofficial fan project</h2>
			<p class="label">
				This website is unofficial and is not associated in any way with the Formula 1 companies.
				F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks
				are trade marks of Formula One Licensing B.V.
			</p>
			<p class="label">
				Team colors are used for decoration only and don't imply any affiliation with the teams.
			</p>

			<h3 class="label">CREDITS</h3>
			<ul class="label">
				<li>
					Weather, forecasts and alerts:
					<a href="https://openweathermap.org/" target="_blank" rel="noopener">OpenWeather</a>
				</li>
				<li>
					Race calendar and circuits:
					<a href="https://jolpi.ca/" target="_blank" rel="noopener">Jolpica F1 API</a>
				</li>
				<li>
					Alert translations:
					<a href="https://mymemory.translated.net/" target="_blank" rel="noopener">MyMemory</a>
				</li>
				<li>
					Fonts: Titillium Web and JetBrains Mono (SIL Open Font License) via
					<a href="https://fonts.google.com/" target="_blank" rel="noopener">Google Fonts</a>
				</li>
				<li>
					Icons:
					<a href="https://fontawesome.com/" target="_blank" rel="noopener">Font Awesome</a> Free
				</li>
			</ul>

			<p class="label legal-small">© {{ year }} F1 Track Weather · Made by a fan, for fans 🏁</p>
		</div>
	</dialog>
</template>

<style scoped>
	.site-footer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10000; /* above the error screen and the off-season overlay */
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 2px 8px;
		padding: 4px 12px 6px;
		font-size: 10px;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.55);
		text-align: center;
		pointer-events: none;
	}

	.site-footer a,
	.site-footer button {
		pointer-events: auto;
		color: rgba(255, 255, 255, 0.8);
	}

	.site-footer button {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.site-footer a:hover,
	.site-footer button:hover {
		color: #fff;
	}

	.short {
		display: none;
	}

	/* Legal dialog */
	.legal {
		width: min(560px, calc(100% - 32px));
		max-height: calc(100dvh - 48px);
		padding: 0;
		border: 0;
		background: transparent;
		color: #fff;
	}

	.legal::backdrop {
		background: rgba(5, 5, 15, 0.75);
		backdrop-filter: blur(4px);
	}

	.legal-panel {
		background: var(--panel-bg);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-top: 6px solid var(--team-color);
		padding: clamp(20px, 4vw, 32px);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.legal-kicker {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.legal-close {
		width: 32px;
		height: 32px;
		border: 1px solid rgba(255, 255, 255, 0.28);
		background: transparent;
		color: #fff;
		cursor: pointer;
	}

	.legal h2 {
		margin: 0;
		font-size: 28px;
		line-height: 1.1;
		font-style: italic;
		font-weight: 700;
		text-transform: uppercase;
	}

	.legal h3 {
		margin: 6px 0 0;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}

	.legal p,
	.legal ul {
		margin: 0;
		font-size: 12px;
		line-height: 1.7;
		letter-spacing: normal;
		color: rgba(255, 255, 255, 0.82);
	}

	.legal ul {
		padding-left: 18px;
	}

	.legal a {
		color: var(--team-text);
	}

	.legal-small {
		font-size: 11px !important;
		color: rgba(255, 255, 255, 0.5) !important;
	}

	@media (max-width: 768px) {
		.long {
			display: none;
		}

		.short {
			display: inline;
		}
	}
</style>

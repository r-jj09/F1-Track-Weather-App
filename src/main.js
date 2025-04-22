import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./loader.css";

import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
	faCloud,
	faSun,
	faCloudRain,
	faBolt,
	faSnowflake,
	faSmog,
} from "@fortawesome/free-solid-svg-icons";

library.add(faCloud, faSun, faCloudRain, faBolt, faSnowflake, faSmog);

const favicon = document.getElementById("favicon");

function updateFavicon() {
	if (!favicon) {
		console.warn("Favicon element not found!");
		return;
	}

	const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	console.log("Dark mode detected:", isDark); // Debug log
	favicon.href = isDark
		? `/favicon_inverted.png?${new Date().getTime()}`
		: `/favicon.png?${new Date().getTime()}`;
	console.log("Favicon updated to:", favicon.href); // Debug log
}

// Initial check
updateFavicon();

// Debounced listener for color scheme changes
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const onChange = () => updateFavicon();
mediaQuery.addEventListener("change", onChange);

// Optional: Cleanup listener when needed (e.g., in a SPA)
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		mediaQuery.removeEventListener("change", onChange);
	});
}

const app = createApp(App);
app.component("font-awesome-icon", FontAwesomeIcon);
app.mount("#app");

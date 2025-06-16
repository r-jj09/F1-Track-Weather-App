import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./loader.css";

const favicon = document.getElementById("favicon");

function updateFavicon() {
	if (!favicon) {
		console.warn("Favicon element not found!");
		return;
	}

	const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	// console.log("Dark mode detected:", isDark);
	favicon.href = isDark
		? `/favicon_inverted.png?${new Date().getTime()}`
		: `/favicon.png?${new Date().getTime()}`;
	// console.log("Favicon updated to:", favicon.href);
}

updateFavicon();

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const onChange = () => updateFavicon();
mediaQuery.addEventListener("change", onChange);

if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		mediaQuery.removeEventListener("change", onChange);
	});
}

const app = createApp(App);
app.mount("#app");

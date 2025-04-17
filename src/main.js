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

const app = createApp(App);
app.component("font-awesome-icon", FontAwesomeIcon);
app.mount("#app");

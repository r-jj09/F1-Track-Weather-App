// Weather alerts from OpenWeather One Call 3.0.
// Agencies publish in their own language (`lang` doesn't translate alerts), so:
//  - titles go through a glossary first (machine translation is bad at one-word titles: "Tempestade" → "Storm damage")
//  - anything else is translated with MyMemory, lazily, cached in localStorage

// ---------- Language ----------

// Main alert language of the national agency at each venue
const COUNTRY_LANG = {
	Brazil: "pt",
	Mexico: "es",
	Spain: "es",
	Italy: "it",
	Japan: "ja",
	China: "zh",
	Netherlands: "nl",
	Monaco: "fr",
	Austria: "de",
	Hungary: "hu",
	Azerbaijan: "az",
	"Saudi Arabia": "ar",
	Qatar: "ar",
	UAE: "ar",
	Bahrain: "ar",
};

export const LANG_NAMES = {
	pt: "Portuguese",
	es: "Spanish",
	it: "Italian",
	ja: "Japanese",
	zh: "Chinese",
	nl: "Dutch",
	fr: "French",
	de: "German",
	hu: "Hungarian",
	az: "Azerbaijani",
	ar: "Arabic",
};

export const langForCountry = (country) => COUNTRY_LANG[country] ?? "autodetect";

const asciiRatio = (text = "") =>
	text.length ? text.replace(/[^\x20-\x7E\n]/g, "").length / text.length : 0;

const ENGLISH_TITLE = /\b(warning|watch|advisory|alert|statement|outlook|of|for)\b/i;
const ENGLISH_TEXT = /\b(the|and|of|with|in|is|are|may|be|to)\b/gi;

export function looksEnglish(text = "", isTitle = false) {
	if (asciiRatio(text) < 0.97) return false;
	if (isTitle) return ENGLISH_TITLE.test(text);
	return (text.match(ENGLISH_TEXT) || []).length >= 2;
}

// ---------- Glossary for titles ----------

const normalize = (text = "") =>
	text
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

const GLOSSARY = {
	// Brazil — INMET
	"tempestade": "Storm",
	"tempestade tropical": "Tropical storm",
	"chuvas intensas": "Heavy rain",
	"acumulado de chuva": "Accumulated rainfall",
	"vendaval": "Gale",
	"ventos costeiros": "Coastal winds",
	"baixa umidade": "Low humidity",
	"onda de calor": "Heat wave",
	"onda de frio": "Cold wave",
	"declinio de temperatura": "Temperature drop",
	"geada": "Frost",
	"granizo": "Hail",
	"nevoeiro": "Fog",
	"ressaca": "High surf",
	"ciclone": "Cyclone",
	"ciclone extratropical": "Extratropical cyclone",
	// Mexico — SMN / Spain — AEMET
	"tormentas": "Thunderstorms",
	"tormenta electrica": "Thunderstorm",
	"tormenta tropical": "Tropical storm",
	"lluvias": "Rain",
	"lluvias intensas": "Heavy rain",
	"lluvias fuertes": "Heavy rain",
	"vientos fuertes": "Strong winds",
	"viento": "Wind",
	"ola de calor": "Heat wave",
	"temperaturas maximas": "High temperatures",
	"niebla": "Fog",
	"nevadas": "Snow",
	"huracan": "Hurricane",
	"ciclon tropical": "Tropical cyclone",
	"fenomenos costeros": "Coastal hazards",
	// Japan — JMA
	"大雨注意報": "Heavy rain advisory",
	"大雨警報": "Heavy rain warning",
	"大雨特別警報": "Heavy rain emergency warning",
	"雷注意報": "Thunderstorm advisory",
	"強風注意報": "Strong wind advisory",
	"暴風警報": "Storm warning",
	"洪水注意報": "Flood advisory",
	"洪水警報": "Flood warning",
	"濃霧注意報": "Dense fog advisory",
	"波浪注意報": "High wave advisory",
	"波浪警報": "High wave warning",
	"高潮注意報": "Storm surge advisory",
	"乾燥注意報": "Dry air advisory",
};

export const glossaryTitle = (event) => GLOSSARY[normalize(event)] ?? null;

// ---------- Severity → flag ----------

const FLAGS = {
	red: { level: 3, name: "RED FLAG", color: "#E5262B", ink: "#ffffff" },
	orange: { level: 2, name: "ORANGE FLAG", color: "#FF8A1F", ink: "#111111" },
	yellow: { level: 1, name: "YELLOW FLAG", color: "#FFD60A", ink: "#111111" },
};

// Color words and severity terms in the title, in the languages used at F1 venues
const RED = /\bred\b|extreme|severe|danger|emergency|vermelh|\broj[oa]\b|rosso|rouge|\brot\b|piros|特別警報|红色/i;
const ORANGE = /orange|amber|laranja|naranja|arancione|narancs|橙色|警報/i;
const YELLOW = /yellow|amarel|amarill|giallo|jaune|gelb|s[aá]rga|注意報|黄色|蓝色/i;

export function flagFor(event = "", description = "") {
	if (RED.test(event)) return FLAGS.red;
	if (ORANGE.test(event)) return FLAGS.orange;
	if (YELLOW.test(event)) return FLAGS.yellow;

	// INMET only puts the level in the description: "Baixo risco" / "Risco de" / "Grande risco"
	if (/grande (risco|perigo)/i.test(description)) return FLAGS.red;
	if (/baixo risco/i.test(description)) return FLAGS.yellow;
	if (/\brisco de\b/i.test(description)) return FLAGS.orange;

	return FLAGS.yellow;
}

// ---------- Clean up + merge ----------

// 1. drop expired alerts
// 2. same alert sent in several languages (same sender + times, different title) → keep the most English one
// 3. same sender + title on consecutive days → one flag with the worst severity and every day's details
export function buildAlerts(list, nowSeconds = Date.now() / 1000) {
	if (!Array.isArray(list)) return [];

	const active = list.filter((alert) => !alert.end || alert.end >= nowSeconds);

	const byTime = new Map();
	for (const alert of active) {
		const key = `${alert.sender_name}|${alert.start}|${alert.end}`;
		if (!byTime.has(key)) byTime.set(key, []);
		byTime.get(key).push(alert);
	}

	const deduped = [];
	for (const group of byTime.values()) {
		const titles = new Set(group.map((alert) => alert.event));
		if (titles.size === 1) {
			deduped.push(...group);
			continue;
		}
		const english = group.find((alert) => looksEnglish(alert.event, true));
		deduped.push(english ?? group[0]);
	}

	const merged = new Map();
	for (const alert of deduped.sort((a, b) => a.start - b.start)) {
		const key = `${alert.sender_name}|${alert.event}`;
		const part = {
			start: alert.start,
			end: alert.end,
			description: alert.description ?? "",
			flag: flagFor(alert.event, alert.description),
		};

		const existing = merged.get(key);
		if (!existing) {
			merged.set(key, {
				key,
				sender: alert.sender_name,
				event: alert.event,
				start: alert.start,
				end: alert.end,
				flag: part.flag,
				parts: [part],
			});
			continue;
		}

		existing.parts.push(part);
		existing.start = Math.min(existing.start, alert.start);
		existing.end = Math.max(existing.end, alert.end);
		if (part.flag.level > existing.flag.level) existing.flag = part.flag;
	}

	// Worst flags first
	return [...merged.values()].sort((a, b) => b.flag.level - a.flag.level || a.start - b.start);
}

// ---------- Translation (MyMemory) ----------

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MAX_BYTES = 450; // MyMemory rejects queries over 500 bytes
const CACHE_PREFIX = "alert-tx:";
const pending = new Map();

const byteLength = (text) => new TextEncoder().encode(text).length;

function hash(text) {
	let h = 5381;
	for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	return (h >>> 0).toString(36);
}

// Split on sentences so each request stays under the byte limit
function chunk(text) {
	const sentences = text.match(/[^.!?。\n]+[.!?。]*\s*|\n+/g) ?? [text];
	const chunks = [];
	let current = "";
	for (const sentence of sentences) {
		if (current && byteLength(current + sentence) > MAX_BYTES) {
			chunks.push(current);
			current = "";
		}
		current += sentence;
	}
	if (current.trim()) chunks.push(current);
	return chunks;
}

async function requestTranslation(text, lang) {
	const parts = [];
	for (const piece of chunk(text)) {
		if (!piece.trim()) {
			parts.push(piece);
			continue;
		}
		const params = new URLSearchParams({ q: piece.trim(), langpair: `${lang}|en` });
		const res = await fetch(`${MYMEMORY_URL}?${params}`);
		if (!res.ok) return null;

		const data = await res.json();
		const translated = data?.responseData?.translatedText;
		// Out of quota comes back as a "MYMEMORY WARNING" string instead of an error
		if (data?.responseStatus !== 200 || !translated || /MYMEMORY WARNING/i.test(translated)) {
			return null;
		}
		parts.push(translated + (/\s$/.test(piece) ? " " : ""));
	}
	return parts.join("").trim();
}

// Resolves to the English text, or null if it couldn't be translated
export function translate(text, lang = "autodetect", isTitle = false) {
	if (!text || looksEnglish(text, isTitle)) return Promise.resolve(text);

	const cacheKey = `${CACHE_PREFIX}${lang}:${hash(text)}`;
	const cached = localStorage.getItem(cacheKey);
	if (cached) return Promise.resolve(cached);

	if (!pending.has(cacheKey)) {
		const job = requestTranslation(text, lang)
			.catch(() => null)
			.then((translated) => {
				if (translated) localStorage.setItem(cacheKey, translated);
				pending.delete(cacheKey);
				return translated;
			});
		pending.set(cacheKey, job);
	}
	return pending.get(cacheKey);
}

// Shared weather cache for all visitors.
// OpenWeather's free tier is ~1000 calls/day and every page load used to cost one call per track,
// so the server fetches each track on its own schedule and every visitor reads the same snapshot.
//
// Snapshot (one JSON value in the store):
// {
//   races:  { fetchedAt, list },
//   tracks: { [trackKey]: { fetchedAt, hourly, data } },
//   geo:    { [trackKey]: { lat, lon } },     // geocoded fallback coords
//   error:  { kind, at } | null,              // last refresh problem
//   blockedUntil: unix seconds                // don't call OpenWeather before this (quota, bad key…)
// }
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tracksBackup = require("../../src/data/tracks.json");

const CACHE_KEY = "weather:v1";
const LOCK_KEY = "weather:v1:lock";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

// How long a track's weather stays fresh. ~240 OpenWeather calls/day in total.
const TTL = {
	live: 30 * MINUTE, // race starts within 48h (hourly lights-out forecast)
	next: 1 * HOUR, // next race on the calendar
	other: 3 * HOUR, // everything else
};
const RACES_TTL = 6 * HOUR;
const LOCK_SECONDS = 120;
const REQUEST_TIMEOUT_MS = 10_000;
const PARALLEL_REQUESTS = 4;

// After a failed refresh, wait before calling OpenWeather again
const BACKOFF = {
	auth: 10 * MINUTE,
	server: 2 * MINUTE,
	timeout: 2 * MINUTE,
	network: 2 * MINUTE,
};

export const trackKey = (track) => track.raceName.toLowerCase().replace(/\s+/g, "-");

// Race API: date + time in UTC ("20:00:00Z"); the backup JSON has no time
export function raceStartUnix(track) {
	if (!track?.date || !track?.time) return null;
	const ms = Date.parse(`${track.date}T${track.time}`);
	return Number.isNaN(ms) ? null : ms / 1000;
}

// `hourly` only covers 48h, only worth its payload for a race starting inside that window
export function needsHourly(track, now) {
	const start = raceStartUnix(track);
	if (!start) return false;
	return start - now <= 48 * HOUR && now <= start + 3 * HOUR;
}

// OpenWeather's daily call count resets at 00:00 UTC
function nextUtcMidnight(now) {
	const d = new Date(now * 1000);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) / 1000;
}

const errorKind = (status) =>
	status === 401 ? "auth" : status === 429 ? "quota" : "server";

function isValidCoord(n, min, max) {
	return Number.isFinite(n) && n >= min && n <= max;
}

// ---------- Stores ----------

// Per server instance only: fine for `npm run dev` and as a fallback without Redis
export function createMemoryStore() {
	const values = new Map();
	const locks = new Map();
	return {
		shared: false,
		async get(key) {
			return values.get(key) ?? null;
		},
		async set(key, value) {
			values.set(key, value);
		},
		async lock(key, seconds) {
			const now = Date.now();
			if ((locks.get(key) ?? 0) > now) return false;
			locks.set(key, now + seconds * 1000);
			return true;
		},
		async unlock(key) {
			locks.delete(key);
		},
	};
}

// Upstash Redis (Vercel Marketplace). Reads UPSTASH_REDIS_REST_* or KV_REST_API_* env vars.
export async function createRedisStore() {
	const { Redis } = await import("@upstash/redis");
	const redis = Redis.fromEnv();
	return {
		shared: true,
		get: (key) => redis.get(key),
		set: (key, value) => redis.set(key, value),
		lock: async (key, seconds) =>
			(await redis.set(key, "1", { nx: true, ex: seconds })) === "OK",
		unlock: (key) => redis.del(key),
	};
}

export async function createStoreFromEnv(env) {
	const hasRedis =
		(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) &&
		(env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN);
	return hasRedis ? createRedisStore() : createMemoryStore();
}

// ---------- Service ----------

export function createWeatherService({
	store,
	apiKey,
	fetch: fetchImpl = globalThis.fetch,
	now: clock = () => Date.now() / 1000,
	log = console,
}) {
	async function fetchWithTimeout(url) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			return await fetchImpl(url, { signal: controller.signal });
		} finally {
			clearTimeout(timer);
		}
	}

	async function loadRaces(snapshot, now) {
		if (snapshot.races && now - snapshot.races.fetchedAt < RACES_TTL) {
			return snapshot.races.list;
		}
		const year = new Date(now * 1000).getUTCFullYear();
		try {
			const res = await fetchWithTimeout(`https://api.jolpi.ca/ergast/f1/${year}/races.json`);
			if (res.ok) {
				const races = (await res.json())?.MRData?.RaceTable?.Races;
				if (Array.isArray(races) && races.length) {
					snapshot.races = { fetchedAt: now, list: races };
					return races;
				}
			}
		} catch {
			// fall through to the backup / last known list
		}
		return snapshot.races?.list ?? tracksBackup;
	}

	async function coordsFor(track, snapshot) {
		const loc = track.Circuit?.Location;
		const lat = Number.parseFloat(loc?.lat);
		const lon = Number.parseFloat(loc?.long);
		if (isValidCoord(lat, -90, 90) && isValidCoord(lon, -180, 180)) return { lat, lon };

		const key = trackKey(track);
		if (snapshot.geo?.[key]) return snapshot.geo[key];
		if (!loc?.locality || !loc?.country) return null;

		const res = await fetchWithTimeout(
			`https://api.openweathermap.org/geo/1.0/direct` +
				`?q=${encodeURIComponent(`${loc.locality},${loc.country}`)}&limit=1&appid=${apiKey}`
		);
		if (!res.ok) return null;
		const data = await res.json();
		if (!Array.isArray(data) || !data.length) return null;

		snapshot.geo = { ...snapshot.geo, [key]: { lat: data[0].lat, lon: data[0].lon } };
		return snapshot.geo[key];
	}

	function ttlFor(track, now, nextKey) {
		if (needsHourly(track, now)) return TTL.live;
		if (trackKey(track) === nextKey) return TTL.next;
		return TTL.other;
	}

	function isStale(track, snapshot, now, nextKey) {
		const entry = snapshot.tracks?.[trackKey(track)];
		if (!entry) return true;
		if (needsHourly(track, now) && !entry.hourly) return true;
		return now - entry.fetchedAt >= ttlFor(track, now, nextKey);
	}

	const nextRaceKey = (races, now) => {
		const next = races.find((race) => (raceStartUnix(race) ?? Date.parse(race.date) / 1000) >= now);
		return next ? trackKey(next) : null;
	};

	// Fetch every stale track. Mutates and returns the snapshot.
	async function refresh(snapshot, now, { races: overrideRaces } = {}) {
		snapshot.tracks ??= {};
		const races = overrideRaces ?? (await loadRaces(snapshot, now));

		if (!apiKey) {
			snapshot.error = { kind: "auth", at: now };
			return snapshot;
		}
		if ((snapshot.blockedUntil ?? 0) > now) return snapshot;

		const nextKey = nextRaceKey(races, now);
		const queue = races.filter((race) => isStale(race, snapshot, now, nextKey));
		if (!queue.length) return snapshot;

		let stopKind = null;
		let lastKind = null;
		let connectionFailures = 0;
		let fetched = 0;

		async function worker() {
			while (queue.length && !stopKind) {
				const track = queue.shift();
				const key = trackKey(track);
				const hourly = needsHourly(track, now);
				try {
					const coords = await coordsFor(track, snapshot);
					if (!coords) continue;

					const res = await fetchWithTimeout(
						`https://api.openweathermap.org/data/3.0/onecall` +
							`?lat=${coords.lat}&lon=${coords.lon}` +
							`&exclude=${hourly ? "minutely" : "minutely,hourly"}` +
							`&units=metric&appid=${apiKey}`
					);
					if (!res.ok) {
						lastKind = errorKind(res.status);
						// Every other call would fail the same way
						if (lastKind === "quota" || lastKind === "auth") stopKind = lastKind;
						continue;
					}

					const data = await res.json();
					if (data?.current) {
						snapshot.tracks[key] = { fetchedAt: now, hourly, data };
						fetched++;
						connectionFailures = 0;
					}
				} catch (e) {
					lastKind = e.name === "AbortError" ? "timeout" : "network";
					if (++connectionFailures >= 2) stopKind = lastKind;
				}
			}
		}

		await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, worker));

		const kind = stopKind ?? lastKind;
		snapshot.error = kind ? { kind, at: now } : null;
		if (kind) {
			snapshot.blockedUntil = kind === "quota" ? nextUtcMidnight(now) : now + BACKOFF[kind];
			log.warn?.(`[weather] refresh: ${fetched} fetched, stopped on ${kind}`);
		} else {
			snapshot.blockedUntil = 0;
			log.info?.(`[weather] refresh: ${fetched} fetched`);
		}
		return snapshot;
	}

	// Refresh under a lock so concurrent visitors don't all hit OpenWeather
	async function refreshShared(now, knownRaces) {
		if (!(await store.lock(LOCK_KEY, LOCK_SECONDS))) return null;
		try {
			// Re-read: another instance may have refreshed while we waited
			const snapshot = (await store.get(CACHE_KEY)) ?? {};
			// Reuse the race list this request already loaded
			if (knownRaces && (!snapshot.races || snapshot.races.fetchedAt < knownRaces.fetchedAt)) {
				snapshot.races = knownRaces;
			}
			await refresh(snapshot, now);
			await store.set(CACHE_KEY, snapshot);
			return snapshot;
		} finally {
			await store.unlock(LOCK_KEY);
		}
	}

	// Poll the store while another instance holds the refresh lock
	async function waitForSnapshot(timeoutMs = 15_000) {
		const until = Date.now() + timeoutMs;
		while (Date.now() < until) {
			await new Promise((resolve) => setTimeout(resolve, 500));
			const snapshot = await store.get(CACHE_KEY);
			if (snapshot?.tracks && Object.keys(snapshot.tracks).length) return snapshot;
			if (snapshot?.error) return snapshot;
		}
		return null;
	}

	function toResponse(snapshot, races, now) {
		const weather = {};
		let missing = 0;
		for (const race of races) {
			const data = snapshot.tracks?.[trackKey(race)]?.data ?? null;
			weather[trackKey(race)] = data;
			if (!data) missing++;
		}
		const fetchedTimes = Object.values(snapshot.tracks ?? {}).map((entry) => entry.fetchedAt);
		return {
			weather,
			total: races.length,
			missing,
			error: snapshot.error?.kind ?? null,
			oldestFetchedAt: fetchedTimes.length ? Math.min(...fetchedTimes) : null,
			servedAt: now,
		};
	}

	return {
		/**
		 * @param {object} options
		 * @param {(p: Promise) => void} [options.background] keeps a promise alive after the response (Vercel waitUntil)
		 * @param {boolean} [options.mockLightsOut] dev only: next race starts in ~20h
		 */
		async getWeather({ background, mockLightsOut = false } = {}) {
			const now = clock();
			let snapshot = (await store.get(CACHE_KEY)) ?? {};
			let races = await loadRaces(snapshot, now);

			if (mockLightsOut) {
				const nextKey = nextRaceKey(races, now);
				const start = new Date((Math.ceil(now / HOUR) * HOUR + 20 * HOUR) * 1000);
				races = races.map((race) =>
					trackKey(race) === nextKey
						? { ...race, date: start.toISOString().slice(0, 10), time: start.toISOString().slice(11, 19) + "Z" }
						: race
				);
				await refresh(snapshot, now, { races });
				await store.set(CACHE_KEY, snapshot);
				return toResponse(snapshot, races, now);
			}

			const nextKey = nextRaceKey(races, now);
			const racesStale = !snapshot.races || now - snapshot.races.fetchedAt >= RACES_TTL;
			const anyStale =
				racesStale || races.some((race) => isStale(race, snapshot, now, nextKey));
			const hasData = races.some((race) => snapshot.tracks?.[trackKey(race)]);
			const blocked = (snapshot.blockedUntil ?? 0) > now;

			if (anyStale && !blocked) {
				if (hasData) {
					// Serve what we have right away, refresh for the next visitor
					const job = refreshShared(now, snapshot.races).catch((e) => log.error?.("[weather] refresh failed", e));
					background?.(job);
				} else {
					// Nothing cached yet: this visitor has to wait for the first fetch,
					// either our own or the one another visitor already started
					snapshot = (await refreshShared(now, snapshot.races)) ?? (await waitForSnapshot()) ?? snapshot;
				}
			}

			return toResponse(snapshot, races, now);
		},
	};
}

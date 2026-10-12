// Race dates from the API are plain "YYYY-MM-DD" strings in the track's local time.
// `new Date("YYYY-MM-DD")` parses them as UTC midnight, which shifts them a day back
// for anyone west of UTC — so compare date strings instead of Date objects.

const pad = (n) => String(n).padStart(2, "0");

// Today's date in the viewer's own time zone
export function todayLocal() {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Date at the track for a unix timestamp, using OpenWeather's timezone_offset (seconds)
export function trackDate(unixSeconds, offsetSeconds = 0) {
	return new Date((unixSeconds + offsetSeconds) * 1000).toISOString().slice(0, 10);
}

// Today's date at the track, falls back to the viewer's date without weather data
export function todayAtTrack(weather) {
	if (weather?.timezone_offset === undefined) return todayLocal();
	return trackDate(Math.floor(Date.now() / 1000), weather.timezone_offset);
}

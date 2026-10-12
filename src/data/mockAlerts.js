// Dev-only sample alerts, loaded with ?mockAlerts in `npm run dev` to preview the flag banners.
// Shapes follow OpenWeather One Call 3.0 `alerts`.
export function mockAlerts() {
	const now = Math.floor(Date.now() / 1000);
	const hours = (h) => now + h * 3600;

	return [
		{
			sender_name: "National Weather Service",
			event: "Severe Thunderstorm Warning",
			start: hours(-1),
			end: hours(3),
			description:
				"Severe thunderstorms capable of producing 60 mph wind gusts and quarter size hail.\nMove indoors and stay away from windows.",
		},
		{
			sender_name: "Met Office",
			event: "Amber warning of wind",
			start: hours(0),
			end: hours(18),
			description: "Strong winds may cause disruption to travel and outdoor events.",
		},
		{
			sender_name: "Met Office",
			event: "Yellow warning of rain",
			start: hours(2),
			end: hours(30),
			description: "Spells of heavy rain could lead to some flooding and spray on roads.",
		},
		// Same alert twice in two languages, should show once (English wins)
		{
			sender_name: "AEMET",
			event: "Aviso amarillo por tormentas",
			start: hours(1),
			end: hours(12),
			description: "Tormentas localmente fuertes.",
		},
		{
			sender_name: "AEMET",
			event: "Yellow thunderstorm warning",
			start: hours(1),
			end: hours(12),
			description: "Locally strong thunderstorms.",
		},
		// Brazil (INMET): Portuguese only, one alert per day, severity only in the description.
		// Should merge into one orange "Storm" flag, translated when opened
		{
			sender_name: "Instituto Nacional de Meteorologia",
			event: "Tempestade",
			start: hours(-2),
			end: hours(22),
			description:
				"INMET publica aviso iniciando em: 11/10/2026 00:00. Chuva entre 20 e 30 mm/h ou até 50 mm/dia, ventos intensos (40-60 km/h), e queda de granizo. Baixo risco de corte de energia elétrica, estragos em plantações, queda de galhos de árvores e de alagamentos.",
		},
		{
			sender_name: "Instituto Nacional de Meteorologia",
			event: "Tempestade",
			start: hours(22),
			end: hours(46),
			description:
				"INMET publica aviso iniciando em: 13/10/2026 00:00. Chuva entre 20 e 30 mm/h ou até 50 mm/dia, ventos intensos (40-60 km/h), e queda de granizo. Baixo risco de corte de energia elétrica, estragos em plantações, queda de galhos de árvores e de alagamentos.",
		},
		{
			sender_name: "Instituto Nacional de Meteorologia",
			event: "Tempestade",
			start: hours(22),
			end: hours(46),
			description:
				"INMET publica aviso iniciando em: 14/10/2026 00:00. Chuva entre 30 e 60 mm/h ou 50 e 100 mm/dia, ventos intensos (60-100 km/h), e queda de granizo. Risco de corte de energia elétrica, estragos em plantações,  queda de árvores e de alagamentos.",
		},
		// Already over, should be hidden
		{
			sender_name: "Met Office",
			event: "Yellow warning of fog",
			start: hours(-10),
			end: hours(-2),
			description: "This one has expired.",
		},
	];
}

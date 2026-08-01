/**
 * NYC weather check via the National Weather Service (free, no API key).
 * Gridpoint OKX/33,35 ≈ Manhattan. Fails soft: any error → "weather unknown",
 * which the planner treats as fine weather.
 */

const NWS_FORECAST_URL = "https://api.weather.gov/gridpoints/OKX/33,35/forecast";
const BAD_WEATHER_RE = /rain|showers|thunderstorm|snow|sleet|ice/i;

export interface WeatherCheck {
  badWeather: boolean;
  summary: string | null;
}

export async function checkNycWeather(): Promise<WeatherCheck> {
  try {
    const res = await fetch(NWS_FORECAST_URL, {
      headers: { "User-Agent": "nyc-insider-list (contact: site owner)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { badWeather: false, summary: null };
    const data = await res.json();
    const period = data?.properties?.periods?.[0];
    if (!period) return { badWeather: false, summary: null };
    const precip = period.probabilityOfPrecipitation?.value ?? 0;
    const badWeather = BAD_WEATHER_RE.test(period.shortForecast ?? "") && precip >= 40;
    return {
      badWeather,
      summary: `${period.shortForecast}, ${period.temperature}°${period.temperatureUnit}`,
    };
  } catch {
    return { badWeather: false, summary: null };
  }
}

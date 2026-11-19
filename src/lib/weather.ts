export type Units = "metric" | "imperial";

export interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

export interface DailyForecast {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
}

export interface CurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  humidity?: number;
  apparent?: number;
}

export interface ForecastData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  current_weather?: { temperature: number; windspeed: number; weathercode: number };
  daily: DailyForecast;
}

export const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm",
  96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
};

export function describe(code: number) {
  return WMO[code] ?? "Unknown";
}

export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export async function searchCities(city: string): Promise<GeoResult[]> {
  if (!city.trim()) return [];
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=6&language=en&format=json`
  );
  const d = await r.json();
  return (d.results ?? []).map((x: { latitude: number; longitude: number; name: string; country: string }) => ({
    latitude: x.latitude,
    longitude: x.longitude,
    name: x.name,
    country: x.country,
  }));
}

export async function geocode(city: string): Promise<GeoResult> {
  const res = await searchCities(city);
  if (!res.length) throw new Error("City not found");
  return res[0];
}

export async function getForecast(
  lat: number,
  lon: number,
  days: number,
  units: Units
): Promise<ForecastData> {
  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const precipUnit = units === "imperial" ? "inch" : "mm";
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
    forecast_days: String(days),
    timezone: "auto",
    temperature_unit: tempUnit,
    windspeed_unit: windUnit,
    precipitation_unit: precipUnit,
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) throw new Error("Forecast request failed");
  return r.json();
}

export function alertsFor(d: DailyForecast, units: Units) {
  const out: string[] = [];
  d.time.forEach((t, i) => {
    const precipThreshold = units === "imperial" ? 1.2 : 30;
    if (d.precipitation_sum[i] > precipThreshold) out.push(`${t}: Heavy precipitation`);
    const hotThreshold = units === "imperial" ? 95 : 35;
    if (d.temperature_2m_max[i] > hotThreshold) out.push(`${t}: Extreme heat`);
    const coldThreshold = units === "imperial" ? 14 : -10;
    if (d.temperature_2m_min[i] < coldThreshold) out.push(`${t}: Extreme cold`);
    const windThreshold = units === "imperial" ? 40 : 60;
    if (d.windspeed_10m_max[i] > windThreshold) out.push(`${t}: High winds`);
  });
  return out;
}
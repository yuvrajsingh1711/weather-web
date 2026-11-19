"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchCities,
  getForecast,
  describe,
  weatherIcon,
  alertsFor,
  type Units,
  type ForecastData,
  type GeoResult,
} from "@/lib/weather";

export default function WeatherDashboard() {
  const [city, setCity] = useState("London");
  const [days, setDays] = useState(7);
  const [units, setUnits] = useState<Units>("metric");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [data, setData] = useState<ForecastData | null>(null);

  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tSym = units === "imperial" ? "°F" : "°C";
  const wSym = units === "imperial" ? "mph" : "km/h";
  const pSym = units === "imperial" ? "in" : "mm";

  async function load(g: GeoResult, d = days, u = units) {
    setLoading(true);
    setError(null);
    try {
      const f = await getForecast(g.latitude, g.longitude, d, u);
      setGeo(g);
      setData(f);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchSelect(g: GeoResult) {
    setCity(g.name);
    setShowSug(false);
    setSuggestions([]);
    await load(g);
  }

  function onCityInput(v: string) {
    setCity(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await searchCities(v);
      setSuggestions(res);
      setShowSug(res.length > 0);
    }, 300);
  }

  useEffect(() => {
    (async () => {
      const res = await searchCities("London");
      if (res.length) await load(res[0]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = data?.current;
  const alerts = data ? alertsFor(data.daily, units) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
      <header className="px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2">
            <span>🌤️</span> Weather Forecast
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const u = units === "metric" ? "imperial" : "metric"; setUnits(u); if (geo) load(geo, days, u); }}
              className="px-3 py-1.5 rounded-lg bg-white/70 backdrop-blur shadow text-sm font-medium hover:bg-white"
            >
              {units === "metric" ? "°C / km/h" : "°F / mph"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={city}
                onChange={(e) => onCityInput(e.target.value)}
                onFocus={() => suggestions.length && setShowSug(true)}
                placeholder="Search city..."
              />
              {showSug && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleSearchSelect(s)}
                    >
                      {s.name}, <span className="text-gray-500">{s.country}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="number"
              min={1}
              max={16}
              className="w-24 border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <button
              onClick={() => geo && load(geo)}
              disabled={loading || !geo}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Update"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 text-red-800 px-4 py-3 rounded-xl">{error}</div>
        )}

        {loading && !data && (
          <div className="mt-6 text-center text-blue-700">Fetching weather…</div>
        )}

        {data && geo && cur && (
          <>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{geo.name}</h2>
                    <p className="text-blue-100">{geo.country}</p>
                  </div>
                  <span className="text-6xl">{weatherIcon(cur.weather_code)}</span>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-6xl font-bold">{cur.temperature_2m}{tSym}</span>
                  <span className="text-xl mb-2">{describe(cur.weather_code)}</span>
                </div>
                <p className="mt-1 text-blue-100">Feels like {cur.apparent_temperature}{tSym}</p>
                <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/15 rounded-xl p-3">
                    <div className="text-blue-100">Humidity</div>
                    <div className="font-semibold text-lg">{cur.relative_humidity_2m}%</div>
                  </div>
                  <div className="bg-white/15 rounded-xl p-3">
                    <div className="text-blue-100">Wind</div>
                    <div className="font-semibold text-lg">{cur.wind_speed_10m} {wSym}</div>
                  </div>
                  <div className="bg-white/15 rounded-xl p-3">
                    <div className="text-blue-100">Days</div>
                    <div className="font-semibold text-lg">{days}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3">Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No weather alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.map((a, i) => (
                      <li key={i} className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Daily Forecast</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.daily.time.map((t, i) => (
                  <div key={t} className="min-w-[110px] bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-xl p-3 text-center shrink-0">
                    <div className="text-xs text-gray-500">{t.slice(5)}</div>
                    <div className="text-3xl my-1">{weatherIcon(data.daily.weathercode[i])}</div>
                    <div className="text-xs text-gray-600">{describe(data.daily.weathercode[i])}</div>
                    <div className="mt-2 font-semibold">{data.daily.temperature_2m_min[i]}–{data.daily.temperature_2m_max[i]}{tSym}</div>
                    <div className="text-xs text-blue-600 mt-1">💧 {data.daily.precipitation_sum[i]} {pSym}</div>
                    <div className="text-xs text-gray-500">💨 {data.daily.windspeed_10m_max[i]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Temperature range</h3>
              <div className="space-y-3">
                {data.daily.time.map((t, i) => {
                  const min = data.daily.temperature_2m_min[i];
                  const max = data.daily.temperature_2m_max[i];
                  const rangeMin = Math.min(...data.daily.temperature_2m_min, ...data.daily.temperature_2m_max);
                  const rangeMax = Math.max(...data.daily.temperature_2m_min, ...data.daily.temperature_2m_max);
                  const span = rangeMax - rangeMin || 1;
                  const left = ((min - rangeMin) / span) * 100;
                  const width = ((max - min) / span) * 100;
                  return (
                    <div key={t} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-gray-500">{t.slice(5)}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full relative">
                        <div
                          className="absolute h-3 bg-gradient-to-r from-blue-300 to-blue-600 rounded-full"
                          style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                        />
                      </div>
                      <span className="text-sm w-20 text-right">{min}–{max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
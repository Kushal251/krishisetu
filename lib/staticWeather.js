const WEATHER_BY_MONTH = {
  1: { condition: "Cool", rainfallMm: 12, temperatureC: 18 },
  2: { condition: "Cool", rainfallMm: 10, temperatureC: 21 },
  3: { condition: "Hot", rainfallMm: 8, temperatureC: 27 },
  4: { condition: "Hot", rainfallMm: 5, temperatureC: 32 },
  5: { condition: "Hot", rainfallMm: 8, temperatureC: 36 },
  6: { condition: "Rainy", rainfallMm: 125, temperatureC: 31 },
  7: { condition: "Heavy Rain", rainfallMm: 285, temperatureC: 27 },
  8: { condition: "Heavy Rain", rainfallMm: 260, temperatureC: 26 },
  9: { condition: "Rainy", rainfallMm: 165, temperatureC: 27 },
  10: { condition: "Normal", rainfallMm: 55, temperatureC: 26 },
  11: { condition: "Normal", rainfallMm: 18, temperatureC: 23 },
  12: { condition: "Cool", rainfallMm: 10, temperatureC: 19 },
};

const DISTRICT_ADJUSTMENTS = {
  Bhopal: { rainfall: 8, temperature: 0 },
  Dewas: { rainfall: 5, temperature: 0 },
  Dhar: { rainfall: 14, temperature: -1 },
  Indore: { rainfall: 12, temperature: -1 },
  Mandsaur: { rainfall: -8, temperature: 1 },
  Neemuch: { rainfall: -10, temperature: 1 },
  Ratlam: { rainfall: -4, temperature: 1 },
  Sehore: { rainfall: 6, temperature: 0 },
  Ujjain: { rainfall: 0, temperature: 0 },
  Vidisha: { rainfall: 4, temperature: 0 },
};

export function getStaticWeather(district, date = new Date()) {
  const month = date.getUTCMonth() + 1;
  const base = WEATHER_BY_MONTH[month];
  const adjustment = DISTRICT_ADJUSTMENTS[district] || { rainfall: 0, temperature: 0 };
  return {
    condition: base.condition,
    rainfallMm: Math.max(0, base.rainfallMm + adjustment.rainfall),
    temperatureC: base.temperatureC + adjustment.temperature,
    source: "STATIC_DISTRICT_MONTH_PROFILE",
  };
}

export function getForecastSeason(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  if ([9, 10, 11].includes(month)) return "Kharif Harvest";
  if ([12, 1, 2].includes(month)) return "Post-Harvest";
  if ([6, 7, 8].includes(month)) return "Kharif Harvest";
  return "Post-Harvest";
}

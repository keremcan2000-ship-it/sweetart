// Curated list of major world cities with lat/lng for proximity matching.
// Adding more cities later is just adding entries to this array.

export type City = {
  name: string;
  country: string;
  lat: number;
  lng: number;
};

export const CITIES: City[] = [
  // Turkey
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597 },
  { name: 'İzmir', country: 'Turkey', lat: 38.4192, lng: 27.1287 },
  { name: 'Bursa', country: 'Turkey', lat: 40.1828, lng: 29.0665 },
  { name: 'Antalya', country: 'Turkey', lat: 36.8969, lng: 30.7133 },
  { name: 'Adana', country: 'Turkey', lat: 37.0, lng: 35.3213 },
  { name: 'Konya', country: 'Turkey', lat: 37.8667, lng: 32.4833 },
  { name: 'Gaziantep', country: 'Turkey', lat: 37.0662, lng: 37.3833 },
  { name: 'Mersin', country: 'Turkey', lat: 36.8121, lng: 34.6415 },
  { name: 'Eskişehir', country: 'Turkey', lat: 39.7767, lng: 30.5206 },
  { name: 'Diyarbakır', country: 'Turkey', lat: 37.9144, lng: 40.2306 },
  { name: 'Trabzon', country: 'Turkey', lat: 41.0015, lng: 39.7178 },
  { name: 'Kayseri', country: 'Turkey', lat: 38.7225, lng: 35.4875 },
  { name: 'Samsun', country: 'Turkey', lat: 41.2867, lng: 36.33 },
  { name: 'Erzurum', country: 'Turkey', lat: 39.9, lng: 41.27 },
  { name: 'Bodrum', country: 'Turkey', lat: 37.0344, lng: 27.4305 },
  { name: 'Çanakkale', country: 'Turkey', lat: 40.1553, lng: 26.4142 },
  { name: 'Edirne', country: 'Turkey', lat: 41.6764, lng: 26.5557 },

  // United Kingdom & Ireland
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', country: 'United Kingdom', lat: 52.4862, lng: -1.8904 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lng: -3.1883 },
  { name: 'Glasgow', country: 'United Kingdom', lat: 55.8642, lng: -4.2518 },
  { name: 'Liverpool', country: 'United Kingdom', lat: 53.4084, lng: -2.9916 },
  { name: 'Bristol', country: 'United Kingdom', lat: 51.4545, lng: -2.5879 },
  { name: 'Leeds', country: 'United Kingdom', lat: 53.8008, lng: -1.5491 },
  { name: 'Brighton', country: 'United Kingdom', lat: 50.8225, lng: -0.1372 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },

  // France
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698 },
  { name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357 },
  { name: 'Toulouse', country: 'France', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.262 },
  { name: 'Bordeaux', country: 'France', lat: 44.8378, lng: -0.5792 },

  // Germany / Austria / Switzerland
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Hamburg', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
  { name: 'Cologne', country: 'Germany', lat: 50.9375, lng: 6.9603 },
  { name: 'Stuttgart', country: 'Germany', lat: 48.7758, lng: 9.1829 },
  { name: 'Düsseldorf', country: 'Germany', lat: 51.2277, lng: 6.7735 },
  { name: 'Leipzig', country: 'Germany', lat: 51.3397, lng: 12.3731 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Salzburg', country: 'Austria', lat: 47.8095, lng: 13.055 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Basel', country: 'Switzerland', lat: 47.5596, lng: 7.5886 },

  // Italy / Spain / Portugal
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681 },
  { name: 'Florence', country: 'Italy', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Turin', country: 'Italy', lat: 45.0703, lng: 7.6869 },
  { name: 'Bologna', country: 'Italy', lat: 44.4949, lng: 11.3426 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Valencia', country: 'Spain', lat: 39.4699, lng: -0.3763 },
  { name: 'Seville', country: 'Spain', lat: 37.3891, lng: -5.9845 },
  { name: 'Málaga', country: 'Spain', lat: 36.7213, lng: -4.4214 },
  { name: 'Bilbao', country: 'Spain', lat: 43.263, lng: -2.935 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291 },

  // Netherlands / Belgium
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777 },
  { name: 'The Hague', country: 'Netherlands', lat: 52.0705, lng: 4.3007 },
  { name: 'Utrecht', country: 'Netherlands', lat: 52.0907, lng: 5.1214 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Antwerp', country: 'Belgium', lat: 51.2194, lng: 4.4025 },
  { name: 'Ghent', country: 'Belgium', lat: 51.0543, lng: 3.7174 },

  // Nordic
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Gothenburg', country: 'Sweden', lat: 57.7089, lng: 11.9746 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Bergen', country: 'Norway', lat: 60.3913, lng: 5.3221 },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  { name: 'Reykjavík', country: 'Iceland', lat: 64.1466, lng: -21.9426 },

  // Eastern Europe
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Krakow', country: 'Poland', lat: 50.0647, lng: 19.945 },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { name: 'Bucharest', country: 'Romania', lat: 44.4268, lng: 26.1025 },
  { name: 'Sofia', country: 'Bulgaria', lat: 42.6977, lng: 23.3219 },
  { name: 'Belgrade', country: 'Serbia', lat: 44.7866, lng: 20.4489 },
  { name: 'Zagreb', country: 'Croatia', lat: 45.815, lng: 15.9819 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Thessaloniki', country: 'Greece', lat: 40.6401, lng: 22.9444 },
  { name: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234 },
  { name: 'Lviv', country: 'Ukraine', lat: 49.8397, lng: 24.0297 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { name: 'Saint Petersburg', country: 'Russia', lat: 59.9311, lng: 30.3609 },
  { name: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.7536 },
  { name: 'Riga', country: 'Latvia', lat: 56.9496, lng: 24.1052 },
  { name: 'Vilnius', country: 'Lithuania', lat: 54.6872, lng: 25.2797 },

  // North America — USA
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'Brooklyn', country: 'United States', lat: 40.6782, lng: -73.9442 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', country: 'United States', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', country: 'United States', lat: 33.4484, lng: -112.074 },
  { name: 'Philadelphia', country: 'United States', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', country: 'United States', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', country: 'United States', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', country: 'United States', lat: 32.7767, lng: -96.797 },
  { name: 'San Jose', country: 'United States', lat: 37.3382, lng: -121.8863 },
  { name: 'Austin', country: 'United States', lat: 30.2672, lng: -97.7431 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', country: 'United States', lat: 39.7392, lng: -104.9903 },
  { name: 'Washington, D.C.', country: 'United States', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589 },
  { name: 'Detroit', country: 'United States', lat: 42.3314, lng: -83.0458 },
  { name: 'Nashville', country: 'United States', lat: 36.1627, lng: -86.7816 },
  { name: 'Memphis', country: 'United States', lat: 35.1495, lng: -90.049 },
  { name: 'Portland', country: 'United States', lat: 45.5051, lng: -122.675 },
  { name: 'Las Vegas', country: 'United States', lat: 36.1699, lng: -115.1398 },
  { name: 'Atlanta', country: 'United States', lat: 33.749, lng: -84.388 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'New Orleans', country: 'United States', lat: 29.9511, lng: -90.0715 },
  { name: 'Minneapolis', country: 'United States', lat: 44.9778, lng: -93.265 },

  // Canada
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Ottawa', country: 'Canada', lat: 45.4215, lng: -75.6972 },
  { name: 'Calgary', country: 'Canada', lat: 51.0447, lng: -114.0719 },

  // Latin America
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Guadalajara', country: 'Mexico', lat: 20.6597, lng: -103.3496 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lng: -74.0721 },
  { name: 'Medellín', country: 'Colombia', lat: 6.2442, lng: -75.5812 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Havana', country: 'Cuba', lat: 23.1136, lng: -82.3666 },
  { name: 'Quito', country: 'Ecuador', lat: -0.1807, lng: -78.4678 },

  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023 },
  { name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { name: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579 },
  { name: 'Guangzhou', country: 'China', lat: 23.1291, lng: 113.2644 },
  { name: 'Chengdu', country: 'China', lat: 30.5728, lng: 104.0668 },
  { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.7883, lng: 98.9853 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Bali', country: 'Indonesia', lat: -8.4095, lng: 115.1889 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0285, lng: 105.8542 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
  { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lng: 85.324 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612 },

  // Middle East
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.4858, lng: 39.1925 },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lng: 47.9774 },
  { name: 'Manama', country: 'Bahrain', lat: 26.2235, lng: 50.5876 },
  { name: 'Muscat', country: 'Oman', lat: 23.5859, lng: 58.4059 },
  { name: 'Tehran', country: 'Iran', lat: 35.6892, lng: 51.389 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.3152, lng: 44.3661 },
  { name: 'Amman', country: 'Jordan', lat: 31.9454, lng: 35.9284 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Jerusalem', country: 'Israel', lat: 31.7683, lng: 35.2137 },

  // Africa
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Alexandria', country: 'Egypt', lat: 31.2001, lng: 29.9187 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898 },
  { name: 'Marrakech', country: 'Morocco', lat: 31.6295, lng: -7.9811 },
  { name: 'Rabat', country: 'Morocco', lat: 34.0209, lng: -6.8416 },
  { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lng: 10.1815 },
  { name: 'Algiers', country: 'Algeria', lat: 36.7538, lng: 3.0588 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
  { name: 'Addis Ababa', country: 'Ethiopia', lat: 9.0249, lng: 38.7469 },
  { name: 'Accra', country: 'Ghana', lat: 5.6037, lng: -0.187 },

  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251 },
  { name: 'Perth', country: 'Australia', lat: -31.9505, lng: 115.8605 },
  { name: 'Adelaide', country: 'Australia', lat: -34.9285, lng: 138.6007 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },
  { name: 'Wellington', country: 'New Zealand', lat: -41.2865, lng: 174.7762 },
];

/**
 * Search cities by name. Case-insensitive substring match. Returns top N
 * matches sorted by: exact prefix match first, then alphabetical.
 * If countryFilter is provided, only cities from that country are returned.
 */
export function searchCities(
  query: string,
  limit = 8,
  countryFilter?: string | null,
): City[] {
  const q = query.trim().toLowerCase();
  const cf = countryFilter?.trim();
  const pool = cf ? CITIES.filter((c) => c.country === cf) : CITIES;

  // When a country is fixed and query is empty, list all cities in that country.
  if (!q) {
    if (!cf) return [];
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  const matches: { city: City; score: number }[] = [];
  for (const c of pool) {
    const name = c.name.toLowerCase();
    if (name.startsWith(q)) matches.push({ city: c, score: 0 });
    else if (name.includes(q)) matches.push({ city: c, score: 1 });
    else if (!cf && c.country.toLowerCase().includes(q))
      matches.push({ city: c, score: 2 });
  }
  matches.sort(
    (a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name),
  );
  return matches.slice(0, limit).map((m) => m.city);
}

/** Unique sorted list of countries appearing in CITIES. */
export function listCountries(): string[] {
  const set = new Set<string>();
  for (const c of CITIES) set.add(c.country);
  return Array.from(set).sort();
}

/** Country search (substring), top N. */
export function searchCountries(query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase();
  const all = listCountries();
  if (!q) return all.slice(0, limit);
  const matches: { name: string; score: number }[] = [];
  for (const c of all) {
    const name = c.toLowerCase();
    if (name.startsWith(q)) matches.push({ name: c, score: 0 });
    else if (name.includes(q)) matches.push({ name: c, score: 1 });
  }
  matches.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return matches.slice(0, limit).map((m) => m.name);
}

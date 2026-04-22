/**
 * Utility for location-based services like reverse geocoding
 */

/**
 * Fetches the human-readable address for a given set of coordinates using Nominatim (OpenStreetMap)
 * @param lat Latitude
 * @param lng Longitude
 * @returns A formatted address string or null if not found
 */
export async function getReverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    // Nominatim usage policy requires a valid User-Agent
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Kiduka-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.address) {
      const { address } = data;
      
      // Try to build a concise but descriptive address
      // Prioritize: suburb/village/town, city/county, state/region, country
      const parts = [];
      
      const neighborhood = address.neighbourhood || address.suburb;
      const city = address.city || address.town || address.village || address.county;
      const state = address.state || address.region;
      const country = address.country;

      if (neighborhood) parts.push(neighborhood);
      if (city) parts.push(city);
      else if (state) parts.push(state);
      
      if (country) parts.push(country);

      return parts.join(', ');
    }

    return data.display_name || null;
  } catch (error) {
    console.error('Error in getReverseGeocode:', error);
    return null;
  }
}

/**
 * Geolocation & Geofencing Calculation Service
 * Uses the Haversine formula to compute great-circle distances between two GPS coordinates on Earth.
 */

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters

/**
 * Calculates distance in meters between two lat/lng points
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10; // 1 decimal precision
}

/**
 * Verifies if user coordinates fall inside the restaurant's geofenced radius (50m of registered location)
 * @param {number} userLat 
 * @param {number} userLng 
 * @param {number} restLat 
 * @param {number} restLng 
 * @param {number} radiusMeters (default 50m)
 * @param {number} toleranceMeters (default 0m)
 */
export function verifyProximity(userLat, userLng, restLat, restLng, radiusMeters = 50, toleranceMeters = 0) {
  if (userLat == null || userLng == null || restLat == null || restLng == null) {
    return {
      isWithinRadius: false,
      distanceMeters: null,
      error: 'Missing required latitude or longitude coordinates.',
    };
  }

  const uLat = parseFloat(userLat);
  const uLng = parseFloat(userLng);
  const rLat = parseFloat(restLat);
  const rLng = parseFloat(restLng);

  if (isNaN(uLat) || isNaN(uLng) || isNaN(rLat) || isNaN(rLng)) {
    return {
      isWithinRadius: false,
      distanceMeters: null,
      error: 'Invalid coordinates provided. Must be valid decimal numbers.',
    };
  }

  const distanceMeters = calculateHaversineDistance(uLat, uLng, rLat, rLng);
  const effectiveRadius = radiusMeters + toleranceMeters;
  const isWithinRadius = distanceMeters <= effectiveRadius;

  return {
    isWithinRadius,
    distanceMeters,
    radiusMeters,
    toleranceMeters,
    effectiveRadius,
    summary: isWithinRadius
      ? `Proximity verified! Customer is ${distanceMeters}m away (within ${effectiveRadius}m radius of registered restaurant location).`
      : `Customer is ${distanceMeters}m away, which exceeds the ${effectiveRadius}m radius of registered restaurant location.`,
  };
}

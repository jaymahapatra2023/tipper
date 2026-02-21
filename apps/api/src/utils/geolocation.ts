/**
 * Calculate the distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check whether a guest's coordinates fall within the hotel's geofence.
 */
export function verifyGeofence(
  guestLat: number,
  guestLon: number,
  hotelLat: number,
  hotelLon: number,
  radius: number,
): { verified: boolean; distance: number } {
  const distance = calculateDistance(guestLat, guestLon, hotelLat, hotelLon);
  return {
    verified: distance <= radius,
    distance: Math.round(distance),
  };
}

/**
 * Request the user's current geolocation. Never throws — returns null on failure.
 */
export async function requestGeolocation(
  timeout = 10000,
): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 60000,
      },
    );
  });
}

/**
 * Client-side Haversine distance check for instant UI feedback.
 */
export function verifyLocationClient(
  guestLat: number,
  guestLon: number,
  hotelLat: number,
  hotelLon: number,
  radius: number,
): { verified: boolean; distance: number } {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(hotelLat - guestLat);
  const dLon = toRad(hotelLon - guestLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(guestLat)) * Math.cos(toRad(hotelLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = Math.round(R * c);

  return { verified: distance <= radius, distance };
}

/**
 * Format a distance in meters for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

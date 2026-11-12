/**
 * Computes great-circle distance in meters between two WGS84 coordinates (Haversine formula).
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

/**
 * Checks whether a pair of latitude/longitude numbers falls within valid globe bounds.
 */
export function isValidCoordinatePair(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Extracts latitude and longitude from raw "lat, lng" input or a full Google Maps URL.
 */
export function parseGoogleMapsLocation(rawInput) {
  const text = String(rawInput || '').trim();
  if (!text) {
    return { error: 'Paste a Google Maps URL or coordinates (e.g. 13.0827, 80.2707).' };
  }

  // Prefer explicit pin coords (!3dLAT!4dLNG) before viewport center (@LAT,LNG)
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:%2C|,)\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (isValidCoordinatePair(latitude, longitude)) {
        return {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
        };
      }
    }
  }

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) {
    return {
      error:
        'Shortened maps.app.goo.gl links do not contain coordinates. Open the link first and copy the full URL (with @lat,lng), or right-click the pin in Google Maps to copy coordinates.',
    };
  }

  return {
    error: 'Could not read valid latitude/longitude. Example: 13.0827, 80.2707 or a full Google Maps link.',
  };
}

/**
 * Requests high-accuracy GPS coordinates from the browser over HTTPS/localhost.
 */
export function getBrowserCoordinates() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      resolve({ error: 'GPS location is not supported on this browser.' });
      return;
    }

    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!window.isSecureContext && !isLocalHost) {
      resolve({ error: 'GPS requires HTTPS or localhost to verify gym location.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
        });
      },
      (geoError) => {
        if (geoError.code === 1) {
          resolve({
            error:
              'Location permission denied. Enable Location access in your browser/phone settings and tap again.',
          });
        } else if (geoError.code === 3) {
          resolve({
            error: 'GPS lookup timed out. Step near an open area or window and try again.',
          });
        } else {
          resolve({
            error: 'Unable to detect your GPS location right now. Ensure device Location/GPS is turned on.',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}


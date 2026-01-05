const h3 = require('h3-js');

// H3 Resolution Levels
// Resolution 0: Largest hexagons (~4,250,547 km² each) - Country level
// Resolution 7: Medium hexagons (~5.16 km² each) - City district level
// Resolution 8: Smaller hexagons (~0.737 km² each) - Neighborhood level (GOOD FOR ZONES)
// Resolution 9: Small hexagons (~0.105 km² each) - Block level (GOOD FOR HEAT MAPS)
// Resolution 10: Very small hexagons (~0.015 km² each) - Building level
// Resolution 15: Smallest hexagons (~0.0000009 km² each) - Meter level

const H3_RESOLUTION = {
  COUNTRY: 0,
  STATE: 4,
  CITY: 6,
  DISTRICT: 7,
  ZONE: 8,        // Recommended for zone mapping (~0.7 km² per hex)
  NEIGHBORHOOD: 9, // Recommended for heat maps (~0.1 km² per hex)
  BLOCK: 10,
  BUILDING: 12
};

// Default resolution for zones (can be configured)
const DEFAULT_ZONE_RESOLUTION = H3_RESOLUTION.ZONE; // Resolution 8
const DEFAULT_HEATMAP_RESOLUTION = H3_RESOLUTION.NEIGHBORHOOD; // Resolution 9

function latLngToH3(lat, lng, resolution = DEFAULT_ZONE_RESOLUTION) {
  try {
    return h3.latLngToCell(lat, lng, resolution);
  } catch (error) {
    console.error('Error converting lat/lng to H3:', error);
    return null;
  }
}

function h3ToLatLng(h3Index) {
  try {
    const coords = h3.cellToLatLng(h3Index);
    return {
      lat: coords[0],
      lng: coords[1]
    };
  } catch (error) {
    console.error('Error converting H3 to lat/lng:', error);
    return null;
  }
}

function getH3Neighbors(h3Index, ringSize = 1) {
  try {
    if (ringSize === 1) {
      return h3.gridDisk(h3Index, 1);
    }
    return h3.gridRing(h3Index, ringSize);
  } catch (error) {
    console.error('Error getting H3 neighbors:', error);
    return [];
  }
}

function getH3Boundary(h3Index) {
  try {
    return h3.cellToBoundary(h3Index);
  } catch (error) {
    console.error('Error getting H3 boundary:', error);
    return [];
  }
}

function isPointInHex(lat, lng, h3Index) {
  try {
    const pointHex = latLngToH3(lat, lng, h3.getResolution(h3Index));
    return pointHex === h3Index;
  } catch (error) {
    console.error('Error checking if point is in hex:', error);
    return false;
  }
}

function getH3Resolution(h3Index) {
  try {
    return h3.getResolution(h3Index);
  } catch (error) {
    console.error('Error getting H3 resolution:', error);
    return null;
  }
}

module.exports = {
  H3_RESOLUTION,
  DEFAULT_ZONE_RESOLUTION,
  DEFAULT_HEATMAP_RESOLUTION,
  latLngToH3,
  h3ToLatLng,
  getH3Neighbors,
  getH3Boundary,
  isPointInHex,
  getH3Resolution
};


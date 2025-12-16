const VEHICLE_SPEED_MAPPINGS = {
  "two-wheeler": 2,
  "auto": 2.5,
  "mini": 3,
  "prime sedan": 2.5,
  "suv": 3.5
};

const DEFAULT_SPEED_MIN_PER_KM = 3;

const DRIVER_ARRIVAL_BUFFER_MINUTES = 5;

function calculateStaticETA({ vehicleType, distanceKm }) {
  const speedMinPerKm = VEHICLE_SPEED_MAPPINGS[vehicleType] || DEFAULT_SPEED_MIN_PER_KM;
  const estimatedTime = Math.ceil(distanceKm * speedMinPerKm);
  
  return {
    estimatedTime: Math.max(estimatedTime, 1), 
    method: "static"
  };
}

async function calculateGoogleMapsETA({ vehicleType, distanceKm }) {
  return calculateStaticETA({ vehicleType, distanceKm });
}

async function calculateETA(params, options = {}) {
  const { useGoogleMaps = false } = options;
  
  if (useGoogleMaps) {
    return await calculateGoogleMapsETA(params);
  } else {
    return calculateStaticETA(params);
  }
}

function calculateActualTime(startTime, endTime) {
  if (!startTime || !endTime) {
    return 0;
  }
  
  const timeDiffMs = endTime.getTime() - startTime.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);
  
  return Math.ceil(Math.max(timeDiffMinutes, 0)); 
}

function calculateEstimatedArrivalTime(baseTime = new Date(), bufferMinutes = DRIVER_ARRIVAL_BUFFER_MINUTES) {
  return new Date(baseTime.getTime() + (bufferMinutes * 60 * 1000));
}

function calculateEstimatedCompletionTime(arrivalTime, estimatedRideTimeMinutes) {
  return new Date(arrivalTime.getTime() + (estimatedRideTimeMinutes * 60 * 1000));
}

module.exports = {
  calculateETA,
  calculateActualTime,
  calculateEstimatedArrivalTime,
  calculateEstimatedCompletionTime,
  VEHICLE_SPEED_MAPPINGS,
  DRIVER_ARRIVAL_BUFFER_MINUTES
};


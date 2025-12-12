const mongoose = require('mongoose');
const { responseData } = require('../../helpers/responseData');
const Driver = require('../../models/driver.model');
const Vehicle = require('../../models/vehicle.model');

// fields allowed maps will be used by updateProfile
const editableBeforeApproval = [
  "firstName",
  "lastName",
  "dob",
  "address",
  "city",
  "languages",
  "profile",
  "secondaryMobile",
  "bloodGroup"
];

const editableAfterApproval = [
  "city",
  "languages",
  "profile",
  "secondaryMobile",
  "bloodGroup"
];

module.exports = {
  // Registration: creates driver and vehicle
  register: async (req, res) => {
    try {
      const {
        mobile,
        countryCode,
        email,
        firstName,
        lastName,
        dob,
        primaryMobile,
        secondaryMobile,
        city,
        address,
        state,
        bloodGroup,
        languages,
        profile,
        // vehicle fields
        vehicleType,
        vehicleNumber,
        vehicleModel,
        rcNumber,
        ownerDetails,
        driverIsOwner,
        vehicleAge,
        isSafetyTested,
        color,
        seatingCapacity
      } = req.body;

      if (!mobile || !countryCode) {
        return res.json(responseData('MOBILE_REQUIRED', {}, req, false));
      }

      if (!vehicleType || !vehicleNumber) {
        return res.json(responseData('VEHICLE_DETAILS_REQUIRED', {}, req, false));
      }
if (!['two-wheeler', 'auto', 'mini', 'prime-sedan', 'suv'].includes(vehicleType)) {
  return res.status(400).json({
    success: false,
    message: `Invalid vehicle type. Allowed types are:two-wheeler,auto,mini,prime-sedan,suv`
  });
}
      // Check existing driver
      const existing = await Driver.findOne({ mobile, countryCode });
      if (existing) {
        return res.json(responseData('DRIVER_ALREADY_EXISTS', {}, req, false));
      }

      const driver = new Driver({
        mobile,
        countryCode,
        email,
        firstName,
        lastName,
        dob,
        primaryMobile,
        secondaryMobile,
        city,
        address,
        state,
        bloodGroup,
        languages,
        profile,
        registrationStatus: 'pending',
        status: 'inactive'
      });

      await driver.save();

      const vehicle = new Vehicle({
        driver: driver._id,
        type: vehicleType,
        number: vehicleNumber,
        model: vehicleModel,
        rcNumber,
        ownerDetails: driverIsOwner ? {} : ownerDetails,
        driverIsOwner: driverIsOwner !== undefined ? driverIsOwner : true,
        vehicleAge,
        isSafetyTested,
        color,
        seatingCapacity,
        status: 'pending'
      });

      await vehicle.save();

      return res.json(responseData('DRIVER_REGISTERED_SUCCESSFULLY', { driver, vehicle }, req, true));
    } catch (err) {
      console.log('Register error:', err);
      return res.json(responseData(err.message || 'SERVER_ERROR', {}, req, false));
    }
  },

  // Update profile respecting approval rules
  updateProfile: async (req, res) => {
    try {
      const driverId = req.user && (req.user._id || req.user.id);
      if (!driverId) {
        return res.json(responseData('NOT_AUTHORIZED', {}, req, false));
      }

      const payload = req.body || {};

      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.json(responseData('DRIVER_NOT_FOUND', {}, req, false));
      }

      const isApproved = driver.registrationStatus === 'approved';

      // ❌ Never allowed to update
      const forbidden = ["mobile", "countryCode", "_id"];
      forbidden.forEach(f => delete payload[f]);

      // Allowed fields based on approval status
      const allowedList = isApproved ? editableAfterApproval : editableBeforeApproval;

      // Build driver update object
      const driverUpdate = {};
      allowedList.forEach(field => {
        if (payload[field] !== undefined) {
          driverUpdate[field] = payload[field];
        }
      });

      // VEHICLE UPDATE SECTION (only allowed before approval)
      let vehicleUpdate = {};
      let vehicle = await Vehicle.findOne({ driver: driver._id });

      if (!isApproved) {
        // Support flat structure e.g: vehicleType, vehicleNumber, etc.
        if (payload.vehicleType) vehicleUpdate.type = payload.vehicleType;
        if (payload.vehicleNumber) vehicleUpdate.number = payload.vehicleNumber;
        if (payload.vehicleModel) vehicleUpdate.model = payload.vehicleModel;
        if (payload.rcNumber) vehicleUpdate.rcNumber = payload.rcNumber;
        if (payload.ownerDetails) vehicleUpdate.ownerDetails = payload.ownerDetails;
        if (payload.driverIsOwner !== undefined) vehicleUpdate.driverIsOwner = payload.driverIsOwner;
        if (payload.vehicleAge !== undefined) vehicleUpdate.vehicleAge = payload.vehicleAge;
        if (payload.isSafetyTested !== undefined) vehicleUpdate.isSafetyTested = payload.isSafetyTested;
        if (payload.color) vehicleUpdate.color = payload.color;
        if (payload.seatingCapacity !== undefined) vehicleUpdate.seatingCapacity = payload.seatingCapacity;

        if (Object.keys(vehicleUpdate).length > 0) {
          if (!vehicle) {
            vehicle = await Vehicle.create({
              driver: driver._id,
              ...vehicleUpdate,
              status: "pending"
            });
          } else {
            Object.assign(vehicle, vehicleUpdate);
            await vehicle.save();
          }
        }
      }

      if (Object.keys(driverUpdate).length === 0 && Object.keys(vehicleUpdate).length === 0) {
        return res.json(responseData('NO_VALID_FIELDS', {}, req, false));
      }

      const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        { $set: driverUpdate },
        { new: true }
      );

      return res.json(
        responseData(
          'DRIVER_PROFILE_UPDATED',
          { driver: updatedDriver, vehicle: vehicle || {} },
          req,
          true
        )
      );
    } catch (err) {
      console.log('updateProfile error:', err);
      return res.json(responseData('SERVER_ERROR', err.message, req, false));
    }
  },

  updateLocation: async (req, res) => {
    try {
      const driverId = req.user?._id; // comes from verifyToken
      const { lat, lng } = req.body;

      if (!driverId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      if (!lat || !lng) {
        return res.json(responseData("LOCATION_REQUIRED", {}, req, false));
      }

      await Driver.findByIdAndUpdate(
        driverId,
        {
          location: {
            type: "Point",
            coordinates: [lng, lat] // GeoJSON format: [lng, lat]
          }
        },
        { new: true }
      );

      return res.json(responseData("LOCATION_UPDATED", {}, req, true));

    } catch (err) {
      console.log("updateLocation err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },

};

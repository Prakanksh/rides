
const { responseData } = require("../../helpers/responseData");
const driverModel = require("../../models/driver.model");
const driverDocument = require("../../models/driverDocument");
const vehicleModel = require("../../models/vehicle.model");

module.exports={
    changeStatus :async (req, res) => {
  try {
    const { driverId, status } = req.body;

    if (!driverId) {
                return res.json(responseData('DRIVER_ID_REQUIRED', {}, req, false))
    }
    const updateFields = {};

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
      return res.json(responseData('INVALID_STATUS_VALUE', {}, req, false))

      }
      updateFields.status = status;
    }
    const updatedDriver = await driverModel.findByIdAndUpdate(
      driverId,
      updateFields,
      { new: true }
    );

    if (!updatedDriver) {
            return res.json(responseData('DRIVER_NOT_FOUND', {}, req, false))

    }
                
    
  return res.json(responseData('DRIVER_STATUS_UPDATED', {}, req, true))

  } catch (error) {
    console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
  }
},
tempDelete: async (req, res) => {
  try {
    const { id } = req.body;   
 
    if (!id) {
      return res.json(responseData("ID_REQUIRED", {}, req, false));
    }

 
    const resp = await driverModel.updateOne(
      { _id: id },
      { $set: { isDeleted: true } }
    );

    if (resp.modifiedCount > 0) {
      return res.json(responseData("USER_SOFT_DELETED", {}, req, true));
    }

    return res.json(responseData("NO_CHANGES_APPLIED", {}, req, false));

  } catch (error) {
   console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
  }
},
updateDocStatus: async (req, res) => {
  try {
    const { driverId, docType } = req.params;
    const { status } = req.body;

    // Validate document type
    const validDocTypes = ['aadhar', 'pan', 'drivingLicence', 'rc'];
    if (!validDocTypes.includes(docType)) {
        return res.json(responseData("INVALID_DOCUMENT", {}, req, false));
   
    }

  
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
              return res.json(responseData("INVALID_STATUS", {}, req, false));

    }

  
    const driver = await driverDocument.findOne({driverId:driverId});
 
  

    // Check if document exists
    if (!driver.documents || !driver.documents[docType]) {
      return res.status(404).json({
        success: false,
        message: `${docType} document not found`
      });
    }

    // Update the status
    driver.documents[docType].status = status;
    await driver.save();
  return res.json(responseData('STATUS_UPDATED', {}, req, true))

   

  } catch (error) {
    console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
  }
},
updateVehicleStatus: async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['active', 'inactive', 'pending'];

    if (!status || !allowedStatuses.includes(status)) {
        return res.json(responseData('INVALID_STATUS_VALUE', {}, req, false))  
    }

  
    const vehicle = await vehicleModel.findOneAndUpdate(
      { driver: driverId },
      { status },
      { new: true }
    );

    if (!vehicle) {
              return res.json(responseData('VEHICLE_NOT_FOUND', {}, req, false))

    }
   return res.json(responseData('STATUS_UPDATED', vehicle, req, true))


  } catch (error) {
     console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
  }
},

getAllDrivers: async (req, res) => {
  try {
    // const drivers = await driverModel.find({ isDeleted: { $ne: true } }); 
    const driverData = await driverModel.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $lookup: {  
          from: 'vehicles',
          localField: '_id',
          foreignField: 'driver',
          as: 'vehicleInfo' 
        }
      },
    
    ])
 
       return res.json(responseData('DRIVER_FETCHED_SUCCESS', driverData, req, true))

  }
    catch (error) {
    console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
  }
}
}


const { responseData } = require("../../helpers/responseData");
const driverModel = require("../../models/driver.model");

module.exports={
    changeStatus :async (req, res) => {
  try {
    const { driverId, status } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    const updateFields = {};

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
      }
      updateFields.status = status;
    }
    const updatedDriver = await driverModel.findByIdAndUpdate(
      driverId,
      updateFields,
      { new: true }
    );

    if (!updatedDriver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Driver status updated successfully",
  
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    return res.json(
      responseData("ERROR_OCCUR", { error: error.message }, req, false)
    );
  }
}
}

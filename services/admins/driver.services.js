
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
}
}

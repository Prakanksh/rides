const { responseData } = require('../../helpers/responseData')
const driverDocService = require('../../services/driver/driver.document.service')
module.exports = {
 uploadDocuments: async (req, res) => {
    try {
      // Driver ID from token (auth middleware)
      console.log(req.user)
      const driverId = req.user._id
      console.log(driverId,"--driverId-----")
      const files = req.files;

      if (!driverId) {
        return res.status(401).json({
          success: false,
          message: "DRIVER_ID_NOT_FOUND_IN_TOKEN"
        });
      }

      const result = await driverDocService.uploadDriverDocuments(driverId, files);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);

    } catch (error) {
      console.error("UPLOAD_DOC_ERROR:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};



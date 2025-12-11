const express = require('express')
const router = express.Router()

const { verifyToken } = require('../../middlewares/verifyToken')
const driverController = require('../../controllers/driver/driver.controller')
const driverDocs = require('../../controllers/driver/driver.document.controller.js')
const { driverDocFields } = require('../../middlewares/multer.setup')
const { parseMultipartJSONFields } = require('../../helpers/helper.js');
const jsonFieldsForDriver = [
  "documents",     // if you are sending documents JSON
  "extraInfo",     // any custom additional data
  "vehicleInfo"    // optional vehicle JSON
];


// Register new driver
router.post('/register', driverController.register)

// Update driver profile (allowed only when logged in)
router.put('/update-profile', verifyToken, driverController.updateProfile)
router.post("/update-location", verifyToken, driverController.updateLocation);
router.post("/upload-driver-docs",[verifyToken],driverDocFields,  parseMultipartJSONFields(jsonFieldsForDriver), driverDocs.uploadDocuments);


module.exports = router

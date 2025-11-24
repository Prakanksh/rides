
const multer = require("multer")
const constant = require("../helpers/constant")
const { storage } = require('../configs/multer_config')
const { imageFilter } = require('../helpers/helper')


const uploadProfile = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: constant.maxFileSizeLimit }
})

module.exports = {
  uploadProfile
}

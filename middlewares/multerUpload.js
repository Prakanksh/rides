
// const multer = require("multer")
// const constant = require("../helpers/constant")
// const { storage } = require('../configs/multer_config')
// const { imageFilter } = require('../helpers/helper')


// const uploadProfile = multer({
//   storage,
//   fileFilter: imageFilter,
//   limits: { fileSize: constant.maxFileSizeLimit }
// })

// module.exports = {
//   uploadProfile
// }


const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '../uploads');

// Ensure folder exists
const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const createUploader = ({ folderName, subFolder = null, allowedMime = [], maxSize = 5 * 1024 * 1024 }) => {

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let folder = folderName;

      // Allow dynamic subfolder per request
      if (subFolder && typeof subFolder === 'function') {
        folder = path.join(folderName, subFolder(req, file));
      }

      const uploadPath = path.join(baseDir, folder);
      ensureFolderExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMime.length === 0 || allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize }
  });
};

module.exports = { createUploader };
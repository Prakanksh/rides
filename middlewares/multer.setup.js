const { createUploader } = require("../middlewares/multerUpload");

const imageMime = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp"
];

const uploadDriverDocs = createUploader({
  folderName: "driverDocs",
  allowedMime: [...imageMime],
  maxSize: 20 * 1024 * 1024
});

const driverDocFields = uploadDriverDocs.fields([
  { name: "aadharFront", maxCount: 1 },
  { name: "aadharBack", maxCount: 1 },
  { name: "panFront", maxCount: 1 },
  { name: "dlFront", maxCount: 1 },
  { name: "dlBack", maxCount: 1 },
  { name: "rcFront", maxCount: 1 },
  { name: "rcBack", maxCount: 1 }
]);

module.exports = { driverDocFields };

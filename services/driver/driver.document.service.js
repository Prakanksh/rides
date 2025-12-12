const DriverDocument = require("../../models/driverDocument");

module.exports = {
uploadDriverDocuments: async (driverId, files) => {
  try {
    const normalize = (file) => (file ? file.path.replace(/\\/g, "/") : null);

    // NEW documents (uploaded files only)
    const docs = {
      aadhar: {
        front: normalize(files?.aadharFront?.[0]),
        back: normalize(files?.aadharBack?.[0]),
        status: "pending"   // 👈 ALWAYS PENDING
      },
      pan: {
        front: normalize(files?.panFront?.[0]),
        status: "pending"   // 👈 ALWAYS PENDING
      },
      drivingLicence: {
        front: normalize(files?.dlFront?.[0]),
        back: normalize(files?.dlBack?.[0]),
        status: "pending"   // 👈 ALWAYS PENDING
      },
      rc: {
        front: normalize(files?.rcFront?.[0]),
        back: normalize(files?.rcBack?.[0]),
        status: "pending"   // 👈 ALWAYS PENDING
      }
    };

    // Save or update
    const result = await DriverDocument.findOneAndUpdate(
      { driverId },
      { driverId, documents: docs },
      { new: true, upsert: true }
    );

    return {
      success: true,
      message: "DRIVER_DOCUMENTS_UPLOADED_PENDING",
      data: result
    };

  } catch (error) {
    console.error("SERVICE_ERROR:", error);
    return { success: false, message: error.message };
  }
}

};

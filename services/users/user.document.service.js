// const DriverDocument = require("../../models/driverDocument");

// module.exports = {
//   uploadDriverDocuments: async (userId, files) => {
//     try {
//       const normalize = (file) => file ? file.path.replace(/\\/g, "/") : null;

//       const docs = {
//         aadhar: {
//           front: normalize(files?.aadharFront?.[0]),
//           back: normalize(files?.aadharBack?.[0]),
//           status: files?.aadharFront || files?.aadharBack ? "approved" : "pending"
//         },
//         pan: {
//           front: normalize(files?.panFront?.[0]),
//           status: files?.panFront ? "approved" : "pending"
//         },
//         drivingLicence: {
//           front: normalize(files?.dlFront?.[0]),
//           back: normalize(files?.dlBack?.[0]),
//           status: files?.dlFront || files?.dlBack ? "approved" : "pending"
//         },
//         rc: {
//           front: normalize(files?.rcFront?.[0]),
//           back: normalize(files?.rcBack?.[0]),
//           status: files?.rcFront || files?.rcBack ? "approved" : "pending"
//         }
//       };

//       const result = await DriverDocument.create({
//         userId,
//         documents: docs
//       });

//       return {
//         success: true,
//         message: "DRIVER_DOCUMENTS_UPLOADED",
//         data: result
//       };

//     } catch (error) {
//       console.error(error);
//       return { success: false, message: error.message };
//     }
//   }
// };

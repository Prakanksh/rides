// const { responseData } = require('../../helpers/responseData')
// const driverDocService = require('../../services/users/user.document.service')
// module.exports = {
//  uploadDocuments: async (req, res) => {
//     try {
//       const userId = req.body.userId;
//       const files = req.files;

//       if (!userId) {
//         return res.status(400).json({
//           success: false,
//           message: "USER_ID_REQUIRED"
//         });
//       }

//       const result = await driverDocService.uploadDriverDocuments(userId, files);

//       if (!result.success) {
//         return res.status(400).json(result);
//       }

//       return res.status(201).json(result);

//     } catch (error) {
//       console.log(error);
//       return res.status(500).json({
//         success: false,
//         message: error.message
//       });
//     }
//   }

// }

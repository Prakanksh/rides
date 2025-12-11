// // const User = require("../models/User");
// // const Driver = require("../models/Driver");

// // const driverModel = require("../models/driver.model");
// const driverModel = require("../models/driver.model");
// const User = require("../models/user.model");
// const responseData = require("./responseData");

// module.exports ={


// updateAccountState : async (req, res,id,type) => {
//   try {
//     // const { id } = req.params;
//     // const { type, action } = req.body;
// // console.log(id,type)
//     id="6939528e250b4997ecdd4ce0",
//     type="user"
//     // if (!id || !type ) {
//     //   return res.json(responseData("ID_TYPE_ACTION_REQUIRED", {}, req, false));
//     // }

//     // if (!["user", "driver"].includes(type)) {
//     //   return res.json(responseData("INVALID_TYPE", {}, req, false));
//     // }

//     // if (!["delete", "restore"].includes(action)) {
//     //   return res.json(responseData("INVALID_ACTION", {}, req, false));
//     // }

//     const Model = type === "user" ? User : driverModel;

//     let account = await Model.findById(id);
//     // if (!account) {
//     //   return res.json(responseData("ACCOUNT_NOT_FOUND", {}, req, false));
//     // }

//     // if (action === "delete") {
//       if (account?.deleted) {
//         // return res.json(responseData("ALREADY_DELETED", {}, req, false));
//         console.log("dc")
//     //   }
//       account.deleted = true;
//     }

//     // if (action === "restore") {
//     //   if (!account.deleted) {
//     //     return res.json(responseData("NOT_DELETED", {}, req, false));
//     //   }
//     //   account.deleted = false;
//     // }

//     console.log(account)
//     // await account.save();
//     // return res.json(
//     //   responseData("ACCOUNT_UPDATED", { id, type, action }, req, true)
//     // );
//   } catch (err) {
//     console.error("updateAccountState err:", err);
//     // return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
//   }
// },
// } 
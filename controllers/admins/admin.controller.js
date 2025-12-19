const { create } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const adminService = require('../../services/admins/admin.services')
const adminSettingModel = require('../../models/adminSetting.model')
module.exports = {
  adminLogin: async (req, res) => {
    try {
      // console.log("cons")
      await adminService.adminLogin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminProfile: async (req, res) => {
    try {
      await adminService.adminProfile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminForgotPassword: async (req, res) => {
    try {
      await adminService.adminForgotPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminResetPassword: async (req, res) => {
    try {
      await adminService.adminResetPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changePassword: async (req, res) => {
    try {
      await adminService.changePassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  editAdmin: async (req, res) => {
    try {
      await adminService.editAdmin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changeStatus: async (req, res) => {
    try {
      await adminService.changeStatus(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  generatePresignedURL: async (req, res) => {
    try {
      await adminService.generatePresignedURL(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  countryList: async (req, res) => {
    try {
      await adminService.countryList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getAdminDashboard: async (req, res) => {
  try {
    const result = await adminService.getAdminDashboardData();

    if (!result.success) {
      return res
        .status(400)
        .json(responseData(result.message, {}, req, false));
    }

    return res
      .status(200)
      .json(responseData(result.message, result.data, req, true));
  } catch (error) {
    return res
      .status(500)
      .json(
        responseData(
          error.message || "SERVER_ERROR",
          { error: error.message },
          req,
          false
        )
      );
  }
},
updateSupportStatus : async (req, res) => {
    try {
      await adminService.updateSupportStatus(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getSupportInquires : async (req, res) => {
    try {
      await adminService.getSupportInquires(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  createPromoCode: async (req, res) => {
    try {
      await adminService.createPromoCode(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }},

createOrUpdateSettings : async (req, res) => {
  try {
    const { commissionPercentage, cancellationFee, minimumFare ,driverCancelationFee} = req.body;

    // Basic validation
    if (!commissionPercentage || !cancellationFee || !minimumFare || !driverCancelationFee) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: commissionPercentage, cancellationFee, minimumFare"
      });
    }

    // Numeric validation
    if (isNaN(commissionPercentage) || isNaN(cancellationFee) || isNaN(minimumFare) || isNaN(driverCancelationFee)) {
      return res.status(400).json({
        success: false,
        message: "All fields must be numbers"
      });
    }

    // Business rule validation
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: "Commission percentage must be between 0 and 100"
      });
    }

    if (cancellationFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Cancellation fee cannot be negative"
      });
    }

    if (minimumFare < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum fare cannot be negative"
      });
    }

    // Check if settings already exist (assuming single document)
    let settings = await adminSettingModel.findOne();

    if (settings) {
      // Update existing settings
      settings.commissionPercentage = commissionPercentage;
      settings.cancellationFee = cancellationFee;
      settings.minimumFare = minimumFare;
      settings.driverCancelationFee = driverCancelationFee;
      await settings.save();
      
      return res.status(200).json({
        success: true,
        message: "Admin settings updated successfully",
        data: settings
      });
    } else {
      // Create new settings
      settings = await adminSettingModel.create({
        commissionPercentage,
        cancellationFee,
        minimumFare
      });
      
      return res.status(201).json({
        success: true,
        message: "Admin settings created successfully",
        data: settings
      });
    }
  } catch (error) {
    console.error("Error creating/updating admin settings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing admin settings",
     
    });
  }
}
}

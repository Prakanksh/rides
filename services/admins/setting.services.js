const { responseData } = require('../../helpers/responseData')
const Setting = require('../../models/setting.model')
const { getAdminSetting } = require('../../helpers/helper')
module.exports = {
  updateSetting: async (req, res) => {
    try {


      const {
        adminEmail,
       payButtonValidity,
       supplierLinkCommissionUsers,
       supplierLinkCommission,
       appleLink,
       facebookLink,
        googleLink,
        instagramLink,
        twitterLink,

      } = req.body

      console.log('<<<<<<<<<<<<<< req.body >>>>>fhgfdkgh>>>>>>>>>',req.body)

      const data = {
       adminEmail,
       payButtonValidity,
       supplierLinkCommissionUsers,
       supplierLinkCommission,
       appleLink,
       facebookLink,
        googleLink,
        instagramLink,
        twitterLink,
      }
      const setting = await Setting.findOne()
      const updateOptions = { new: true, runValidators: true }

      const updateQuery = setting
        ? await Setting.findByIdAndUpdate(
          setting._id,
          { $set: data },
          updateOptions
        )
        : await Setting.create(data)

      return res.json(
        responseData('SETTINGS_UPDATED_SUCCESSFULLY', updateQuery, req, true)
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },

  settingData: async (req, res) => {
    try {
      const getResult = await getAdminSetting(req.user?._id)
      return res.json(responseData('GET_LIST', getResult, req, true))
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}

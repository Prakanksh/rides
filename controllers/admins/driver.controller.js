const {responseData} = require("../../helpers/responseData")
const driverService = require("../../services/admins/driver.services")

module.exports = {

    changeStatus: async (req, res) => {
    try {
      await driverService.changeStatus(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }   
},
tempDelete: async(req,res)=>{
       try {
        // console.log("ed")
         await driverService.tempDelete(req, res)
       } catch (err) {
         const msg = err.message || 'SOMETHING_WENT_WRONG'
         return res.status(422).json(responseData(msg, {}, req))
       }  },
       updateDocStatus: async (req, res) => {
        try {
          await driverService.updateDocStatus(req, res)
        } catch (err) {
          const msg = err.message || 'SOMETHING_WENT_WRONG'
          return res.status(422).json(responseData(msg, {}, req))
        }   }
}
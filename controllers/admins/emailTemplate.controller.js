const { responseData } = require('../../helpers/responseData')
const EmailTemplateService = require('../../services/admins/emailTemplate.services')
module.exports = {

  listEmailTemplates: async (req, res) => {
    try {
      await EmailTemplateService.listEmailTemplates(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  editEmailTemplate: async (req, res) => {
    try {
      await EmailTemplateService.editEmailTemplate(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changeStatusEmailTemplate: async (req,res) =>{
    try{
      await EmailTemplateService.changeStatusEmailTemplate(req, res)
    }catch(err){
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}

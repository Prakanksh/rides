const mongoose = require('mongoose')
const mongooseSlugPlugin = require('mongoose-slug-plugin')
const { type } = require('../helpers/constant')

const EmailTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    subject: {
      type: String
      // required: true
    },
    description: {
      type: String,
      required: true
    },
    keyword: {
      type: String
      // required: true
    },
    signature: {
      type: String
      // required: true
    },
    keywordList: {
      type: Array
    },
    slug: {
      type: String
    },
    status: {
      type: String,
      required: true,
      ENUM: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
)

EmailTemplateSchema.plugin(mongooseSlugPlugin, { tmpl: '<%=title%>' })
const EmailTemplate = mongoose.model('emailTemplates', EmailTemplateSchema)

module.exports = EmailTemplate

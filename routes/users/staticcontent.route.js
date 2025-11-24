const express = require('express')
const router = express.Router()
const validationRule = require('../../validations/users/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const {
  getStaticSlug,
  getStaticContentBySlug,
  getFaq,
  getBanners,
} = require('../../controllers/users/staticcontent.controller')

router
  .get('/getStaticSlug', getStaticSlug)
  .get('/getStaticContentBySlug', getStaticContentBySlug)
  .get("/faq", getFaq)
  .get("/getBanners",  [verifyToken], getBanners)

module.exports = router


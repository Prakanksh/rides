require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const db = require('./models/index')
const path = require('path')
const app = express()
const http = require('http')
const server = http.createServer(app)

db.initialize()

const corsOption = {
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  exposedHeaders: ['x-access-token']
}

// ===== IMPORT ROUTES FIRST =====

// User route variables
const userRoutes = require('./routes/users/user.route')
const userStaticContentRoutes = require('./routes/users/staticcontent.route')
const userSavedAddressRoutes = require('./routes/users/address.route')
const userNotificationRoutes = require('./routes/users/notification.route')

// Admin route variables
const adminEmailTemplateRouter = require('./routes/admins/emailTemplate.route')
const adminUsersRouter = require('./routes/admins/users.route')
const adminsRouter = require('./routes/admins/admins.route')
const adminSubAdminRouter = require('./routes/admins/subAdmins.route')
const adminStaticContentRouter = require('./routes/admins/staticcontent.route')
const adminFaqRouter = require('./routes/admins/faq.route')
const adminSettingRouter = require('./routes/admins/setting.route')
const adminDashboardRouter = require('./routes/admins/dashboard.route')
const adminNotificationRouter = require('./routes/admins/notification.route')
const adminCategoryRouter = require('./routes/admins/category.route')
const adminBannerRouter = require('./routes/admins/banner.route')
const adminSubCategoryRouter = require('./routes/admins/subCategory.route')
const adminTestimonialRouter = require('./routes/admins/testimonial.route')
const adminEarningRouter = require('./routes/admins/earning.route')
const adminProductRouter = require('./routes/admins/product.route')
const adminSubscriptionRouter = require('./routes/admins/subscription.route')

// ===== DRIVER ROUTES =====
const driverRoutes = require('./routes/driver/driver.route')
const driverAuthRoutes = require('./routes/driver/auth.route')

// ===== RIDE ROUTES (NEW) =====
const rideRoutes = require('./routes/ride/ride.route')

// ====================================================
// 🟢 MIDDLEWARES MUST COME BEFORE ROUTES
// ====================================================

app.use(cors(corsOption))
app.use(morgan('dev'))

app.use(
  require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static('public'))
app.use(express.static(path.join(__dirname, 'public')))

// ====================================================
// 🟢 DRIVER ROUTES
// ====================================================

app.use('/v1/driver', driverRoutes)
app.use('/v1/driver/auth', driverAuthRoutes)

// ====================================================
// 🟢 RIDE ROUTES (NEW)
// ====================================================

app.use('/v1/ride', rideRoutes)

// Health route
app.get('/', (req, res) => {
  res.send(`API is Running on Port ${process.env.PORT}`)
})

// ====================================================
// 🟢 ADMIN ROUTES
// ====================================================

app.use('/v1/admin/user', adminUsersRouter)
app.use('/v1/admin/subAdmin', adminSubAdminRouter)
app.use('/v1/admin/static-content', adminStaticContentRouter)
app.use('/v1/admin/faq', adminFaqRouter)
app.use('/v1/admin', adminsRouter, adminDashboardRouter)
app.use('/v1/admin/setting', adminSettingRouter)
app.use('/v1/admin/email-template', adminEmailTemplateRouter)
app.use('/v1/admin/notification', adminNotificationRouter)
app.use('/v1/admin/category', adminCategoryRouter)
app.use('/v1/admin/banner', adminBannerRouter)
app.use('/v1/admin/sub-category', adminSubCategoryRouter)
app.use('/v1/admin/product', adminProductRouter)
app.use('/v1/admin/testimonial', adminTestimonialRouter)
app.use('/v1/admin/subscription', adminSubscriptionRouter)
app.use('/v1/admin/earning', adminEarningRouter)

// ====================================================
// 🟢 USER ROUTES
// ====================================================

app.use('/v1/user', userRoutes)
app.use('/v1/user/notification', userNotificationRoutes)
app.use('/v1/user/staticcontent', userStaticContentRoutes)
app.use('/v1/user/address', userSavedAddressRoutes)

// NOT FOUND HANDLER
app.use(function (req, res) {
  res.status(404).json({
    status: 404,
    message: "Sorry can't find that!",
    data: {}
  })
})

server.listen(process.env.PORT, () => {
  console.log('Server is running at PORT', process.env.PORT)
})

const { responseData, generateAuthToken } = require('../../helpers/responseData');
const Otp = require('../../models/otp.model');
const Driver = require('../../models/driver.model');
const moment = require('moment');

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

module.exports = {
  sendOtpLogin: async (req, res) => {
    try {
      const { mobile, countryCode } = req.body;
      if (!mobile || !countryCode) {
        return res.json(responseData('MOBILE_REQUIRED', {}, req, false));
      }

      const driver = await Driver.findOne({ mobile, countryCode });
      if (!driver) {
        return res.json(responseData('DRIVER_NOT_FOUND', {}, req, false));
      }

      if (driver.status !== 'active') {
        return res.json(responseData('DRIVER_INACTIVE', {}, req, false));
      }

      const otp = generateOTP();
      await Otp.deleteMany({ mobile });

      const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRATION_SECONDS || 60) * 1000);

      const otpRecord = await Otp.create({
        mobile,
        countryCode,
        otp,
        driverId: driver._id,
        isUsed: false,
        expiresAt,
        sentVia: 'sms'
      });

      return res.json(responseData('OTP_SENT', { mobileOtpId: otpRecord._id }, req, true));
    } catch (err) {
      console.log('sendOtpLogin err:', err);
      return res.json(responseData('ERROR_OCCUR', err.message, req, false));
    }
  },

  verifyOtpLogin: async (req, res) => {
    try {
      const { mobileOtpId, otp } = req.body;
      if (!mobileOtpId || !otp) {
        return res.json(responseData('OTP_REQUIRED', {}, req, false));
      }

      const checkOtp = await Otp.findOne({ _id: mobileOtpId, otp });
      if (!checkOtp) {
        return res.json(responseData('OTP_NOT_VERIFIED', {}, req, false));
      }

      if (moment().isAfter(checkOtp.expiresAt)) {
        return res.json(responseData('OTP_EXPIRED', {}, req, false));
      }

      const driver = await Driver.findById(checkOtp.driverId);
      if (!driver) {
        return res.json(responseData('DRIVER_NOT_FOUND', {}, req, false));
      }

      checkOtp.isUsed = true;
      await checkOtp.save();

      const driverObj = driver.toJSON();
      driverObj.role = 'driver';
      const tokens = generateAuthToken(driverObj);

      return res.json(responseData('ACCOUNT_LOGIN', { ...driverObj, ...tokens }, req, true));
    } catch (err) {
      console.log('verifyOtpLogin err:', err);
      return res.json(responseData('ERROR_OCCUR', err.message, req, false));
    }
  },
};

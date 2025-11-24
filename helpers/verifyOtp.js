const Otp = require("../models/otp.model");
const TempUser = require("../models/tempUser.model");

module.exports.verifyMobileOTP = async (otpMobile, OTP_EXPIRATION_SECONDS, mobileOtpId) => {
  const record = await Otp.findOne({ _id: mobileOtpId });
  if (!record) return "INVALID_MOBILE_OTP";

  if (String(record.otp) !== String(otpMobile)) {
    return "INVALID_MOBILE_OTP";
  }

  const now = new Date();
  const diffSec = (now - record.createdAt) / 1000;

  if (diffSec > OTP_EXPIRATION_SECONDS) return "MOBILE_OTP_EXPIRED";

  await TempUser.findOneAndUpdate(
    { mobile: record.mobile },
    { isMobileVerified: true }
  );

  return null; // success
};

module.exports.verifyEmailOTP = async (otpEmail, OTP_EXPIRATION_SECONDS, emailOtpId) => {
  const record = await Otp.findOne({ _id: emailOtpId });
  if (!record) return "INVALID_EMAIL_OTP";

  if (String(record.otp) !== String(otpEmail)) {
    return "INVALID_EMAIL_OTP";
  }

  const now = new Date();
  const diffSec = (now - record.createdAt) / 1000;

  if (diffSec > OTP_EXPIRATION_SECONDS) return "EMAIL_OTP_EXPIRED";

  await TempUser.findOneAndUpdate(
    { email: record.email },
    { isEmailVerified: true }
  );

  return null; // success
};

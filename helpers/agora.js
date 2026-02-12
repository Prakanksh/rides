
// Agora RTC token generation for ride audio calls.
// Uses AGORA_APP_KEY and AGORA_CERTIFICATE from .env.
 
const { RtcTokenBuilder, RtcRole } = require("agora-token");

const DEFAULT_EXPIRY_SECONDS = 1800; // 30minutes 


//  Generate an RTC token for the given channel.
//  @param {string} channelName - Agora channel name (e.g. call_ride_<rideId>)
//  @param {string|number} [uid=0] - User id for the token (optional, 0 if omitted)
//  @returns {string} Token string
 
function generateRtcToken(channelName, uid = 0) {
  const appId = process.env.AGORA_APP_KEY;
  const appCertificate = process.env.AGORA_CERTIFICATE;
  if (!appId || !appCertificate) {
    throw new Error("AGORA_APP_KEY and AGORA_CERTIFICATE must be set in .env");
  }
  const role = RtcRole.PUBLISHER;
  const uidNum = typeof uid === "string" ? parseInt(uid, 10) || 0 : (uid || 0);
  // tokenExpire = seconds from now (agora-token v2 API)
  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uidNum,
    role,
    DEFAULT_EXPIRY_SECONDS,
    DEFAULT_EXPIRY_SECONDS
  );
}

module.exports = { generateRtcToken };

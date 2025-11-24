// let path = require('path')
// let admin = require('firebase-admin')
// let serviceAccount = require(path.resolve(
//   __dirname,
//   '..',
//   'configs',
//   'firebase-admin-sdk'
// ))

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// })
// const sendNotifications = async messages => {
//   if (messages.length) {
//     try {
//       let sendNotification = await admin.messaging().sendEach(messages)
//       if (sendNotification.failureCount) {
//         console.log('Notification failureCount: ', sendNotification.failureCount)
//         // JSON.stringify(sendNotification, null, 2)

//       } else {
//         console.log('Notification successCount: ', sendNotification.successCount)
//       }
//     } catch (error) {
//       console.log("error sending push notifications", error)
//     }
//   } else {
//     console.log(messages)
//   }
// }
// const sendMulticast = async messageTo => {
//   try {
//     const sendNoti = await admin.messaging().sendMulticast(messageTo)
//     if (sendNoti.failureCount) {
//       console.log(
//         'Notification send failureCount: ',
//         sendNoti.failureCount,
//         JSON.stringify(sendNoti)
//       )
//     } else {
//       console.log(
//         'Notification send successCount: ',
//         sendNoti.successCount,
//         sendNoti
//       )
//     }
//   } catch (e) {
//     console.log(e)
//   }
// }

// module.exports = {
//   sendNotifications, sendMulticast
// }

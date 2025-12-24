/**
 * Comprehensive API Flow Testing Script
 * 
 * This script tests all ride flows independently without modifying codebase.
 * Run: node test-all-flows.js
 * 
 * Tests:
 * 1. API Cash Payment Flow
 * 2. API Wallet Payment Flow
 * 3. API Cancel (User)
 * 4. API Cancel (Driver)
 * 5. Socket flows (manual verification required)
 */

const axios = require('axios');
const readline = require('readline');

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = 'http://localhost:5678';

// ============================================
// MONGODB COMMANDS TO SETUP DRIVER
// ============================================
// Run these commands in MongoDB BEFORE running tests to ensure driver is available:
//
// Update driver location, availability, and status:
// db.drivers.updateOne(
//   { mobile: "9876543210" },
//   {
//     $set: {
//       "location.coordinates": [77.2090, 28.6139],  // [lng, lat] - Near pickup location (New Delhi Railway Station)
//       "location.type": "Point",
//       isAvailable: true,
//       status: "active",
//       registrationStatus: "approved",
//       isDeleted: false
//     }
//   }
// )
//
// Verify driver setup:
// db.drivers.findOne(
//   { mobile: "9876543210" },
//   { mobile: 1, location: 1, isAvailable: 1, status: 1, registrationStatus: 1 }
// )
//
// ============================================

const USER_CREDENTIALS = {
  type: 'mobile',
  countryCode: '+91',
  mobile: '1234567890',
  password: 'test123',
  deviceId: 'device1',
  deviceType: 'ios',
  deviceToken: 'abc123'
};

const DRIVER_CREDENTIALS = {
  mobile: '9876543210',
  countryCode: '+91',
  deviceId: 'device2',
  deviceType: 'android',
  deviceToken: 'xyz789'
};

// DRIVER_TEST_OTP: Get this from database after script shows mobileOtpId
// Example workflow:
//   1. Run script: node test-all-flows.js
//   2. Script will show mobileOtpId
//   3. Get OTP from DB: db.otps.findOne({_id: ObjectId("mobileOtpId")})
//   4. Set OTP: export DRIVER_TEST_OTP=<otp>
//   5. Re-run script: node test-all-flows.js

const TEST_LOCATIONS = {
  pickup: {
    type: 'Point',
    coordinates: [77.2090, 28.6139], // [lng, lat]
    address: 'New Delhi Railway Station'
  },
  drop: {
    type: 'Point',
    coordinates: [77.1025, 28.5355], // [lng, lat]
    address: 'India Gate'
  }
};

// ============================================
// TEST STATE (Stores responses between calls)
// ============================================
const testState = {
  userToken: null,
  userId: null,
  driverToken: null,
  driverId: null,
  rideId: null,
  otp: null,
  results: {}
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(60));
}

function success(message) {
  console.log(`✅ ${message}`);
}

function error(message, err) {
  console.error(`❌ ${message}`);
  if (err) {
    console.error(err.response?.data || err.message);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// ============================================
// API CALL FUNCTIONS
// ============================================

async function userLogin() {
  try {
    log('STEP 1: User Login');
    const response = await axios.post(`${BASE_URL}/v1/user/login`, USER_CREDENTIALS);
    
    if (response.data.success) {
      testState.userToken = response.data.results.token;
      testState.userId = response.data.results._id;
      success(`User logged in: ${testState.userId}`);
      return { success: true, data: response.data.results };
    }
    throw new Error(`Login failed: ${response.data.message || 'Unknown error'}`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      error('User login failed - Server not running!', err);
      console.log('\n💡 TIP: Make sure your server is running on port 5678');
      console.log('   Run: npm start\n');
    } else if (err.response) {
      error('User login failed', err);
      console.log('Response:', JSON.stringify(err.response.data, null, 2));
    } else {
      error('User login failed', err);
      console.log('Error:', err.message);
    }
    return { success: false, error: err };
  }
}

async function driverLogin() {
  try {
    log('Driver Login (OTP)');
    
    // Step 1: Send OTP
    const sendOtpResponse = await axios.post(
      `${BASE_URL}/v1/driver/auth/send-otp-login`,
      { 
        mobile: DRIVER_CREDENTIALS.mobile, 
        countryCode: DRIVER_CREDENTIALS.countryCode || '+91' 
      }
    );
    
    if (!sendOtpResponse.data.success) {
      throw new Error('Failed to send OTP');
    }
    
    const mobileOtpId = sendOtpResponse.data.results?.mobileOtpId;
    if (!mobileOtpId) {
      throw new Error('OTP ID not received');
    }
    
    success('OTP sent to driver');
    
    // Step 2: Display mobileOtpId for user to get OTP from database
    console.log('\n' + '─'.repeat(60));
    console.log('📱 MOBILE OTP ID (use this to get OTP from database):');
    console.log(`   ${mobileOtpId}`);
    console.log('─'.repeat(60));
    console.log('💡 Get OTP from MongoDB:');
    console.log(`   db.otps.findOne({_id: ObjectId("${mobileOtpId}")})`);
    console.log('─'.repeat(60));
    
    // Step 3: Wait for user to provide OTP
    let testOtp = process.env.DRIVER_TEST_OTP;
    
    if (!testOtp) {
      console.log('\n⏳ Waiting for you to get OTP from database...');
      console.log('   (You can also set DRIVER_TEST_OTP env variable before running)\n');
      
      // Wait for user to enter OTP
      testOtp = await askQuestion('🔑 Enter the OTP from database: ');
      
      if (!testOtp || testOtp.trim() === '') {
        throw new Error('OTP not provided. Please enter a valid OTP.');
      }
      
      testOtp = testOtp.trim();
      console.log(`\n✓ Using OTP: ${testOtp}\n`);
    } else {
      console.log(`\n🔑 Using OTP from environment variable: ${testOtp}\n`);
    }
    
    await sleep(1000); // Wait for OTP processing
    
    // Step 4: Verify OTP
    const verifyResponse = await axios.post(
      `${BASE_URL}/v1/driver/auth/verify-otp-login`,
      {
        mobileOtpId: mobileOtpId,
        otp: testOtp
      }
    );
    
    if (verifyResponse.data.success) {
      testState.driverToken = verifyResponse.data.results.token;
      testState.driverId = verifyResponse.data.results._id;
      success(`Driver logged in: ${testState.driverId}`);
      return { success: true, data: verifyResponse.data.results };
    }
    
    // Show detailed error
    const errorMsg = verifyResponse.data.message || 'OTP verification failed';
    throw new Error(`Driver OTP verification failed: ${errorMsg} - OTP used: ${testOtp}`);
  } catch (err) {
    error('Driver login failed', err);
    if (err.message.includes('DRIVER_TEST_OTP not set')) {
      console.log('\n💡 TIP: The script will show mobileOtpId above. Use it to get OTP from database.\n');
    }
    return { success: false, error: err };
  }
}

async function estimateRide() {
  try {
    log('STEP 2: Estimate Ride');
    const response = await axios.post(
      `${BASE_URL}/v1/user/ride/estimate`,
      {
        pickupLocation: TEST_LOCATIONS.pickup,
        dropLocation: TEST_LOCATIONS.drop
      },
      {
        headers: { Authorization: `Bearer ${testState.userToken}` }
      }
    );
    
    if (response.data.success) {
      testState.rideId = response.data.results.ride._id;
      success(`Ride estimated: ${testState.rideId}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Ride estimation failed');
  } catch (err) {
    error('Ride estimation failed', err);
    return { success: false, error: err };
  }
}

async function createRide(paymentMethod = 'cash') {
  try {
    log(`STEP 3: Create Ride (${paymentMethod})`);
    const response = await axios.post(
      `${BASE_URL}/v1/user/ride/create/${testState.rideId}`,
      {
        pickupLocation: TEST_LOCATIONS.pickup,
        dropLocation: TEST_LOCATIONS.drop,
        vehicleType: 'mini',
        paymentMethod: paymentMethod
      },
      {
        headers: { Authorization: `Bearer ${testState.userToken}` }
      }
    );
    
    if (response.data.success) {
      testState.rideId = response.data.results.ride._id;
      success(`Ride created: ${testState.rideId}, Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Ride creation failed');
  } catch (err) {
    error('Ride creation failed', err);
    return { success: false, error: err };
  }
}

async function driverAcceptRide() {
  try {
    log('STEP 4: Driver Accept Ride');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/accept`,
      { rideId: testState.rideId },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      testState.otp = response.data.results.otp;
      success(`Driver accepted ride, OTP: ${testState.otp}`);
      return { success: true, data: response.data.results };
    }
    throw new Error('Driver acceptance failed');
  } catch (err) {
    error('Driver acceptance failed', err);
    return { success: false, error: err };
  }
}

async function driverArrived() {
  try {
    log('STEP 5: Driver Arrived');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/arrived`,
      { rideId: testState.rideId },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Driver arrived, Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Driver arrival failed');
  } catch (err) {
    error('Driver arrival failed', err);
    return { success: false, error: err };
  }
}

async function driverStartRide() {
  try {
    log('STEP 6: Driver Start Ride');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/start`,
      {
        rideId: testState.rideId,
        otp: testState.otp
      },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Ride started, Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Ride start failed');
  } catch (err) {
    error('Ride start failed', err);
    return { success: false, error: err };
  }
}

async function driverReachedDestination() {
  try {
    log('STEP 7: Driver Reached Destination');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/reachedDestination`,
      { rideId: testState.rideId },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Reached destination, Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Reached destination failed');
  } catch (err) {
    error('Reached destination failed', err);
    return { success: false, error: err };
  }
}

async function userPaidPayment() {
  try {
    log('STEP 8: User Paid Payment');
    const response = await axios.post(
      `${BASE_URL}/v1/user/ride/paidPayment`,
      { rideId: testState.rideId },
      {
        headers: { Authorization: `Bearer ${testState.userToken}` }
      }
    );
    
    if (response.data.success) {
      success('User marked payment as paid');
      return { success: true, data: response.data };
    }
    throw new Error('User payment failed');
  } catch (err) {
    error('User payment failed', err);
    return { success: false, error: err };
  }
}

async function driverReceivedPayment() {
  try {
    log('STEP 9: Driver Received Payment');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/receivedPayment`,
      { rideId: testState.rideId },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Payment received, Ride Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Driver payment confirmation failed');
  } catch (err) {
    error('Driver payment confirmation failed', err);
    return { success: false, error: err };
  }
}

async function userCancelRide() {
  try {
    log('User Cancel Ride');
    const response = await axios.post(
      `${BASE_URL}/v1/user/ride/cancel`,
      {
        rideId: testState.rideId,
        reason: 'User cancelled via test script'
      },
      {
        headers: { Authorization: `Bearer ${testState.userToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Ride cancelled, Status: ${response.data.results.ride.status}, Cancelled By: ${response.data.results.ride.cancelledBy}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('User cancellation failed');
  } catch (err) {
    error('User cancellation failed', err);
    return { success: false, error: err };
  }
}

async function driverCancelRide() {
  try {
    log('Driver Cancel Ride');
    const response = await axios.post(
      `${BASE_URL}/v1/driver/ride/cancel`,
      {
        rideId: testState.rideId,
        reason: 'Driver cancelled via test script'
      },
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Ride cancelled, Status: ${response.data.results.ride.status}`);
      return { success: true, data: response.data.results.ride };
    }
    throw new Error('Driver cancellation failed');
  } catch (err) {
    error('Driver cancellation failed', err);
    return { success: false, error: err };
  }
}

async function checkDriverAvailability() {
  try {
    const response = await axios.get(
      `${BASE_URL}/v1/driver/ride/available`,
      {
        headers: { Authorization: `Bearer ${testState.driverToken}` }
      }
    );
    
    if (response.data.success) {
      success(`Driver Availability: Available (${response.data.results.rides?.length || 0} rides available)`);
      return { success: true, available: true };
    }
    return { success: false, available: false };
  } catch (err) {
    error('Check driver availability failed', err);
    return { success: false, error: err };
  }
}

async function getRideStatus() {
  try {
    const response = await axios.get(
      `${BASE_URL}/v1/user/ride/get-one`,
      {
        params: { rideId: testState.rideId },
        headers: { Authorization: `Bearer ${testState.userToken}` }
      }
    );
    
    if (response.data.success) {
      const ride = response.data.results?.ride || response.data.results;
      if (ride) {
        success(`Ride Status: ${ride.status}, Cancelled By: ${ride.cancelledBy || 'N/A'}, Payment Method: ${ride.paymentMethod || 'N/A'}`);
        return { success: true, ride };
      }
      return { success: false, error: 'Ride data not found in response' };
    }
    return { success: false, error: response.data };
  } catch (err) {
    error('Get ride status failed', err);
    if (err.response) {
      console.log('Response error:', JSON.stringify(err.response.data, null, 2));
    }
    return { success: false, error: err };
  }
}

// ============================================
// TEST SCENARIOS
// ============================================

async function testScenario1_APICashPayment() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST SCENARIO 1: API CASH PAYMENT FLOW                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    scenario: 'API Cash Payment Flow',
    steps: []
  };
  
  // Login
  let step = await userLogin();
  results.steps.push({ name: 'User Login', success: step.success });
  if (!step.success) return results;
  
  step = await driverLogin();
  results.steps.push({ name: 'Driver Login', success: step.success });
  if (!step.success) return results;
  
  // Create ride
  step = await estimateRide();
  results.steps.push({ name: 'Estimate Ride', success: step.success });
  if (!step.success) return results;
  
  step = await createRide('cash');
  results.steps.push({ name: 'Create Ride (Cash)', success: step.success });
  if (!step.success) return results;
  
  await sleep(1000);
  
  // Driver flow
  step = await driverAcceptRide();
  results.steps.push({ name: 'Driver Accept', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverArrived();
  results.steps.push({ name: 'Driver Arrived', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverStartRide();
  results.steps.push({ name: 'Driver Start', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverReachedDestination();
  results.steps.push({ name: 'Reached Destination', success: step.success });
  if (!step.success) return results;
  
  // Payment flow
  await sleep(500);
  
  step = await userPaidPayment();
  results.steps.push({ name: 'User Paid', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverReceivedPayment();
  results.steps.push({ name: 'Driver Received Payment', success: step.success });
  if (!step.success) return results;
  
  // Verify
  await sleep(500);
  const rideStatus = await getRideStatus();
  results.steps.push({ name: 'Verify Completion', success: rideStatus.success && rideStatus.ride?.status === 'completed' });
  
  await checkDriverAvailability();
  
  results.passed = results.steps.every(s => s.success);
  testState.results.scenario1 = results;
  return results;
}

async function testScenario2_APIWalletPayment() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST SCENARIO 2: API WALLET PAYMENT FLOW                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    scenario: 'API Wallet Payment Flow',
    steps: []
  };
  
  // Login
  let step = await userLogin();
  results.steps.push({ name: 'User Login', success: step.success });
  if (!step.success) return results;
  
  step = await driverLogin();
  results.steps.push({ name: 'Driver Login', success: step.success });
  if (!step.success) return results;
  
  // Create ride
  step = await estimateRide();
  results.steps.push({ name: 'Estimate Ride', success: step.success });
  if (!step.success) return results;
  
  step = await createRide('wallet');
  results.steps.push({ name: 'Create Ride (Wallet)', success: step.success });
  if (!step.success) return results;
  
  await sleep(1000);
  
  // Driver flow
  step = await driverAcceptRide();
  results.steps.push({ name: 'Driver Accept', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverArrived();
  results.steps.push({ name: 'Driver Arrived', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  step = await driverStartRide();
  results.steps.push({ name: 'Driver Start', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  // Wallet auto-completes on reachedDestination
  step = await driverReachedDestination();
  results.steps.push({ name: 'Reached Destination (Auto-complete)', success: step.success });
  if (!step.success) return results;
  
  // Verify auto-completion
  await sleep(500);
  const rideStatus = await getRideStatus();
  results.steps.push({ name: 'Verify Auto-completion', success: rideStatus.success && rideStatus.ride?.status === 'completed' });
  
  await checkDriverAvailability();
  
  results.passed = results.steps.every(s => s.success);
  testState.results.scenario2 = results;
  return results;
}

async function testScenario3_APICancelUser() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST SCENARIO 3: API CANCEL (USER)                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    scenario: 'API Cancel (User)',
    steps: []
  };
  
  // Login
  let step = await userLogin();
  results.steps.push({ name: 'User Login', success: step.success });
  if (!step.success) return results;
  
  // Create ride
  step = await estimateRide();
  results.steps.push({ name: 'Estimate Ride', success: step.success });
  if (!step.success) return results;
  
  step = await createRide('cash');
  results.steps.push({ name: 'Create Ride', success: step.success });
  if (!step.success) return results;
  
  await sleep(1000);
  
  // Cancel
  step = await userCancelRide();
  results.steps.push({ name: 'User Cancel', success: step.success });
  if (!step.success) return results;
  
  // Verify
  await sleep(500);
  const rideStatus = await getRideStatus();
  results.steps.push({ name: 'Verify Cancellation', success: rideStatus.success && rideStatus.ride?.status === 'cancelled' && rideStatus.ride?.cancelledBy === 'user' });
  
  results.passed = results.steps.every(s => s.success);
  testState.results.scenario3 = results;
  return results;
}

async function testScenario4_APICancelDriver() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST SCENARIO 4: API CANCEL (DRIVER)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    scenario: 'API Cancel (Driver)',
    steps: []
  };
  
  // Login
  let step = await userLogin();
  results.steps.push({ name: 'User Login', success: step.success });
  if (!step.success) return results;
  
  step = await driverLogin();
  results.steps.push({ name: 'Driver Login', success: step.success });
  if (!step.success) return results;
  
  // Create ride
  step = await estimateRide();
  results.steps.push({ name: 'Estimate Ride', success: step.success });
  if (!step.success) return results;
  
  step = await createRide('cash');
  results.steps.push({ name: 'Create Ride', success: step.success });
  if (!step.success) return results;
  
  await sleep(1000);
  
  // Driver accepts
  step = await driverAcceptRide();
  results.steps.push({ name: 'Driver Accept', success: step.success });
  if (!step.success) return results;
  
  await sleep(500);
  
  // Driver cancels
  step = await driverCancelRide();
  results.steps.push({ name: 'Driver Cancel', success: step.success });
  if (!step.success) return results;
  
  // Verify
  await sleep(500);
  const rideStatus = await getRideStatus();
  results.steps.push({ name: 'Verify Cancellation', success: rideStatus.success && (rideStatus.ride?.status === 'requested' || rideStatus.ride?.cancelledBy === 'driver') });
  
  await checkDriverAvailability();
  
  results.passed = results.steps.every(s => s.success);
  testState.results.scenario4 = results;
  return results;
}

// ============================================
// SERVER CHECK
// ============================================

async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
    return { running: true };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return { running: false, error: 'Server not running or not accessible' };
    }
    // Server might be running but /health endpoint doesn't exist, try login endpoint
    try {
      await axios.post(`${BASE_URL}/v1/user/login`, {}, { timeout: 2000, validateStatus: () => true });
      return { running: true }; // Server responded (even if login failed)
    } catch (e) {
      return { running: false, error: 'Server not accessible' };
    }
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           COMPREHENSIVE API FLOW TESTING                   ║');
  console.log('║           Testing All Ride Scenarios                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Display MongoDB setup commands
  console.log('\n' + '─'.repeat(60));
  console.log('📝 MONGODB SETUP COMMAND (Run this in MongoDB before tests):');
  console.log('─'.repeat(60));
  console.log('db.drivers.updateOne(');
  console.log('  { mobile: "9876543210" },');
  console.log('  {');
  console.log('    $set: {');
  console.log('      "location.coordinates": [77.2090, 28.6139],');
  console.log('      "location.type": "Point",');
  console.log('      isAvailable: true,');
  console.log('      status: "active",');
  console.log('      registrationStatus: "approved",');
  console.log('      isDeleted: false');
  console.log('    }');
  console.log('  }');
  console.log(')');
  console.log('─'.repeat(60));
  
  // Check if server is running
  console.log('\n🔍 Checking if server is running...');
  const serverCheck = await checkServer();
  
  if (!serverCheck.running) {
    console.log('\n❌ ERROR: Server is not running!');
    console.log('\n💡 Please start your server first:');
    console.log('   npm start');
    console.log('   OR');
    console.log('   nodemon server.js');
    console.log(`\n   Server should be running on: ${BASE_URL}\n`);
    process.exit(1);
  }
  
  success('Server is running');
  
  const allResults = [];
  
  // Run all test scenarios
  allResults.push(await testScenario1_APICashPayment());
  await sleep(2000);
  
  allResults.push(await testScenario2_APIWalletPayment());
  await sleep(2000);
  
  allResults.push(await testScenario3_APICancelUser());
  await sleep(2000);
  
  allResults.push(await testScenario4_APICancelDriver());
  
  // Print summary
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  allResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${index + 1}. ${result.scenario}: ${status}`);
    result.steps.forEach(step => {
      const icon = step.success ? '✓' : '✗';
      console.log(`   ${icon} ${step.name}`);
    });
  });
  
  const passed = allResults.filter(r => r.passed).length;
  const total = allResults.length;
  
  console.log('\n');
  console.log(`Total: ${passed}/${total} scenarios passed`);
  console.log('\n');
  
  return allResults;
}

// ============================================
// RUN TESTS
// ============================================

if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('✅ All tests completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Test execution error:', err);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testScenario1_APICashPayment,
  testScenario2_APIWalletPayment,
  testScenario3_APICancelUser,
  testScenario4_APICancelDriver
};


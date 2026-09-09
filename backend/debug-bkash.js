const axios = require('axios');

const log = (...messages) => {
  process.stdout.write(messages.map((message) => String(message)).join(' ') + '\n');
};

const logError = (...messages) => {
  process.stderr.write(messages.map((message) => String(message)).join(' ') + '\n');
};

// bKash Configuration
const DEFAULT_BKASH_URL = 'https://tokenized.pay.bka.sh/v1.2.0-beta';
const config = {
  baseUrl: process.env.BKASH_BASE_URL || DEFAULT_BKASH_URL,
  appKey: process.env.BKASH_APP_KEY || '',
  appSecret: process.env.BKASH_APP_SECRET || '',
  username: process.env.BKASH_USERNAME || '',
  password: process.env.BKASH_PASSWORD || '',
};

function validateConfig() {
  const missing = [];
  if (!config.appKey) missing.push('BKASH_APP_KEY');
  if (!config.appSecret) missing.push('BKASH_APP_SECRET');
  if (!config.username) missing.push('BKASH_USERNAME');
  if (!config.password) missing.push('BKASH_PASSWORD');

  if (missing.length > 0) {
    throw new Error(`Missing required bKash configuration: ${missing.join(', ')}`);
  }
}

async function testBkashAPI() {
  validateConfig();
  log('🧪 Testing bKash API...');
  log(`Base URL: ${config.baseUrl}`);
  
  try {
    // Test 1: Token Grant
    log('\n1️⃣ Testing token grant...');
    const tokenClient = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': config.username,
        'password': config.password,
        'X-APP-Key': config.appKey,
      },
    });
    
    const tokenResponse = await tokenClient.post('/tokenized/checkout/token/grant', {
      app_key: config.appKey,
      app_secret: config.appSecret,
    });
    
    log('✅ Token grant successful!');
    log(`Token type: ${tokenResponse.data.token_type}`);
    log(`Expires in: ${tokenResponse.data.expires_in} seconds`);
    log(`ID token length: ${tokenResponse.data.id_token?.length || 0}`);
    
    // Test 2: Create Payment
    log('\n2️⃣ Testing payment creation...');
    const paymentClient = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-APP-Key': config.appKey,
        'Authorization': tokenResponse.data.id_token,
      },
    });
    
    const paymentData = {
      mode: '0011',
      payerReference: '8801580356046',
      callbackURL: 'http://localhost:5000/payments/bkash/callback',
      amount: '10.00',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: `test_payment_${Date.now()}`
    };
    
    const paymentResponse = await paymentClient.post('/tokenized/checkout/create', paymentData);
    
    log('✅ Payment creation successful!');
    log(`Payment ID: ${paymentResponse.data.paymentID}`);
    log(`bKash URL: ${paymentResponse.data.bkashURL}`);
    log(`Status: ${paymentResponse.data.transactionStatus}`);
    
  } catch (error) {
    logError('❌ Error:', error instanceof Error ? error.message : String(error));
    
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Status Text: ${error.response.statusText}`);
      logError('Headers:', JSON.stringify(error.response.headers, null, 2));
      logError('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      logError('No response received');
      logError('Request details:', String(error.request));
    } else {
      logError('Request setup error:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Alternative URLs to test
const alternativeUrls = [
  'https://tokenized.pay.bka.sh/v1.2.0-beta',
  'https://tokenized.pay.bka.sh/v1.2.0',
  'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
];

async function testMultipleUrls() {
  log('🔄 Testing multiple bKash API URLs...');
  
  for (const url of alternativeUrls) {
    log(`\n🌐 Testing URL: ${url}`);
    config.baseUrl = url;
    
    try {
      await testBkashAPI();
      log(`✅ Success with URL: ${url}`);
      break;
    } catch (error) {
      log(`❌ Failed with URL: ${url}`);
      log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run the test
testMultipleUrls().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
});

// Test script to validate OAuth callback fix
// This simulates the OAuth callback with the actual token format you provided

function testOAuthDataExtraction(testData) {
  console.log('\n🧪 Testing OAuth data extraction...');
  console.log('Input data:', testData);

  // Extract token and account data from various possible formats
  let token = null;
  let accountId = null;

  // Handle different OAuth response formats
  if (testData.token1) {
    // Format: { token1: "abc123", acct1: "CR123" }
    token = testData.token1;
    accountId = testData.acct1;
    console.log('✅ Used token1/acct1 format');
  } else if (testData.accounts && testData.accounts.length > 0) {
    // Format: { accounts: [{ token: "abc123", loginid: "CR123" }] }
    token = testData.accounts[0].token;
    accountId = testData.accounts[0].loginid;
    console.log('✅ Used accounts array format');
  } else if (testData.access_token) {
    // Format: { access_token: "abc123", account_id: "CR123" }
    token = testData.access_token;
    accountId = testData.account_id;
    console.log('✅ Used access_token format');
  } else if (typeof testData === 'string') {
    // Parse URL-encoded format: "acct1=CR123&token1=abc123"
    const params = new URLSearchParams(testData);
    token = params.get('token1');
    accountId = params.get('acct1');
    console.log('✅ Used URL-encoded string format');
  }

  if (!token) {
    console.error('❌ Token OAuth não encontrado:', testData);
    return { success: false, error: 'Token não encontrado' };
  }

  console.log('✅ Dados OAuth extraídos:', {
    accountId: accountId,
    token: token?.substring(0, 10) + '...',
    is_demo: accountId?.startsWith('VR') || accountId?.startsWith('VRTC')
  });

  return {
    success: true,
    token,
    accountId,
    is_demo: accountId?.startsWith('VR') || accountId?.startsWith('VRTC')
  };
}

// Test Cases
console.log('🔬 OAuth Callback Fix - Test Suite');
console.log('==================================');

// Test 1: Your actual OAuth format
console.log('\n📝 Test 1: Actual OAuth format (token1/acct1)');
const test1 = {
  token1: 'a1-WGXNPlmyn5713Hx1PkqxrHNPYvzox',
  acct1: 'CR6656944'
};
const result1 = testOAuthDataExtraction(test1);
console.log('Result:', result1);

// Test 2: Accounts array format
console.log('\n📝 Test 2: Accounts array format');
const test2 = {
  accounts: [{
    token: 'a1-WGXNPlmyn5713Hx1PkqxrHNPYvzox',
    loginid: 'CR6656944',
    currency: 'USD'
  }]
};
const result2 = testOAuthDataExtraction(test2);
console.log('Result:', result2);

// Test 3: Standard OAuth format
console.log('\n📝 Test 3: Standard OAuth format');
const test3 = {
  access_token: 'a1-WGXNPlmyn5713Hx1PkqxrHNPYvzox',
  account_id: 'CR6656944'
};
const result3 = testOAuthDataExtraction(test3);
console.log('Result:', result3);

// Test 4: URL-encoded string format
console.log('\n📝 Test 4: URL-encoded string format');
const test4 = 'acct1=CR6656944&token1=a1-WGXNPlmyn5713Hx1PkqxrHNPYvzox';
const result4 = testOAuthDataExtraction(test4);
console.log('Result:', result4);

// Test 5: Demo account format
console.log('\n📝 Test 5: Demo account format');
const test5 = {
  token1: 'a1-Demo123456789',
  acct1: 'VRTC1234567'
};
const result5 = testOAuthDataExtraction(test5);
console.log('Result:', result5);

// Test 6: Invalid format
console.log('\n📝 Test 6: Invalid format (should fail)');
const test6 = {
  invalid_field: 'some_value'
};
const result6 = testOAuthDataExtraction(test6);
console.log('Result:', result6);

console.log('\n🎯 Summary');
console.log('=========');
console.log('✅ Test 1 (Your format): ', result1.success ? 'PASS' : 'FAIL');
console.log('✅ Test 2 (Array format): ', result2.success ? 'PASS' : 'FAIL');
console.log('✅ Test 3 (Standard format): ', result3.success ? 'PASS' : 'FAIL');
console.log('✅ Test 4 (URL-encoded): ', result4.success ? 'PASS' : 'FAIL');
console.log('✅ Test 5 (Demo account): ', result5.success ? 'PASS' : 'FAIL');
console.log('❌ Test 6 (Invalid format): ', result6.success ? 'FAIL (Expected)' : 'PASS (Expected failure)');

console.log('\n🚀 OAuth callback fix validation complete!');
console.log('The fix should handle your OAuth tokens correctly.');
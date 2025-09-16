const WebSocket = require('ws');

// Test script to verify Deriv OAuth multi-accounts functionality
// This simulates the fixed OAuth flow

console.log('🧪 Testing Deriv OAuth Multi-Accounts Implementation...\n');

// Replace with actual token from database or OAuth response
const TEST_TOKEN = 'your_deriv_token_here';

function testValidateTokenAndGetAccounts(token) {
  return new Promise((resolve, reject) => {
    console.log('🔗 Connecting to Deriv WebSocket API...');
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=82349');

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout: WebSocket connection took too long'));
    }, 20000);

    let accountData = {};

    ws.onopen = () => {
      console.log('✅ Connected! Sending authorize request...');

      const authorizeRequest = {
        authorize: token,
        req_id: 1
      };

      ws.send(JSON.stringify(authorizeRequest));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log('📨 Response:', { req_id: response.req_id, msg_type: response.msg_type });

        if (response.error) {
          console.error('❌ API Error:', response.error);
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`API error: ${response.error.message}`));
          return;
        }

        if (response.req_id === 1 && response.authorize) {
          console.log('✅ Authorization successful:');
          console.log(`   Account: ${response.authorize.loginid}`);
          console.log(`   Email: ${response.authorize.email}`);
          console.log(`   Currency: ${response.authorize.currency}`);
          console.log(`   Virtual: ${response.authorize.is_virtual}`);

          accountData = {
            loginid: response.authorize.loginid,
            email: response.authorize.email,
            currency: response.authorize.currency,
            country: response.authorize.country,
            is_virtual: response.authorize.is_virtual,
            fullname: response.authorize.fullname,
            token: token
          };

          console.log('\n🔍 Requesting loginid_list...');
          const getAccountListRequest = {
            loginid_list: 1,
            req_id: 3
          };

          ws.send(JSON.stringify(getAccountListRequest));

        } else if (response.req_id === 3 && response.loginid_list) {
          console.log('\n📋 Account List Response:');
          console.log(`   Total accounts found: ${response.loginid_list.length}`);

          let availableAccounts = [];

          if (response.loginid_list && Array.isArray(response.loginid_list)) {
            availableAccounts = response.loginid_list.map(account => {
              const isVirtual = account.loginid && (account.loginid.startsWith('VR') || account.loginid.startsWith('VRTC'));

              return {
                token: token,
                loginid: account.loginid,
                currency: account.currency || 'USD',
                is_virtual: isVirtual,
                account_type: account.account_type || (isVirtual ? 'virtual' : 'real'),
                landing_company_name: account.landing_company_name
              };
            });

            console.log('\n📊 Processed Accounts:');
            availableAccounts.forEach((acc, idx) => {
              console.log(`   ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
            });
          }

          clearTimeout(timeout);
          ws.close();

          const result = {
            ...accountData,
            available_accounts: availableAccounts
          };

          console.log('\n✅ Test completed successfully!');
          console.log(`📊 Summary: Found ${availableAccounts.length} accounts`);

          const realAccounts = availableAccounts.filter(acc => !acc.is_virtual);
          const virtualAccounts = availableAccounts.filter(acc => acc.is_virtual);

          console.log(`   - Real accounts: ${realAccounts.length}`);
          console.log(`   - Virtual accounts: ${virtualAccounts.length}`);

          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error parsing response:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', error);
      reject(new Error('WebSocket connection error'));
    };

    ws.onclose = (code, reason) => {
      clearTimeout(timeout);
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    };
  });
}

// Test account switching functionality
function testAccountSwitch(token, targetLoginId) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Testing account switch to: ${targetLoginId}`);
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=82349');

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout during account switch'));
    }, 10000);

    ws.onopen = () => {
      console.log('🔗 Connected for switch test...');

      const authorizeRequest = {
        authorize: token,
        req_id: 1
      };

      ws.send(JSON.stringify(authorizeRequest));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);

        if (response.error) {
          console.error('❌ Switch error:', response.error);
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Switch error: ${response.error.message}`));
          return;
        }

        if (response.req_id === 1 && response.authorize) {
          console.log('✅ Authorized, attempting switch...');

          const switchRequest = {
            loginid: targetLoginId,
            req_id: 2
          };

          ws.send(JSON.stringify(switchRequest));

        } else if (response.req_id === 2) {
          if (response.error) {
            console.error('❌ Switch failed:', response.error);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Switch failed: ${response.error.message}`));
            return;
          }

          console.log('✅ Switch successful! Verifying...');

          const reauthorizeRequest = {
            authorize: token,
            req_id: 3
          };

          ws.send(JSON.stringify(reauthorizeRequest));

        } else if (response.req_id === 3 && response.authorize) {
          console.log('🎉 Switch verified!');
          console.log(`   New active account: ${response.authorize.loginid}`);
          console.log(`   Account type: ${response.authorize.is_virtual ? 'Virtual' : 'Real'}`);

          clearTimeout(timeout);
          ws.close();
          resolve(response.authorize);
        }
      } catch (parseError) {
        clearTimeout(timeout);
        console.error('❌ Error parsing switch response:', parseError);
        ws.close();
        reject(parseError);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ Switch WebSocket error:', error);
      reject(new Error('Switch WebSocket error'));
    };

    ws.onclose = (code, reason) => {
      clearTimeout(timeout);
      console.log(`🔌 Switch WebSocket closed: ${code} ${reason}`);
    };
  });
}

// Main test function
async function runTests() {
  try {
    if (TEST_TOKEN === 'your_deriv_token_here') {
      console.log('❌ Please replace TEST_TOKEN with an actual Deriv token');
      console.log('💡 You can get this from:');
      console.log('   1. Database: SELECT deriv_access_token FROM users WHERE deriv_connected = true;');
      console.log('   2. Browser OAuth flow in your app');
      return;
    }

    console.log('🧪 Running OAuth Multi-Accounts Tests...\n');

    // Test 1: Validate token and get all accounts
    const accountData = await testValidateTokenAndGetAccounts(TEST_TOKEN);

    if (accountData.available_accounts.length > 1) {
      console.log('\n🧪 Test 2: Account Switching');

      // Find a different account to switch to
      const currentAccount = accountData.loginid;
      const targetAccount = accountData.available_accounts.find(acc => acc.loginid !== currentAccount);

      if (targetAccount) {
        await testAccountSwitch(TEST_TOKEN, targetAccount.loginid);
      } else {
        console.log('⚠️ Only one account found, skipping switch test');
      }
    } else {
      console.log('⚠️ Only one account found, this indicates the issue persists');
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Usage information
console.log('🔧 USAGE:');
console.log('1. Replace TEST_TOKEN with actual Deriv token');
console.log('2. Run: node test-oauth-multi-accounts.js');
console.log('3. Check output for account list and switch functionality\n');

if (require.main === module) {
  runTests();
}

module.exports = {
  testValidateTokenAndGetAccounts,
  testAccountSwitch
};
#!/usr/bin/env node

/**
 * Test script to verify account switching and balance updates work correctly
 * This script tests our implemented fixes for the account switching issue
 */

const WebSocket = require('ws');

// Configuration
const APP_ID = '82349'; // Your Deriv app ID
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;

// Test tokens - you'll need to replace these with real tokens from your OAuth flow
const TEST_ACCOUNTS = [
  {
    name: 'Real Account',
    loginid: 'CR6656944', // Replace with your real account ID
    token: 'YOUR_REAL_ACCOUNT_TOKEN', // Replace with real token
    is_virtual: false
  },
  {
    name: 'Virtual Account',
    loginid: 'VRTC9858183', // Replace with your virtual account ID
    token: 'YOUR_VIRTUAL_ACCOUNT_TOKEN', // Replace with virtual token
    is_virtual: true
  }
];

class AccountSwitchingTest {
  constructor() {
    this.ws = null;
    this.currentAccount = null;
    this.balanceHistory = [];
  }

  async connect() {
    console.log('🔗 Connecting to Deriv WebSocket...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);

      // Handle authorization responses
      if (message.authorize) {
        console.log(`✅ Authorized account: ${message.authorize.loginid}`);
        console.log(`💰 Balance: ${message.authorize.balance} ${message.authorize.currency}`);

        this.currentAccount = {
          loginid: message.authorize.loginid,
          balance: message.authorize.balance,
          currency: message.authorize.currency,
          is_virtual: message.authorize.is_virtual
        };

        this.balanceHistory.push({
          timestamp: new Date().toISOString(),
          account: message.authorize.loginid,
          balance: message.authorize.balance,
          currency: message.authorize.currency,
          event: 'authorization'
        });
      }

      // Handle balance updates
      if (message.balance) {
        console.log(`💰 Balance update: ${message.balance.balance} ${message.balance.currency} (${message.balance.loginid})`);

        this.balanceHistory.push({
          timestamp: new Date().toISOString(),
          account: message.balance.loginid,
          balance: message.balance.balance,
          currency: message.balance.currency,
          event: 'balance_update'
        });
      }

      // Handle account list
      if (message.account_list) {
        console.log('📋 Account list received:');
        message.account_list.forEach(account => {
          console.log(`  - ${account.loginid}: ${account.balance} ${account.currency} (${account.is_virtual ? 'Virtual' : 'Real'})`);
        });
      }

      // Handle errors
      if (message.error) {
        console.error('❌ API Error:', message.error);
      }

    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  async authorize(account) {
    console.log(`🔑 Authorizing ${account.name} (${account.loginid})...`);

    const authRequest = {
      authorize: account.token,
      req_id: Date.now()
    };

    this.ws.send(JSON.stringify(authRequest));

    // Wait for authorization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async subscribeBalance() {
    console.log('📡 Subscribing to balance updates...');

    const balanceRequest = {
      balance: 1,
      subscribe: 1,
      req_id: Date.now()
    };

    this.ws.send(JSON.stringify(balanceRequest));
  }

  async getAccountList() {
    console.log('📋 Requesting account list...');

    const listRequest = {
      account_list: 1,
      req_id: Date.now()
    };

    this.ws.send(JSON.stringify(listRequest));

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async testAccountSwitching() {
    console.log('🧪 Starting Account Switching Test...\n');

    try {
      // Connect to WebSocket
      await this.connect();

      // Test each account
      for (const account of TEST_ACCOUNTS) {
        console.log(`\n🔄 Testing ${account.name}...`);

        // Authorize account
        await this.authorize(account);

        // Subscribe to balance updates
        await this.subscribeBalance();

        // Get account list to verify all accounts
        await this.getAccountList();

        // Wait to observe any balance updates
        console.log('⏳ Waiting for balance updates...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Display test results
      this.displayResults();

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  displayResults() {
    console.log('\n📊 Test Results:');
    console.log('================');

    console.log('\n💰 Balance History:');
    this.balanceHistory.forEach((entry, index) => {
      console.log(`${index + 1}. [${entry.timestamp}] ${entry.account}: ${entry.balance} ${entry.currency} (${entry.event})`);
    });

    // Check if balances are different between accounts
    const realBalances = this.balanceHistory.filter(h => !h.account.startsWith('VRT'));
    const virtualBalances = this.balanceHistory.filter(h => h.account.startsWith('VRT'));

    if (realBalances.length > 0 && virtualBalances.length > 0) {
      const realBalance = realBalances[realBalances.length - 1].balance;
      const virtualBalance = virtualBalances[virtualBalances.length - 1].balance;

      if (realBalance !== virtualBalance) {
        console.log('✅ SUCCESS: Different balances detected between accounts');
        console.log(`   Real Account Balance: ${realBalance}`);
        console.log(`   Virtual Account Balance: ${virtualBalance}`);
      } else {
        console.log('❌ ISSUE: Same balance for both accounts (this indicates the switching issue)');
      }
    }

    console.log('\n✅ Test completed');
  }
}

// Run the test
if (require.main === module) {
  const test = new AccountSwitchingTest();
  test.testAccountSwitching().catch(console.error);
}

module.exports = AccountSwitchingTest;
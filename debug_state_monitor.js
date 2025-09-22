// Debug State Monitor - Paste this in browser console
console.log('🔍 STATE MONITOR: Starting debug session...');

// Monitor AuthContext state
const monitorAuthState = () => {
  console.log('📊 CURRENT AUTH STATE:', {
    'user exists': !!window.authDebug?.user,
    'user.deriv_connected': window.authDebug?.user?.deriv_connected,
    'availableAccounts.length': window.authDebug?.availableAccounts?.length || 0,
    'currentAccount': window.authDebug?.currentAccount?.loginid || null,
    'localStorage.deriv_connected': localStorage.getItem('deriv_connected'),
    'localStorage.deriv_account_data': localStorage.getItem('deriv_account_data')
  });
};

// Run every 2 seconds
setInterval(monitorAuthState, 2000);

// Check API response directly
fetch('/api/auth/deriv/status', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('🔍 API /deriv/status response:', data);
})
.catch(err => console.error('❌ API Error:', err));
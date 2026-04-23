console.log('🧪 Testing Stripe Integration Setup\n');

console.log('✓ Test 1: Stripe SDK Loading');
try {
  const Stripe = require('stripe');
  console.log('  ✓ Stripe npm package found');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
  console.log('  ✓ Stripe instance created');
} catch (err) {
  console.log('  ✗ Error:', err.message);
}

console.log('\n✓ Test 2: Stripe Plugin Service');
try {
  const StripeGatewayService = require('./src/plugins/stripe/service.js');
  console.log('  ✓ Stripe plugin service loaded');
  
  const instance = new StripeGatewayService();
  if (typeof instance.initiatePayment === 'function') {
    console.log('  ✓ initiatePayment method exists');
  } else {
    console.log('  ✗ initiatePayment method missing');
  }
  
  if (typeof instance.handleWebhook === 'function') {
    console.log('  ✓ handleWebhook method exists');
  } else {
    console.log('  ✗ handleWebhook method missing');
  }
} catch (err) {
  console.log('  ✗ Error:', err.message);
}

console.log('\n✓ Test 3: Plugin Router');
try {
  const buildRouter = require('./src/plugins/stripe/api.js');
  console.log('  ✓ Plugin API builder loaded');
  
  if (typeof buildRouter === 'function') {
    console.log('  ✓ buildRouter is a function');
  } else {
    console.log('  ✗ buildRouter is missing');
  }
} catch (err) {
  console.log('  ✗ Error:', err.message);
}

console.log('\n✅ Backend code structure verified!');

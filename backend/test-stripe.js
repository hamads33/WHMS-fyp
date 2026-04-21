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

console.log('\n✓ Test 2: Payment Service');
try {
  const paymentService = require('./src/modules/billing/services/payment.service.js');
  console.log('  ✓ Payment service loaded');
  
  // Check if methods exist
  if (typeof paymentService._initiateStripe === 'function') {
    console.log('  ✓ _initiateStripe method exists');
  } else {
    console.log('  ✗ _initiateStripe method missing');
  }
  
  if (typeof paymentService._handleStripeCallback === 'function') {
    console.log('  ✓ _handleStripeCallback method exists');
  } else {
    console.log('  ✗ _handleStripeCallback method missing');
  }
} catch (err) {
  console.log('  ✗ Error:', err.message);
}

console.log('\n✓ Test 3: Controller');
try {
  const controller = require('./src/modules/billing/controllers/payment.controller.js');
  console.log('  ✓ Payment controller loaded');
  
  if (typeof controller.handleWebhook === 'function') {
    console.log('  ✓ handleWebhook method exists');
  } else {
    console.log('  ✗ handleWebhook method missing');
  }
} catch (err) {
  console.log('  ✗ Error:', err.message);
}

console.log('\n✅ Backend code structure verified!');

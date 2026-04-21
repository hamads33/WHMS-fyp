# Stripe Checkout Integration Setup Guide

## 📋 Prerequisites

- Stripe account (create at https://dashboard.stripe.com)
- Stripe CLI installed (https://stripe.com/docs/stripe-cli)
- Both backend and frontend running locally

---

## 🔧 Step 1: Get Stripe API Keys

1. Go to **Stripe Dashboard** → **Developers** → **API Keys**
2. Copy your **Secret Key** (`sk_test_...`)
3. Copy your **Publishable Key** (`pk_test_...`)

---

## 🌍 Step 2: Configure Backend Environment

Edit `/backend/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🌐 Step 3: Configure Frontend Environment

Edit `/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Step 4: Set Up Stripe Webhook (Local Testing)

In a **separate terminal**, install and run Stripe CLI:

```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Start webhook forwarding
stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe
```

This will output:
```
> Ready! Your webhook signing secret is: whsec_test_xxxxxxxxxxxxx
```

Copy the `whsec_...` secret and add to `/backend/.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

## ✅ Step 5: Start Services

### Backend (Terminal 1)
```bash
cd backend
npm install  # Stripe was already installed
npm start
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

### Stripe CLI (Terminal 3)
```bash
stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe
```

---

## 🧪 Step 6: Test the Flow

### Test Card Numbers

Use any **future expiry date** and **any 3-digit CVC**:

| Scenario | Card Number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Requires 3D Auth | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 9995` |

### Checkout Flow

1. Open http://localhost:3000/store
2. Browse and add plans to cart
3. Click **Continue to checkout**
4. Create account or login
5. Select **"Credit / Debit Card (via Stripe)"** payment method
6. Click **Pay → [amount]**
7. You'll be redirected to Stripe's hosted checkout
8. Use test card `4242 4242 4242 4242`
9. Fill in any future expiry + any 3-digit CVC
10. After payment:
   - Stripe redirects back to `/store/checkout?status=success&session_id=...`
   - Payment is confirmed and invoice marked as **PAID**
   - Order automatically activates
   - User sees success page

---

## 🔍 Debugging

### Backend Logs
Watch for Stripe errors:
```bash
# Terminal 1 (backend)
# Look for payment processing logs
```

### Webhook Events
Check Stripe Dashboard → Developers → Webhooks → Events for delivery status:
```
checkout.session.completed ✓
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Webhook signature verification failed | Ensure `STRIPE_WEBHOOK_SECRET` is correct from `stripe listen` output |
| No `checkoutUrl` returned | Backend missing `NEXT_PUBLIC_APP_URL` env var |
| Payment not appearing in Stripe Dashboard | Ensure all 3 terminals (backend, frontend, stripe-cli) are running |
| "Invalid API key" error | Copy correct `STRIPE_SECRET_KEY` (starts with `sk_test_`) |

---

## 📁 Key Files Modified

### Backend
- `src/modules/billing/services/payment.service.js` — Stripe SDK + methods
- `src/app.js` — Raw middleware for webhooks

### Frontend
- `src/app/store/checkout/store-checkout.jsx` — Stripe integration + redirect handling
- `src/lib/api/store.js` — StoreAPI client
- `.env.local` — Stripe keys

---

## 🎯 What Happens After Payment

1. Stripe webhook fires: `checkout.session.completed`
2. Backend verifies webhook signature
3. Payment recorded via `paymentService.create()`
4. Invoice marked as **PAID**
5. Order status changes from `pending` → `active`
6. Provisioning hooks triggered (auto-setup hosting)
7. Receipt email sent to customer
8. Frontend shows success page

---

## 🚨 Production Checklist

Before going live:

- [ ] Switch to **Live Keys** (remove `_test_`)
- [ ] Update `STRIPE_WEBHOOK_SECRET` to live signing secret
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Test with real cards (small amounts)
- [ ] Enable HTTPS/SSL
- [ ] Monitor Stripe Dashboard → Events for errors
- [ ] Set up email notifications in Stripe Dashboard

---

## 📚 References

- Stripe Checkout Docs: https://stripe.com/docs/checkout
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe Test Card Numbers: https://stripe.com/docs/testing

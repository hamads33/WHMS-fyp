# Plugin Pricing Flow — Testing Guide

## Quick Verification Checklist

### 1. Form Syntax & Structure ✓
- [x] Upload form has pricing section (Pricing tab)
- [x] Free/Paid toggle (isFree checkbox)
- [x] Price input field (shown only when not free)
- [x] License type dropdown (Commercial/Personal/Open Source)
- [x] Form validation includes pricing validation

### 2. Form Submission Logic ✓
- [x] `onSubmit` function implemented (not empty)
- [x] Step 1: Create plugin
- [x] Step 2: Upload icon
- [x] Step 3: Upload screenshots
- [x] Step 4: Upload plugin file
- [x] Step 5: Update pricing
- [x] Loading states & progress feedback
- [x] Toast notifications for each step

### 3. Pricing Data Transformation ✓
- [x] Price converted from dollars to cents: `parseFloat(data.price) * 100`
- [x] License type mapped to pricing type: `commercial → one_time`
- [x] Only updates pricing if `isFree` is false and price > 0

### 4. Backend Integration ✓
- [x] `PATCH /developer/plugins/:id/pricing` endpoint exists
- [x] Endpoint properly validates pricingType and price
- [x] Service method `updatePluginPricing()` implemented
- [x] Prisma update saves to database

### 5. Database Schema ✓
- [x] `pricingType` column in MarketplaceProduct
- [x] `price` column (integer, in cents)
- [x] `currency` column
- [x] `interval` column (for subscriptions)

---

## Manual Testing Steps

### Scenario 1: Create Free Plugin
1. Go to `/developer/upload`
2. Fill all required fields
3. Keep "Free Plugin" checkbox **checked**
4. Price field should be **hidden**
5. Submit form
6. Should redirect to `/developer` with success message
7. Check DB: `pricingType = 'free'`, `price = 0`

### Scenario 2: Create Paid Plugin ($9.99)
1. Go to `/developer/upload`
2. Fill all required fields
3. **Uncheck** "Free Plugin" checkbox
4. Price field should appear
5. Enter `9.99` in price field
6. Select "Commercial" from License Type
7. Submit form
8. Wait for notifications:
   - "Plugin created successfully!"
   - "Icon uploaded" (if icon provided)
   - "Pricing information saved" ← KEY NOTIFICATION
   - "✓ Plugin submitted for review!"
9. Check DB: 
   - `pricingType = 'one_time'`
   - `price = 999` (cents)
   - `currency = 'USD'`

### Scenario 3: Validation - Price Required
1. Go to `/developer/upload`
2. Uncheck "Free Plugin"
3. Leave price field empty
4. Try to click "Submit for Review" button
5. Should see form validation error: "Price is required and must be greater than 0 for paid plugins"

### Scenario 4: Validation - Price > 0
1. Go to `/developer/upload`
2. Uncheck "Free Plugin"
3. Enter "0" in price field
4. Try to submit
5. Should see validation error

---

## API Endpoint Testing

### Test Pricing Update Directly
```bash
# 1. Create a test plugin first
PLUGIN_ID=$(curl -s -X POST http://localhost:4000/api/developer/plugins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Pricing Test",
    "slug": "pricing-test",
    "description": "Test",
    "author": "Tester"
  }' | jq -r '.data.id')

echo "Created plugin: $PLUGIN_ID"

# 2. Update pricing
curl -s -X PATCH http://localhost:4000/api/developer/plugins/$PLUGIN_ID/pricing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pricingType": "one_time",
    "price": 2999,
    "currency": "USD"
  }' | jq .
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "slug": "pricing-test",
    "pricingType": "one_time",
    "price": 2999,
    "currency": "USD",
    ...
  }
}
```

---

## Database Verification

### Check Saved Pricing
```sql
SELECT 
  id,
  name,
  slug,
  pricingType,
  price,
  currency,
  interval,
  status,
  createdAt
FROM "MarketplaceProduct"
WHERE slug = 'pricing-test'
LIMIT 1;
```

Expected output:
```
id          | test-id-123
name        | Pricing Test
slug        | pricing-test
pricingType | one_time
price       | 2999
currency    | USD
interval    | (null)
status      | draft
createdAt   | 2026-04-07 10:14:00
```

---

## Integration Points

### Marketplace Display
Once pricing is saved, plugins should appear in marketplace with:
- Free plugins: Green "Free" badge
- One-time: Blue "$X" badge  
- Subscription: Purple "$X/month" badge

**File:** `frontend/src/components/marketplace/PluginCard.jsx`

### Purchase Flow
When user tries to install paid plugin:
1. Dialog shows price
2. "Confirm Purchase & Install" button appears
3. On purchase, `POST /api/marketplace/plugins/:id/purchase` called
4. On success, install proceeds

**File:** `frontend/src/app/marketplace/marketplace-client.js`

### Revenue Tracking
When purchase recorded:
1. `MarketplacePurchase` record created
2. `MarketplaceProduct.totalRevenue` updated
3. `MarketplaceProduct.salesCount` incremented
4. `PluginStatsService.recordSale()` called

**File:** `backend/src/modules/plugin-marketplace/plugin-billing.service.js`

### Developer Analytics
Developer can see pricing impact:
- Total Revenue (sum of all sales)
- Sales Count (number of purchases)
- Revenue over time chart

**File:** `frontend/src/app/(developer)/developer/analytics/analytics-client.js`

---

## Troubleshooting

### Issue: Price field doesn't appear when unchecking Free Plugin
**Check:**
- Is the form properly watching `isFree` field?
- Is the conditional render working? `{!form.watch("isFree") && ...}`
- Check browser console for React errors

### Issue: Pricing not saved after submit
**Check:**
- Did you see "Pricing information saved" toast?
- Is PATCH request reaching the backend? (Check network tab)
- Is pricing update endpoint returning 200?
- Check backend logs for errors

### Issue: Database shows price = 0 instead of 999
**Check:**
- Is price conversion working? `Math.round(parseFloat(data.price) * 100)`
- Is the backend saving the converted value?
- Check that pricingType is not "free"

### Issue: Validation prevents submit but shouldn't
**Check:**
- Is price > 0?
- Is price a valid number?
- Is form being submitted properly via `form.handleSubmit(onSubmit)`?

---

## Success Criteria

✅ User can create free plugin  
✅ User can create paid plugin with pricing  
✅ Form validates price is required for paid plugins  
✅ Form converts price dollars → cents  
✅ PATCH endpoint saves pricing to database  
✅ Database query confirms pricing saved  
✅ Marketplace displays price badges correctly  
✅ Purchase flow blocks non-buyers from installing  
✅ Revenue tracking records sales  
✅ Analytics show correct revenue totals  

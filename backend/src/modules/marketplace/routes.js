const express = require('express');

const productCtrl = require('./controllers/product.controller');
const versionCtrl = require('./controllers/version.controller');
const purchaseCtrl = require('./controllers/purchase.controller');
const installCtrl = require('./controllers/install.controller');
const reviewCtrl = require('./controllers/review.controller');
const sellerCtrl = require('./controllers/seller.controller');
const sellerDashboardCtrl = require('./controllers/sellerDashboard.controller');
const sellerAnalyticsCtrl = require('./controllers/sellerAnalytics.controller');
const submissionCtrl = require('./controllers/submission.controller');
const adminCtrl = require('./controllers/admin.controller');
const searchCtrl = require('./controllers/search.controller');
const licenseCtrl = require('./controllers/license.controller');
const analyticsCtrl = require('./controllers/analytics.controller');
const webhookEndpointCtrl = require('./controllers/webhookEndpoint.controller');
const payoutCtrl = require('./controllers/adminPayout.controller');
const buildLogCtrl = require('./controllers/buildLog.controller');
const adminAnalyticsCtrl = require('./controllers/adminAnalytics.controller');

const upload = require('./uploader/pluginUpload');

const router = express.Router();

/* ------------------------------------
 * PUBLIC MARKETPLACE
 * ----------------------------------*/
router.get('/products', productCtrl.listPublic);
router.get('/products/search', productCtrl.searchPublic);
router.get('/products/:slug', productCtrl.getBySlug);
router.get('/products/:productId/versions', versionCtrl.list);
router.get('/products/:productId/reviews', reviewCtrl.list);

/* ------------------------------------
 * SELLER (NEW FINAL FIX)
 * ----------------------------------*/

// Seller profile (M1)
router.get("/seller/me", sellerCtrl.me);

// Create seller (M2)
router.post("/seller/apply", sellerCtrl.apply);

// Dashboard (M3–M5)
router.get("/seller/dashboard/overview", sellerDashboardCtrl.getOverview);
router.get("/seller/dashboard/products", sellerDashboardCtrl.getProductsStats);
router.get("/seller/dashboard/submissions", sellerDashboardCtrl.getSubmissions);

// Analytics (M6–M7)
router.get("/seller/analytics/overview", sellerAnalyticsCtrl.overview);
router.get("/seller/analytics/:productId/crashes", sellerAnalyticsCtrl.crashes);
router.get("/seller/analytics/product/:productId/perf", sellerAnalyticsCtrl.perf);

// Webhooks (M8–M9)
router.post("/seller/webhooks", webhookEndpointCtrl.create);
router.get("/seller/webhooks", webhookEndpointCtrl.list);
router.put("/seller/webhooks/:endpointId", webhookEndpointCtrl.update);
router.delete("/seller/webhooks/:endpointId", webhookEndpointCtrl.delete);

// Payouts (M10–M11)
router.post("/seller/payouts/request", sellerDashboardCtrl.requestPayout);
router.get("/seller/payouts", payoutCtrl.listPayouts);

/* ------------------------------------
 * VERSION UPLOAD (UC-M6, UC-M8)
 * ----------------------------------*/
router.post(
  '/seller/products/:productId/version',
  upload.single('zip'),
  versionCtrl.upload
);

/* ------------------------------------
 * PURCHASE & LICENSE (UC-M5)
 * ----------------------------------*/
router.post('/purchase/:productId', purchaseCtrl.purchase);
router.get('/licenses/me', licenseCtrl.listMine);
router.post('/license/validate', licenseCtrl.validate);

/* ------------------------------------
 * INSTALL PLUGIN (UC-M3)
 * ----------------------------------*/
router.post('/install/:productId', installCtrl.install);

/* ------------------------------------
 * REVIEWS (UC-M10)
 * ----------------------------------*/
router.post('/products/:productId/review', reviewCtrl.add);

/* ------------------------------------
 * ADMIN SUBMISSIONS (UC-M8)
 * ----------------------------------*/
router.get('/admin/submissions', submissionCtrl.list);
router.post('/admin/submissions/:submissionId/approve', submissionCtrl.approve);
router.post('/admin/submissions/:submissionId/reject', submissionCtrl.reject);

/* ------------------------------------
 * ADMIN PRODUCT CONTROLS (UC-M8)
 * ----------------------------------*/
router.get('/admin/products', adminCtrl.listProducts);
router.post('/admin/products/:productId/approve', adminCtrl.approveProduct);
router.post('/admin/products/:productId/reject', adminCtrl.rejectProduct);

/* ------------------------------------
 * SEARCH & ANALYTICS (UC-M9)
 * ----------------------------------*/
router.get('/search', searchCtrl.search);
router.post('/analytics/event', analyticsCtrl.track);

/* ------------------------------------
 * UPDATE CHECKS (UC-M4)
 * ----------------------------------*/
router.get('/updates/check', versionCtrl.checkUpdates);
router.post('/updates/install/:productId', versionCtrl.installUpdate);

/* ------------------------------------
 * BUILD LOGS (UC-M11)
 * ----------------------------------*/
router.get('/admin/build-logs/submission/:submissionId', buildLogCtrl.listForSubmission);
router.get('/seller/build-logs/product/:productId', buildLogCtrl.listForProduct);
router.get('/submissions/:submissionId/logs/tail', buildLogCtrl.tail);
router.get('/build-logs/:id', buildLogCtrl.get);

/* ------------------------------------
 * ADMIN ANALYTICS (UC-M9)
 * ----------------------------------*/
router.get('/admin/analytics/top-plugins', adminAnalyticsCtrl.topPlugins);
router.get('/admin/analytics/product/:productId/trends', adminAnalyticsCtrl.productTrends);

module.exports = router;

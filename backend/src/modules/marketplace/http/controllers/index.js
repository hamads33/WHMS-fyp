// // src/modules/marketplace/http/controllers/index.js
// module.exports = function buildControllers(deps) {
//   return {
//     public: {
//       browseProducts: require("./browse-products.controller")(deps),
//       getProductDetails: require("./get-product-details.controller")(deps),
//       addReview: require("./add-review.controller")(deps),
//     },

//     version: {
//       uploadVersion: require("./upload-version.controller")(deps),
//       submitVersion: require("./submit-version.controller")(deps),
//       verifyVersion: require("./verify-plugin.controller")(deps),
//     },

//     product: {
//       create: require("./create-product.controller")(deps),
//       update: require("./update-product-info.controller")(deps),
//     },

//     purchase: {
//       purchasePlugin: require("./purchase-plugin.controller")(deps),
//       validateLicense: require("./validate-license.controller")(deps),
//     },

//     admin: {
//       listSubmissions: require("./admin/list-submissions.controller")(deps),
//       approveSubmission: require("./admin/approve-submission.controller")(deps),
//       rejectSubmission: require("./admin/reject-submission.controller")(deps),

//       listProducts: require("./admin/list-products.controller")(deps),
//       approveProduct: require("./admin/approve-product.controller")(deps),
//       rejectProduct: require("./admin/reject-product.controller")(deps),

//       buildLogsForSubmission: require("./admin/build-logs.controller")(deps),
//       topPlugins: require("./admin/top-plugins.controller")(deps),
//       productTrends: require("./admin/product-trends.controller")(deps),
//     },

//     versionCheck: require("./check-updates.controller")(deps),

//     seller: {
//       dashboard: require("./seller/dashboard.controller")(deps),
//       payouts: require("./seller/payout.controller")(deps),
//     }
//   };
// };

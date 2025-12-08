// browse-products.controller.js
module.exports = ({ browseProducts }) => {
  return async (req, res, next) => {
    try {
      const data = await browseProducts.execute();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
};

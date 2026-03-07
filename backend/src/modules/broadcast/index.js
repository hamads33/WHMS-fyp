const adminRoutes = require('./routes/admin.broadcast.routes');
const clientRoutes = require('./routes/client.broadcast.routes');

module.exports = {
  admin: adminRoutes,
  client: clientRoutes,
};

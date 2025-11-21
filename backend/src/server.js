require('dotenv').config();

// ✅ FIX: import the express app correctly
const { app, init } = require('./app');  

const PORT = process.env.PORT || 4000;

const emailRoutes = require('./modules/email/email.routes');

// ❗ must wait for init() BEFORE using app.use()
(async () => {
  await init();   // initialize automation, backup, etc.

  // your original line kept EXACTLY:
  app.use('/api/v1/email', emailRoutes);

  app.listen(PORT, () => 
    console.log(`Server running on http://localhost:${PORT}`)
  );
})();

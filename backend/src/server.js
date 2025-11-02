
require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4000;

const emailRoutes = require('./modules/email/email.routes');
app.use('/api/v1/email', emailRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

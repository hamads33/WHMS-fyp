require('dotenv').config()
const app = require('./app')
const PORT = process.env.PORT || 4000


const emailController = require('./controllers/emailController');
app.use('/api/v1/email', emailController);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

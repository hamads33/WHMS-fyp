// src/app.js
const express = require('express');
const cors = require('cors');            // <-- add
const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_ORIGIN,              // or '*' for quick test
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true                     // set true if you use cookies/auth
}));

app.use(express.json());

const authRoutes = require('./modules/auth/auth.routes');
app.use('/api/auth', authRoutes);
app.use('/api/v1/clients', require('./modules/clients/clients.routes'));

// global error logger or middleware as needed

module.exports = app;


// // src/app.js
// const express = require('express')
// const app = express()
// app.use(express.json())

// const authRoutes = require('./routes/auth.routes')
// app.use('/api/auth', authRoutes)

// // global error logger or middleware as needed

// module.exports = app







// const express = require('express')
// const cors = require('cors')
// const helmet = require('helmet')
// const pinoHttp = (() => { try { return require('pino-http') } catch (e) { return () => (req,res,next)=>next() }})()
// const authRoutes = require('./routes/auth.routes')
//  const clientsRoutes = require('./routes/clients.routes')
// // const servicesRoutes = require('./routes/services.routes') // optional placeholder
// // const ticketsRoutes = require('./routes/tickets.routes')   // optional placeholder
// // const auditRoutes = require('./routes/audit.routes')       // optional placeholder

// const app = express()

// app.use(helmet())
// app.use(cors({ origin: 'http://localhost:5173' })) // frontend origin
// app.use(express.json())
// app.use(pinoHttp({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }))

// app.use('/api/auth', authRoutes)
// //app.use('/api/clients', clientsRoutes)
// // mount placeholders if you implement them later:
// // app.use('/api/services', servicesRoutes)
// // app.use('/api/tickets', ticketsRoutes)
// // app.use('/api/audit', auditRoutes)

// app.get('/', (req, res) => res.json(console.log("hum")))

// // error handler
// app.use((err, req, res, next) => {
//   console.error(err)
//   res.status(500).json({ message: 'Internal Server Error' })
// })

// module.exports = app

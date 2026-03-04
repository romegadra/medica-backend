import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { router } from './routes/index.js'
import { errorHandler, notFound } from './middleware/errors.js'

dotenv.config()

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3001

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', router)

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`medBackend listening on port ${port}`)
})

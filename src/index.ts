import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { router } from './routes/index.js'
import { errorHandler, notFound } from './middleware/errors.js'

dotenv.config()

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3001

app.use(cors())
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

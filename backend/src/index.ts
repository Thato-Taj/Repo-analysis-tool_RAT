import express from 'express'
import cors from 'cors'
import { PORT, ensureDirs } from './config.js'
import { loadDb } from './store.js'
import router, { errorHandler, notFoundHandler } from './routes.js'

ensureDirs()
loadDb()

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/api', router)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`RAT backend listening on http://localhost:${PORT}`)
})

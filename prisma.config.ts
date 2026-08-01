import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/infra/prisma',
  migrations: {
    path: 'src/infra/prisma/migrations'
  },
  datasource: {
    url: process.env['DATABASE_URL']
  }
})

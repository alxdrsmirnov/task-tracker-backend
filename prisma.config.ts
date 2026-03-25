import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/common/infra/prisma',
  migrations: {
    path: 'src/common/infra/prisma/migrations'
  },
  datasource: {
    url: process.env['DATABASE_URL']
  }
})

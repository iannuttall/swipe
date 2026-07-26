import { loadConfig, runMigrations } from '@email/core'

const config = loadConfig()
const result = await runMigrations({ databaseUrl: config.databaseUrl })

console.log(JSON.stringify(result, null, 2))

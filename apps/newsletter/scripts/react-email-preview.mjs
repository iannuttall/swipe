import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const build = spawn('pnpm', ['--filter', '@email/core', 'build'], {
  env: process.env,
  stdio: 'inherit',
})

const buildCode = await new Promise((resolve) => {
  build.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    resolve(code ?? 0)
  })
})

if (buildCode !== 0) process.exit(Number(buildCode))

const entry = fileURLToPath(import.meta.resolve('react-email'))
const cli = join(dirname(entry), 'cli/index.mjs')
const args = process.argv.slice(2)
const previewArgs = args.length
  ? args
  : ['dev', '--dir', 'emails', '--port', process.env.EMAIL_PREVIEW_PORT ?? '3333']

const child = spawn(process.execPath, [cli, ...previewArgs], {
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})

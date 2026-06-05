import path from 'path'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
  })
}

/**
 * Dev-only: serve POST /api/audit during `vite dev` using the same engine the
 * Vercel function uses, so the audit lead magnet is testable without `vercel dev`.
 */
function auditDevEndpoint(): Plugin {
  return {
    name: 'redcube-audit-dev-endpoint',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/audit', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        res.setHeader('content-type', 'application/json')
        try {
          const body = JSON.parse((await readBody(req)) || '{}')
          const mod = await server.ssrLoadModule('/src/lib/seo/audit.ts')
          const result = await (mod.runAudit as (u: string) => Promise<unknown>)(body.url ?? '')
          res.statusCode = 200
          res.end(JSON.stringify(result))
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Audit failed' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), auditDevEndpoint()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

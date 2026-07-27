import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { FakePlatform } from './fake-platform.test-helper.js'
import { createMcpServer } from './index.js'

describe('confirmation MCP tools', () => {
  it('discovers confirmation tools and guards migration preparation', async () => {
    const server = createMcpServer({ platform: new FakePlatform() })
    const client = new Client({ name: 'test-client', version: '0.1.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const tools = await client.listTools()
    assert.ok(tools.tools.some((tool) => tool.name === 'email_prepare_confirmations'))
    assert.ok(
      tools.tools.some((tool) => tool.name === 'email_unsubscribe_unconfirmed_migration'),
    )

    const result = await client.callTool({
      name: 'email_prepare_confirmations',
      arguments: {
        confirm: false,
        batchKey: 'swipe-migration-2026',
        expiresAt: '2099-08-03T00:00:00.000Z',
      },
    })
    assert.equal(result.isError, true)

    await client.close()
    await server.close()
  })
})

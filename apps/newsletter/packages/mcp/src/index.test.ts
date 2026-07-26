import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { FakePlatform } from './fake-platform.test-helper.js'
import { createMcpServer } from './index.js'

describe('mcp server', () => {
  it('lists tools and calls subscribe over MCP', async () => {
    const platform = new FakePlatform()
    const server = createMcpServer({ platform })
    const client = new Client({ name: 'test-client', version: '0.1.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const tools = await client.listTools()
    assert.ok(tools.tools.some((tool) => tool.name === 'email_subscribe'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_send_due'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_get_contact_analytics'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_get_link_insights'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_get_link_summary'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_tag_contact'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_record_purchase'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_preview_audience'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_preview_send_plan'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_create_canary'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_promote_canary'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_get_canary'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_rebuild_analytics_rollups'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_export_contacts'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_doctor'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_get_ops_checklist'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_recover_stuck_messages'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_list_templates'))
    assert.ok(tools.tools.some((tool) => tool.name === 'email_render_template'))

    const response = await client.callTool({
      name: 'email_subscribe',
      arguments: { email: 'ian@example.com' },
    })

    assert.equal(platform.subscribedEmail, 'ian@example.com')
    const content = response.content as Array<{ type: string; text?: string }>
    assert.equal(content[0]?.type, 'text')
    assert.deepEqual(JSON.parse(content[0]?.text ?? ''), {
      id: 'contact_1',
    })

    await client.callTool({
      name: 'email_record_purchase',
      arguments: {
        email: 'ian@example.com',
        provider: 'stripe',
        externalId: 'pi_123',
        productKey: 'prompt-stack',
        amountCents: 50000,
        currency: 'USD',
      },
    })
    assert.equal(platform.recordedPurchase?.productKey, 'prompt-stack')

    const rendered = await client.callTool({
      name: 'email_render_template',
      arguments: {
        subject: 'Rendered',
        bodyMarkdown: 'Read [this](https://example.com).',
        template: 'default',
      },
    })
    const renderedContent = rendered.content as Array<{ text?: string }>
    const renderedBody = JSON.parse(renderedContent[0]?.text ?? '')
    assert.match(renderedBody.html, /https:\/\/example.com/)

    const unconfirmedSend = await client.callTool({
      name: 'email_send_test',
      arguments: {
        confirm: false,
        draftId: 'draft_1',
        to: 'ian@example.com',
      },
    })
    assert.equal(unconfirmedSend.isError, true)
    const unconfirmedContent = unconfirmedSend.content as Array<{ text?: string }>
    assert.deepEqual(JSON.parse(unconfirmedContent[0]?.text ?? ''), {
      error: 'confirm must be true',
    })

    await client.close()
    await server.close()
  })
})

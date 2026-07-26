import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { describe, it } from 'node:test'
import {
  buildSnsStringToSign,
  confirmSnsSubscription,
  isAllowedAwsUrl,
  isAllowedSnsSigningCertUrl,
  isAllowedSnsTopic,
  type SnsMessage,
  verifySnsSignature,
} from './sns-verification.js'

describe('SNS verification', () => {
  it('verifies a version 2 SNS signature', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    })
    const message: SnsMessage = {
      Type: 'Notification',
      MessageId: 'sns-1',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:email',
      Message: '{"notificationType":"Bounce"}',
      Timestamp: '2026-06-20T00:00:00.000Z',
      SignatureVersion: '2',
      SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService.pem',
    }
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(buildSnsStringToSign(message), 'utf8')
    signer.end()
    message.Signature = signer.sign(privateKey, 'base64')

    const verified = await verifySnsSignature(message, {
      allowedCertHostSuffixes: ['amazonaws.com'],
      fetchCertificate: async () =>
        publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    })

    assert.equal(verified, true)
  })

  it('rejects unsafe certificate URLs', async () => {
    assert.equal(
      isAllowedSnsSigningCertUrl('http://sns.us-east-1.amazonaws.com/cert.pem', [
        'amazonaws.com',
      ]),
      false,
    )
    assert.equal(
      isAllowedSnsSigningCertUrl(
        'https://sns.us-east-1.amazonaws.com.evil.test/cert.pem',
        ['amazonaws.com'],
      ),
      false,
    )
    assert.equal(
      isAllowedSnsSigningCertUrl('https://sns.us-east-1.amazonaws.com/cert.txt', [
        'amazonaws.com',
      ]),
      false,
    )
    assert.equal(
      isAllowedSnsSigningCertUrl(
        'https://s3.us-east-1.amazonaws.com/SimpleNotificationService.pem',
        ['amazonaws.com'],
      ),
      false,
    )
    assert.equal(
      isAllowedSnsSigningCertUrl(
        'https://sns.us-east-1.amazonaws.com/nested/SimpleNotificationService.pem',
        ['amazonaws.com'],
      ),
      false,
    )
  })

  it('allows only configured topics when a topic allowlist is present', () => {
    assert.equal(isAllowedSnsTopic(undefined, []), false)
    assert.equal(isAllowedSnsTopic('arn:allowed', ['arn:allowed']), true)
    assert.equal(isAllowedSnsTopic('arn:other', ['arn:allowed']), false)
  })

  it('confirms subscription requests only through allowed HTTPS hosts', async () => {
    const message: SnsMessage = {
      Type: 'SubscriptionConfirmation',
      MessageId: 'sns-2',
      TopicArn: 'arn:topic',
      Message: 'confirm',
      Timestamp: '2026-06-20T00:00:00.000Z',
      Token: 'token',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
    }
    let fetchedUrl: string | undefined

    const confirmed = await confirmSnsSubscription(message, {
      allowedSubscribeHostSuffixes: ['amazonaws.com'],
      fetchUrl: async (url) => {
        fetchedUrl = url
        return new Response('ok', { status: 200 })
      },
    })

    assert.equal(confirmed, true)
    assert.equal(fetchedUrl, message.SubscribeURL)
    assert.equal(
      isAllowedAwsUrl('https://sns.us-east-1.amazonaws.com.evil.test', ['amazonaws.com']),
      false,
    )
    assert.equal(
      await confirmSnsSubscription(
        { ...message, SubscribeURL: 'https://s3.us-east-1.amazonaws.com/' },
        {
          allowedSubscribeHostSuffixes: ['amazonaws.com'],
          fetchUrl: async () => new Response('ok', { status: 200 }),
        },
      ),
      false,
    )
  })
})

export interface DoctorReport {
  appName: string
  env: string
  provider: string
  baseUrl: string
  databaseConfigured: boolean
  fromEmailConfigured: boolean
  apiAuthConfigured: boolean
  trackingConfigured: boolean
  unsubscribeConfigured: boolean
  confirmationConfigured: boolean
  snsWebhookConfigured: boolean
  snsTopicAllowlistConfigured: boolean
  ready: boolean
}

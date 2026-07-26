import { escapeHtml } from './responses.js'

export function unsubscribePage(appName: string, state: 'confirm' | 'done') {
  const escapedName = escapeHtml(appName)
  const title =
    state === 'confirm'
      ? `Unsubscribe from ${escapedName}`
      : `Unsubscribed from ${escapedName}`
  const body =
    state === 'confirm'
      ? `<p>You can leave ${escapedName} with one click.</p><form method="post"><button type="submit">Confirm unsubscribe</button></form>`
      : `<p>You have been unsubscribed from ${escapedName}.</p>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f8fafc; color:#111; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
      main { width:min(100% - 32px, 520px); background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:32px; }
      .brand { margin:0 0 24px; font:14px Menlo,Consolas,monospace; }
      h1 { margin:0 0 12px; font-size:28px; line-height:1.2; }
      p { margin:0 0 24px; color:#444; font-size:16px; line-height:1.6; }
      button { appearance:none; border:0; border-radius:6px; background:#111; color:#fff; padding:10px 14px; font:600 15px inherit; cursor:pointer; }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">${escapedName}</p>
      <h1>${title}</h1>
      ${body}
    </main>
  </body>
</html>`
}

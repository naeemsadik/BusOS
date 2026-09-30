import http from 'node:http'

const host = '127.0.0.1'
const port = Number(process.env.BUSOS_MOCK_PROVIDER_PORT || 5199)

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`)
  response.setHeader('content-type', 'application/json; charset=utf-8')

  if (url.pathname === '/health') {
    response.end(JSON.stringify({ status: 'ok', provider: 'busos-demo-mock' }))
    return
  }
  if (url.pathname.includes('/failure')) {
    response.statusCode = 503
    response.end(JSON.stringify({ status: 'failed', message: 'Deterministic mocked provider failure' }))
    return
  }

  response.statusCode = 200
  response.end(JSON.stringify({
    status: 'success',
    paymentID: 'MOCK-PAYMENT-001',
    trxID: 'MOCK-TRANSACTION-001',
    messageId: 'MOCK-SMS-001',
    data: { output_text: '{"headline":"Safe mocked AI response"}' },
  }))
})

server.listen(port, host, () => {
  process.stdout.write(`BusOS mock providers listening on http://${host}:${port}\n`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}

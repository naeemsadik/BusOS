import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

class NoSkipReporter implements Reporter {
  private skipped: string[] = []

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'skipped') this.skipped.push(test.titlePath().join(' > '))
  }

  onEnd(_result: FullResult) {
    if (this.skipped.length === 0) return
    process.stderr.write(`Unexpected skipped demonstration tests:\n${this.skipped.map(name => `- ${name}`).join('\n')}\n`)
    process.exitCode = 1
  }
}

export default NoSkipReporter

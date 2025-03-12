import { type Runner, reporters } from 'mocha'
import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
} from '../types/ctrf'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import md5 from 'md5'

interface Options {
  reporter: string
  reporterOptions: ReporterOptions
  'reporter-option': ReporterOptions
}

interface ReporterOptions {
  outputFile?: string
  outputDir?: string
  minimal?: boolean
  screenshot?: boolean
  testType?: string
  appName?: string | undefined
  appVersion?: string | undefined
  osPlatform?: string | undefined
  osRelease?: string | undefined
  osVersion?: string | undefined
  buildName?: string | undefined
  buildNumber?: string | undefined
  buildUrl?: string | undefined
  repositoryName?: string | undefined
  repositoryUrl?: string | undefined
  branchName?: string | undefined
  testEnvironment?: string | undefined
}

class GenerateCtrfReport extends reporters.Base {
  private readonly ctrfReport: CtrfReport
  readonly ctrfEnvironment: CtrfEnvironment
  private readonly reporterOptions: ReporterOptions
  readonly reporterName = 'mocha-ctrf-json-reporter'
  readonly defaultOutputFile = 'ctrf-report.json'
  readonly defaultOutputDir = 'ctrf'
  filename = this.defaultOutputFile
  private readonly projectRoot = process.cwd()
  private readonly mocharcJsPath = join(this.projectRoot, '.mocharc.js')
  private readonly mocharcJsonPath = join(this.projectRoot, '.mocharc.json')

  constructor(runner: Runner, options: Options) {
    super(runner)
    this.reporterOptions = this.getReporterOptions(options)
    this.reporterOptions = {
      outputFile: this.reporterOptions?.outputFile ?? this.defaultOutputFile,
      outputDir: this.reporterOptions?.outputDir ?? this.defaultOutputDir,
      appName: this.reporterOptions?.appName ?? undefined,
      appVersion: this.reporterOptions?.appVersion ?? undefined,
      osPlatform: this.reporterOptions?.osPlatform ?? undefined,
      osRelease: this.reporterOptions?.osRelease ?? undefined,
      osVersion: this.reporterOptions?.osVersion ?? undefined,
      buildName: this.reporterOptions?.buildName ?? undefined,
      buildNumber: this.reporterOptions?.buildNumber ?? undefined,
      buildUrl: this.reporterOptions?.buildUrl ?? undefined,
      repositoryName: this.reporterOptions?.repositoryName ?? undefined,
      repositoryUrl: this.reporterOptions?.repositoryUrl ?? undefined,
      branchName: this.reporterOptions?.branchName ?? undefined,
      testEnvironment: this.reporterOptions?.testEnvironment ?? undefined,
    }

    this.ctrfReport = {
      results: {
        tool: {
          name: 'mocha',
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          skipped: 0,
          other: 0,
          start: 0,
          stop: 0,
        },
        tests: [],
      },
    }

    this.ctrfEnvironment = {}

    if (this.reporterOptions?.outputFile !== undefined)
      this.setFilename(this.reporterOptions.outputFile)

    if (!existsSync(this.reporterOptions.outputDir ?? this.defaultOutputDir)) {
      mkdirSync(this.reporterOptions.outputDir ?? this.defaultOutputDir, {
        recursive: true,
      })
    }

    runner
      .on('start', this.handleStart.bind(this))
      .on('pass', this.handleTestEnd.bind(this))
      .on('pending', this.handleTestEnd.bind(this))
      .on('fail', this.handleTestEnd.bind(this))
      .on('end', this.handleEnd.bind(this))
  }

  handleStart(): void {
    this.ctrfReport.results.summary.start = Date.now()
    this.setEnvironmentDetails(this.reporterOptions ?? {})
    if (this.hasEnvironmentDetails(this.ctrfEnvironment)) {
      this.ctrfReport.results.environment = this.ctrfEnvironment
    }
  }

  handleTestEnd(test: Mocha.Test, err?: Error): void {
    if (err != null) {
      test.err = err
    }
    this.updateCtrfTestResultsFromTest(test, this.ctrfReport)
    this.updateCtrfTotalsFromTest(test, this.ctrfReport)
  }

  handleEnd(): void {
    this.ctrfReport.results.summary.stop = Date.now()
    this.writeReportToFile(this.ctrfReport)
  }

  private updateCtrfTestResultsFromTest(
    testCase: Mocha.Test,
    ctrfReport: CtrfReport
  ): void {
    const status = testCase.state ?? 'other'
    const endTime = Date.now()
    const duration = testCase.duration ?? 0
    const startTime = endTime - duration
    const currentRetry = (testCase as any).currentRetry()

    const test: CtrfTest = {
      name: testCase.fullTitle(),
      status,
      duration: testCase.duration ?? 0,
      retries: currentRetry,
      flaky: testCase.state === 'passed' && currentRetry > 0,
      filePath: testCase.file,
      rawStatus: testCase.state,
      start: startTime,
      stop: Date.now(),
    }

    if (testCase.state === 'failed' && testCase.err != null) {
      const failureDetails = this.extractFailureDetails(testCase)
      test.message = failureDetails.message
      test.trace = failureDetails.trace
    }

    ctrfReport.results.tests.push(test)
  }

  private getReporterOptions(options: Options): ReporterOptions {
    if (existsSync(this.mocharcJsPath)) {
      return this.getReporterOptionsFromMocharcJs(this.mocharcJsPath)
    }
    if (existsSync(this.mocharcJsonPath)) {
      return this.getReporterOptionsFromMocharcJson(this.mocharcJsonPath)
    } else {
      return this.getReporterOptionsFromCommandLine(options)
    }
  }

  private getReporterOptionsFromMocharcJs(filePath: string): ReporterOptions {
    const mochaConfig = require(filePath)

    return mochaConfig.reporterOptions ?? {}
  }

  private getReporterOptionsFromMocharcJson(filePath: string): ReporterOptions {
    const fileContent = readFileSync(filePath, 'utf-8')
    const mochaConfig = JSON.parse(fileContent)

    return mochaConfig.reporterOptions ?? {}
  }

  private getReporterOptionsFromCommandLine(options: Options): ReporterOptions {
    return options.reporterOptions ?? options['reporter-option'] ?? {}
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  private updateCtrfTotalsFromTest(
    test:
      | Mocha.Test
      | {
          state?: 'failed' | 'passed' | 'pending' | 'skipped' | undefined
        },
    ctrfReport: CtrfReport
  ): void {
    ctrfReport.results.summary.tests++

    switch (test.state) {
      case 'passed':
        ctrfReport.results.summary.passed++
        break
      case 'failed':
        ctrfReport.results.summary.failed++
        break
      case 'pending':
        ctrfReport.results.summary.pending++
        break
      case 'skipped':
        ctrfReport.results.summary.skipped++
        break
      default:
        ctrfReport.results.summary.other++
        break
    }
  }

  private setEnvironmentDetails(reporterConfigOptions: ReporterOptions): void {
    if (reporterConfigOptions.appName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.appName
    }
    if (reporterConfigOptions.appVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.appVersion
    }
    if (reporterConfigOptions.osPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.osPlatform
    }
    if (reporterConfigOptions.osRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.osRelease
    }
    if (reporterConfigOptions.osVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.osVersion
    }
    if (reporterConfigOptions.buildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.buildName
    }
    if (reporterConfigOptions.buildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber = reporterConfigOptions.buildNumber
    }
    if (reporterConfigOptions.buildUrl !== undefined) {
      this.ctrfEnvironment.buildUrl = reporterConfigOptions.buildUrl
    }
    if (reporterConfigOptions.repositoryName !== undefined) {
      this.ctrfEnvironment.repositoryName = reporterConfigOptions.repositoryName
    }
    if (reporterConfigOptions.repositoryUrl !== undefined) {
      this.ctrfEnvironment.repositoryUrl = reporterConfigOptions.repositoryUrl
    }
    if (reporterConfigOptions.branchName !== undefined) {
      this.ctrfEnvironment.branchName = reporterConfigOptions.branchName
    }
    if (reporterConfigOptions.testEnvironment !== undefined) {
      this.ctrfEnvironment.testEnvironment =
        reporterConfigOptions.testEnvironment
    }
  }

  private hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: Mocha.Test): Partial<CtrfTest> {
    if (testResult.state === 'failed' && testResult.err !== undefined) {
      const failureDetails: Partial<CtrfTest> = {}
      if (testResult.err.message !== undefined) {
        failureDetails.message = `${testResult.err.name} ${testResult.err.message}`
      }
      if (testResult.err.stack !== undefined) {
        failureDetails.trace = testResult.err.stack
      }
      return failureDetails
    }
    return {}
  }

  private writeReportToFile(data: CtrfReport): void {
    let filename = this.reporterOptions.outputFile ?? this.defaultOutputFile
    if (filename.includes('[hash]')) {
      filename = filename.replace('[hash]', md5(JSON.stringify(data)))
    }

    const filePath = join(
      this.reporterOptions.outputDir ?? this.defaultOutputDir,
      filename
    )

    const str = JSON.stringify(data, null, 2)
    try {
      writeFileSync(filePath, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s/%s`,
        this.reporterOptions.outputDir,
        this.reporterOptions.outputFile
      )
    } catch (error) {
      console.error(`Error writing ctrf json report:, ${String(error)}`)
    }
  }
}

export = GenerateCtrfReport

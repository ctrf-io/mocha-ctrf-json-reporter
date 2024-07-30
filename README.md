# Mocha JSON test results report

> Save Mocha test results as a JSON file

A Mocha JSON test reporter to create test reports that follow the CTRF standard.

[Common Test Report Format](https://ctrf.io) ensures the generation of uniform JSON test reports, independent of programming languages or test framework in use.

## Help us grow CTRF

⭐ **If you find this project useful, please consider following the [CTRF organisation](https://github.com/ctrf-io) and giving this repository a star** ⭐

**It means a lot to us and helps us grow this open source library.**

## Features

- Generate JSON test reports that are [CTRF](https://ctrf.io) compliant
- Straightforward integration with Mocha

```json
{
  "results": {
    "tool": {
      "name": "mocha"
    },
    "summary": {
      "tests": 1,
      "passed": 1,
      "failed": 0,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "ctrf should generate the same report with any tool",
        "status": "passed",
        "duration": 100
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyBuild",
      "buildNumber": "1"
    }
  }
}
```

## Installation

```bash
npm install --save-dev mocha-ctrf-json-reporter
```

You can configure Mocha to use mocha-ctrf-json-reporter in several ways: through .mocharc.js, .mocharc.json, or via the command line. Below are the instructions for each method:

Update your .mocharc.js file as follows:

```javascript
module.exports = {
  reporter: 'mocha-ctrf-json-reporter',
}
```

Using .mocharc.json, update your config file as follows:

```json
{
  "reporter": "mocha-ctrf-json-reporter"
}
```

Run your tests as you normally would:

```bash
npx mocha
```

You'll find a JSON file named `ctrf-report.json` in the `ctrf` directory.

You can also specify the reporter from the command line:

```bash
mocha --reporter mocha-ctrf-json-reporter
```

## Reporter Options

The reporter supports several configuration options, update your .mocharc.js

```javascript
{
  reporter: "mocha-ctrf-json-reporter",
  reporterOptions: {
    outputFile: 'custom-name.json', // Optional: Output file name. Defaults to 'ctrf-report.json'.
    outputDir: 'custom-directory',  // Optional: Output directory path. Defaults to 'ctrf'.
    appName: 'MyApp',               // Optional: Specify the name of the application under test.
    appVersion: '1.0.0',            // Optional: Specify the version of the application under test.
    osPlatform: 'linux',            // Optional: Specify the OS platform.
    osRelease: '18.04',             // Optional: Specify the OS release version.
    osVersion: '5.4.0',             // Optional: Specify the OS version.
    buildName: 'MyApp Build',       // Optional: Specify the build name.
    buildNumber: '100',             // Optional: Specify the build number.
    buildName: 'MyApp Build',       // Optional: Specify the build name.
    buildUrl: "https://ctrf.io",    // Optional: Specify the build url.
    repositoryName: "ctrf-json",    // Optional: Specify the repository name.
    repositoryUrl: "https://gh.io", // Optional: Specify the repository url.
    branchName: "main",             // Optional: Specify the branch name.
    testEnvironment: "staging"      // Optional: Specify the test environment (e.g. staging, production).
  }
},

```

For .mocharc.json

```json
{
  "reporter": "mocha-ctrf-json-reporter",
  "reporterOptions": {
    "outputFile": "custom-name.json"
  }
}
```

Alternatively, you can pass the reporter options via the command line when running your Mocha tests. Use the --reporter-options flag followed by the options in a key=value format, separated by commas:

```bash
npx mocha --reporter mocha-ctrf-json-reporter --reporter-options "outputFile=custom-name.json,outputDir=custom-directory,appName=MyApp,appVersion=1.0.0"
```

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name        | Type    | Required | Details                                                                             |
| ----------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `name`      | String  | Required | The name of the test.                                                               |
| `status`    | String  | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration`  | Number  | Required | The time taken for the test execution, in milliseconds.                             |
| `message`   | String  | Optional | The failure message if the test failed.                                             |
| `trace`     | String  | Optional | The stack trace captured if the test failed.                                        |
| `start`     | Number  | Optional | The start time of the test as a Unix epoch timestamp.                               |
| `stop`      | Number  | Optional | The end time of the test as a Unix epoch timestamp.                                 |
| `rawStatus` | String  | Optional | The original playwright status of the test before mapping to CTRF status.           |
| `filePath`  | String  | Optional | The file path where the test is located in the project.                             |
| `retries`   | Number  | Optional | The number of retries attempted for the test.                                       |
| `flaky`     | Boolean | Optional | Indicates whether the test result is flaky.                                         |

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## Support Us

If you find this project useful, consider giving it a GitHub star ⭐ It means a lot to us.

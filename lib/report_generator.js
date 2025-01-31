import fs from 'fs';
import path from 'path';


////////////////////////////////////////////////////////////////
// 2) Aggregate / build data for the HTML template placeholders
////////////////////////////////////////////////////////////////
export function buildReportData(testResults, testSuiteName) {
  // Overall stats
  let totalTests = 0;
  let totalPassedTests = 0;
  let totalFailedTests = 0;
  let totalSkippedTests = 0; // If skipping is part of your logic

  // We'll also build the table rows for the "Detailed Test Case Results"
  let testCaseRowsHtml = '';

  testResults.forEach((tc) => {
    totalTests += 1;
    
    // If ANY assertion fails => the test case as a whole fails
    const allAssertionsPass = tc.assertions.every(a => a.passed);
    const testCasePassed = allAssertionsPass;
    if (testCasePassed) {
      totalPassedTests += 1;
    } else {
      totalFailedTests += 1;
    }

    // Build an HTML snippet showing each assertion
    const assertionsList = tc.assertions.map(a => {
      const statusText = a.passed ? 'PASS' : 'FAIL';
      const badgeClass = a.passed ? 'badge-pass' : 'badge-fail';
      return `
        <li>
          ${a.assertion}: 
          <span class="${badgeClass}">${statusText}</span><br>
          <code>${a.message}</code>
        </li>
      `;
    }).join('');

    // Build one table row per testCase
    testCaseRowsHtml += `
      <tr>
        <td>${tc.testCase}</td>
        <td>—</td> <!-- Placeholder if you want to show tags -->
        <td>
          <ul>${assertionsList}</ul>
        </td>
        <td>${testCasePassed ? 'PASS' : 'FAIL'}</td>
        <td>00:00:00</td>
      </tr>
    `;
  });

  // For the top "All Tests" row
  const total = totalTests;
  const pass = totalPassedTests;
  const fail = totalFailedTests;
  const skip = totalSkippedTests;
  
  // Progress bar logic (percentage)
  const passPercent = (pass / total) * 100 || 0;
  const failPercent = (fail / total) * 100 || 0;
  const skipPercent = (skip / total) * 100 || 0;

  const overallPassed = fail === 0;
  const statusText = overallPassed ? 'All tests passed' : 'Some tests failed';
  const statusClass = overallPassed ? 'status-passed' : 'status-failed';
  const now = new Date().toLocaleDateString();

  // Return an object with placeholders
  return {
    STATUS_CLASS: statusClass,
    STATUS_TEXT: statusText,
    START_TIME: now,
    END_TIME: now,
    ELAPSED_TIME: '00:00:00.000',
    LOG_FILE: 'log.html',

    ALL_TESTS_TOTAL: total,
    ALL_TESTS_PASS: pass,
    ALL_TESTS_FAIL: fail,
    ALL_TESTS_SKIP: skip,
    ALL_TESTS_ELAPSED: '00:00:00',
    ALL_TESTS_PASS_PERCENT: passPercent.toFixed(0),
    ALL_TESTS_FAIL_PERCENT: failPercent.toFixed(0),
    ALL_TESTS_SKIP_PERCENT: skipPercent.toFixed(0),

    // If you want to show tags or suite info, you can build them similarly
    TAGS_ROWS: `
      <tr>
        <td>—</td>
        <td>${total}</td>
        <td>${pass}</td>
        <td>${fail}</td>
        <td>${skip}</td>
        <td>00:00:00</td>
        <td>
          <div class="progress-container">
            <div class="progress-bar-pass" style="width: ${passPercent}%"></div>
            <div class="progress-bar-fail" style="width: ${failPercent}%"></div>
            <div class="progress-bar-skip" style="width: ${skipPercent}%"></div>
          </div>
        </td>
      </tr>
    `,
    SUITE_ROWS: `
      <tr>
        <td>${testSuiteName}</td>
        <td>${total}</td>
        <td>${pass}</td>
        <td>${fail}</td>
        <td>${skip}</td>
        <td>00:00:00</td>
        <td>
          <div class="progress-container">
            <div class="progress-bar-pass" style="width: ${passPercent}%"></div>
            <div class="progress-bar-fail" style="width: ${failPercent}%"></div>
            <div class="progress-bar-skip" style="width: ${skipPercent}%"></div>
          </div>
        </td>
      </tr>
    `,

    TEST_CASE_ROWS: testCaseRowsHtml,

    GENERATED_TIME: now,
  };
}

////////////////////////////////////////////////////////////////
// 3) HTML Template (Light Mode, Robot-Like)
////////////////////////////////////////////////////////////////
const lightReportTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>IBGRoboot Test Suite Report</title>
  <style>
    body {
      margin: 0; padding: 0;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background-color: #fefefe;
      color: #333;
    }
    h1, h2, h3 {
      margin: 0.75em 0 0.5em;
      font-weight: 600;
    }
    .header, .footer {
      padding: 10px 20px;
      background-color: #e9e9e9;
    }
    .content {
      padding: 20px;
    }
    .badge-pass {
    display: inline-block;
    padding: 2px 6px;
    background-color: #4caf50;
    color: #fff;
    border-radius: 3px;
    /* font-weight: bold; */
    font-size: 13px;
    }

    .badge-fail {
          display: inline-block;
    padding: 2px 6px;
    background-color: #f44336;
    color: #fff;
    border-radius: 3px;
    /* font-weight: bold; */
    font-size: 13px;
    }
    .summary-info p {
      margin: 0.2em 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f3f3f3;
    }
    .status-passed {
      color: #4caf50;
      font-weight: 600;
    }
    .status-failed {
      color: #f44336;
      font-weight: 600;
    }
    .progress-container {
      height: 15px;
      background-color: #e0e0e0;
      margin: 0.3em 0;
      position: relative;
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-bar-pass {
      background-color: #4caf50;
      height: 100%;
      float: left;
    }
    .progress-bar-fail {
      background-color: #f44336;
      height: 100%;
      float: left;
    }
    .progress-bar-skip {
      background-color: #ff9800;
      height: 100%;
      float: left;
    }
    ul {
      margin: 0; padding-left: 20px;
    }
    .footer p {
      margin: 0.2em 0;
      font-size: 0.95em;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>IBGRoboot Test Suite Report</h1>
  </div>

  <div class="content">
    <!-- Summary Information -->
    <div class="summary-info">
      <h2>Summary Information</h2>
      <p>Status: <span class="{{STATUS_CLASS}}">{{STATUS_TEXT}}</span></p>
      <p>Start Time: {{START_TIME}}</p>
      <p>End Time: {{END_TIME}}</p>
      <p>Elapsed Time: {{ELAPSED_TIME}}</p>
      <p>Log File: <a href="{{LOG_FILE}}" target="_blank">{{LOG_FILE}}</a></p>
    </div>

    <!-- Test Statistics -->
    <h2>Test Statistics</h2>
    <table>
      <thead>
        <tr>
          <th>Total Statistics</th>
          <th>Total</th>
          <th>Pass</th>
          <th>Fail</th>
          <th>Skip</th>
          <th>Elapsed</th>
          <th>Pass / Fail / Skip</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>All Tests</td>
          <td>{{ALL_TESTS_TOTAL}}</td>
          <td>{{ALL_TESTS_PASS}}</td>
          <td>{{ALL_TESTS_FAIL}}</td>
          <td>{{ALL_TESTS_SKIP}}</td>
          <td>{{ALL_TESTS_ELAPSED}}</td>
          <td>
            <div class="progress-container">
              <div class="progress-bar-pass" style="width: {{ALL_TESTS_PASS_PERCENT}}%"></div>
              <div class="progress-bar-fail" style="width: {{ALL_TESTS_FAIL_PERCENT}}%"></div>
              <div class="progress-bar-skip" style="width: {{ALL_TESTS_SKIP_PERCENT}}%"></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>


    <!-- Statistics by Suite -->
    <table>
      <thead>
        <tr>
          <th>Statistics by Suite</th>
          <th>Total</th>
          <th>Pass</th>
          <th>Fail</th>
          <th>Skip</th>
          <th>Elapsed</th>
          <th>Pass / Fail / Skip</th>
        </tr>
      </thead>
      <tbody>
        {{SUITE_ROWS}}
      </tbody>
    </table>

    <!-- Detailed Test Case Table -->
    <h2>Detailed Test Case Results</h2>
    <table>
      <thead>
        <tr>
          <th>Test Case</th>
          <th>Tags</th>
          <th>Assertions</th>
          <th>Status</th>
          <th>Elapsed</th>
        </tr>
      </thead>
      <tbody>
        {{TEST_CASE_ROWS}}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated {{GENERATED_TIME}}</p>
  </div>
</body>
</html>
`;

////////////////////////////////////////////////////////////////
// 4) Generate the final HTML from placeholders
////////////////////////////////////////////////////////////////
export function generateReportHtml(reportData) {
  let html = lightReportTemplate;
  Object.keys(reportData).forEach((key) => {
    const placeholder = `{{${key}}}`;
    html = html.replaceAll(placeholder, reportData[key]);
  });
  return html;
}

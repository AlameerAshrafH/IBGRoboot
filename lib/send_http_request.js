import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { runAssertions } from "./assertion_response.js";

/**
 * buildHeaders - Converts the headers array from .ibgrobot into an object that Axios can consume.
 * @param {Array<{ key: string; value: string }>} headersArr
 * @returns {Record<string, string>} Key-value pairs for headers
 */
function buildHeaders(headersArr) {
  const result = {};
  headersArr.forEach(({ key, value }) => {
    result[key] = value;
  });
  return result;
}

/**
 * sendHTTPRequest - Sends HTTP requests for each test case, with an optional
 *   "stateful pre-script" that runs once before everything, which can mutate
 *   global "headers" and "data".
 *
 * @param {object} ibgrobotData - The entire parsed .ibgrobot object
 * @returns {Array} An array of { testCase, assertions } results
 */
export async function sendHTTPRequest(ibgrobotData) {
  const {
    url,
    method,
    headers = [],
    testCases = [],
    suite_pre_script,
    suite_post_script,
  } = ibgrobotData;

  let baseHeaders = buildHeaders(headers);

  let globalData = null;

  // Run Stateful Pre-suite-script
  if (suite_pre_script) {
    try {
      const preScriptModule = await importWithResolvedPath(suite_pre_script);

      const statefulPreFn =
        preScriptModule.default || preScriptModule.statefulPreScript;

      if (typeof statefulPreFn !== "function") {
        console.warn(
          `[Stateful Pre-suite-script] Module "${suite_pre_script}" does not export a valid function. Skipping.`
        );
      } else {

        const result = await statefulPreFn({
          headers: baseHeaders,
          data: globalData,
        });
        console.log(result);

        if (result) {
          if (result.headers) {
            baseHeaders = buildHeaders(result.headers);
          }
          if (result.data) {
            globalData = result.data;
          }
        }

        console.log(`[Stateful Pre-suite-script]  Completed. Headers/Data possibly updated.`);
      }
    } catch (err) {
      console.error(
        `[Stateful Pre-Script] Error importing or running script "${suite_pre_script}": ${err.message}`
      );
    }
  }

  const results = [];
  for (const testCase of testCases) {
    try {
      console.log(`\n=== Running Test Case: ${testCase.description} ===`);

      const config = {
        method: method || "GET",
        url,
        headers: { ...baseHeaders },
      };

      // If method is not GET, set a request body
      // (combine globalData + testCase body if that suits your logic)
      if (config.method.toUpperCase() !== "GET") {
        let finalBody = globalData ? { ...globalData } : {};

        const bodyParam = testCase.parameters?.find((p) => p.key === "body");
        if (bodyParam) {
          const caseBody = JSON.parse(bodyParam.value);
          finalBody = { ...finalBody, ...caseBody };
        }

        config.data = finalBody;
      }

      // 5) Send HTTP request
      const response = await axios(config);
      console.log(`Running Assertions ======`);

      let assertionResults = await runAssertions(
        response.data,
        testCase.expected_results
      );
      
      results.push({
        testCase: testCase.description,
        assertions: assertionResults,
      });

      console.log(`=== Completed Test Case: ${testCase.description} ===\n`);
    } catch (error) {
      console.error(
        `Error in Test Case "${testCase.description}":`,
        error.message
      );
    }
  }

  // Run Stateful Post-suite-script
  if (suite_post_script) {
    try {
      const postScriptModule = await importWithResolvedPath(suite_post_script);

      const statelessPreFn =
        postScriptModule.default || preScriptModule.statelessPostScript;

      if (typeof statelessPreFn !== "function") {
        console.warn(
          `[Stateless Post-suite-script] Module "${suite_post_script}" does not export a valid function. Skipping.`
        );
      } else {

        await statelessPreFn();
        console.log(`[Stateless Post-suite-script]  Completed. Headers/Data possibly updated.`);
      }
    } catch (err) {
      console.error(
        `[Stateless Pre-Script] Error importing or running script "${suite_pre_script}": ${err.message}`
      );
    }
  }

  return results;
}

/**
 * importWithResolvedPath - Utility to handle relative or absolute paths in ESM.
 * Adjust as needed for your environment.
 */
async function importWithResolvedPath(relativeOrAbsolutePath) {
  if (
    relativeOrAbsolutePath.startsWith("file:") ||
    path.isAbsolute(relativeOrAbsolutePath)
  ) {
    return import(relativeOrAbsolutePath);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fullPath = path.join(__dirname, relativeOrAbsolutePath);
  return import(fullPath);
}
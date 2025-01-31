import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Parses a .ibgrobot file containing YAML data.
 *
 * @param {string} filePath - The path to the .ibgrobot file
 * @returns {object|null} - An object containing parsed data or null if parsing fails
 */
export function parseIbgrobotConfiguration(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = yaml.load(fileContent);
  
      const {
        name,
        url,
        method,
        headers,
        suite_pre_script,
        suite_post_script,
        test_cases: testCases = [],
      } = data || {};
  
      return { name, url, method, headers, suite_pre_script, suite_post_script, testCases };
    } catch (err) {
      console.error(`Error parsing .ibgrobot file at "${filePath}": ${err.message}`);
      return null;
    }
  }
  
import { parseIbgrobotConfiguration } from "./lib/parse_structured_ibgrobot.js";
import { buildReportData, generateReportHtml } from "./lib/report_generator.js";
import { sendHTTPRequest } from "./lib/send_http_request.js";
import path from 'path';
import fs from 'fs';
import figlet from 'figlet';
import chalk from 'chalk';


async function main() {
  drawLogo();
  await new Promise(resolve => setTimeout(resolve, 5000));
  const filePath = path.join(process.cwd(), "/examples/validate_placeholder_post.ibgroboot.yaml");
  const data = parseIbgrobotConfiguration(filePath);

  if (!data) {
    console.error("Failed to parse the .ibgrobot file. Exiting...");
    return;
  }
  const testResults = await sendHTTPRequest(data);

  const reportData = buildReportData(testResults, data['name']);
  const finalHtml = generateReportHtml(reportData);
  const outputPath = path.join(process.cwd(), `/reports/${new Date().toISOString()}.html`);
  fs.writeFileSync(outputPath, finalHtml, 'utf8');
}


if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


function drawLogo(){
  console.log(
      chalk.blue(
          figlet.textSync('IBGRoboot' , { horizontalLayout: 'full' })
      )
  )
};
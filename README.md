# Ibgroboot - Trial Version

Ibgroboot is a **flexible API testing** tool that uses a `.ibgrobot` file to define test scenarios, expected assertions, scripts, and more. This tool executes HTTP requests according to the YAML configuration, validates the response using structured assertions, and can integrate with pre/post scripts for advanced setup or teardown needs.

---

## **1. Main Concepts**

1. **.ibgrobot File**  
   - A YAML file describing:
     - **URL** & **Method**
     - **Headers**
     - **Test Cases** (each with parameters, expected results, optional scripts)
   - Contains **assertions** in a structured format, such as:
     - **`Required Fields`**  
     - **`No Additional Fields`**  
     - **`Schema Compliance`**  
     - **`Nullability`**  
     - ... and many more.

2. **Assertions**  
   - Each test case can have multiple **`expected_results`** items.  
   - Each item has:
     - An **assertion** type (e.g., `"Required Fields"`)  
     - **`inputs`** to configure how that assertion should run.

3. **Scripts**  
   - **`pre_test_script`** / **`post_test_script`**: Executed around each test case, for setup/cleanup.  
   - **`stateful_pre_script`**: Runs **once** before *all* test cases, letting you mutate global headers/data.  
   - A **`Custom Assertion Script`** can be invoked from within the assertion logic, enabling arbitrary code checks.

4. **sendHTTPRequest**  
   - A function that reads the `.ibgrobot` data, optionally runs the **stateful pre-script**, then iterates over each **test case**.  
   - Uses **Axios** to send HTTP requests based on the test-case definitions.  
   - Runs a **runAssertions** function to validate the response data.  
   - Collects all results for final reporting.

---

## **2. Files & Structure**

- **`all_assertions.ibgrobot`**: Demonstrates every type of assertion (20+).  
- **`report_generator.js`** (example): Illustrates how to produce a Robot-Framework–like HTML report in **light mode**.  
- **`assertion_module.js`**: Contains the logic for each structured assertion (e.g., `"String Field Validation"`, `"Number Field Validation"`, etc.).  
- **`sendHTTPRequest.js`**: An example function that:
  1. Parses the `.ibgrobot` file.  
  2. Optionally calls **stateful pre-script**.  
  3. Iterates test cases, sending requests with **Axios**.  
  4. Runs **runAssertions** on each response.  
- **Scripts** (e.g. `pre_test.sh`, `post_test.sh`, `pre_test_script.mjs`, etc.) to handle environment setup, token fetching, cleanup, and advanced logic.

---

## **3. Typical Workflow**

1. **Author** a `.ibgrobot` file specifying:
   - **Global** fields (URL, method, optional `path_to_stateful_pre_script`).
   - **Headers** for each request.
   - **Test Cases**: Each with:
     - **description**  
     - **parameters** (e.g., body)  
     - **expected_results** (assertions)  
     - Optionally `path_to_pre_test_script`, `path_to_post_test_script`
2. **Run** the test suite:
   1. **Load** the `.ibgrobot` file.  
   2. **Execute** the **stateful pre-script** (if defined) to mutate headers/data.  
   3. **Loop** over test cases, building the final request (merge global data + test-case data).  
   4. **Send** HTTP request.  
   5. **Validate** the response with `runAssertions(...)`.  
   6. **Store** results.  
3. **Generate** a final report or process the results in any format (HTML, JSON, Slack notifications, etc.).

---

## **4. Example `.ibgrobot` File**

A simplified sample:

```yaml
name: "Basic Test of /items"
url: "https://api.example.com/items"
method: POST

path_to_stateful_pre_script: "./scripts/stateful_pre_script.mjs"

headers:
  - key: "Accept"
    value: "application/json"

test_cases:
  - description: "Create item"
    parameters:
      - key: "body"
        value: '{"name":"TestItem"}'
    expected_results:
      - assertion: "Required Fields"
        inputs:
          - "name"
      - assertion: "Number Field Validation"
        inputs: ["price"]
```

## 5. Additional Features

1. **Custom Assertion Script**  
   - `assertion: "Custom Assertion Script"`  
   - `inputs.scriptPath: "./scripts/custom_data_check.js"`  
   - The external module returns `{ status: boolean, error: string }`.

2. **Nullability**  
   - Enhanced checks for `nonNullable` and `nullable` fields.  
   - Example: `nonNullable: ["id"]`, `nullable: ["description"]`.

3. **Stateful Pre-Script**  
   - Mutates **headers** and/or **data** before **all** test cases run.  
   - Perfect for fetching a token once or establishing a global body.

4. **Light-Mode Robot-Like Reporting**  
   - The `report_generator.js` script can create an HTML layout resembling Robot Framework’s style but with a **light** theme.

---

## 6. Trial Version Usage

The **trial version** of Ibgroboot includes:

- **All assertion types** (20+).
- **Custom script** support.
- **Stateful pre-script** for a single run setup.
- **Basic HTML reporting**.

It’s a great way to confirm that you can define test scenarios, run them, see the results, and integrate with your CI pipeline or local environment.

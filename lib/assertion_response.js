// A standalone JavaScript (ES module) file that processes a list of assertions (1–20)
// against a response body. If the response is an **array**, each assertion produces
// a **single** result for the entire array (not one per item). We do, however, note
// which array index(es) caused any failures in the result message.
//
// For production usage, consider robust libraries like AJV or Joi for schema validation,
// or integrate with a test framework (Jest, Mocha, Chai) for more extensive checks.

// Author: Alameer Ashraf
// IBGRoboot

/**
 * runAssertions
 * -------------
 * Main entry point to run an array of assertion objects against `responseData`.
 * If `responseData` is an array, we apply each assertion once to the entire array.
 * If a failure is found in a particular item (or items), the result message notes
 * which item index(es) failed.
 *
 * @param {*} responseData - The response body to validate (object or array).
 * @param {Array<AssertionObject>} assertions - An array of assertion objects.
 * @returns {Array<AssertionResult>} - One result per assertion, pass/fail plus message(s).
 *
 * Example of an AssertionObject:
 * {
 *   assertion: 'Required Fields',
 *   inputs: ['id', 'name']
 * }
 *
 * Example of a returned AssertionResult:
 * {
 *   assertion: 'Required Fields',
 *   passed: false,
 *   message: 'Item(s) at index [2, 5] failed: Missing required field "name"'
 * }
 */
export async function runAssertions(responseData, assertions) {
  const results = [];

  // Determine if we're dealing with an array or single object
  const isArray = Array.isArray(responseData);

  for (const assertionObj of assertions) {
    const { assertion, inputs } = assertionObj;

    let passed = true;
    let message = "Assertion passed.";

    try {
      if (isArray) {
        const { arrayCheck, objectCheck } = classifyAssertion(assertion);

        if (arrayCheck) {
          const { pass, msg } = validateArrayLevel(
            responseData,
            assertion,
            inputs
          );
          if (!pass) {
            passed = false;
            message = msg;
          }
        } else if (objectCheck) {
          // This is an object-level assertion, so we run it across all items in the array
          // but produce a SINGLE result, listing which items fail (if any).
          const { pass, msg } = validateOnArrayItems(
            responseData,
            assertion,
            inputs
          );
          if (!pass) {
            passed = false;
            message = msg;
          }
        } else {
          message = `Unrecognized assertion type: "${assertion}". Skipping.`;
        }
      } else {
        // 2) If it's a single object, handle the assertion in object context
        const { pass, msg } = await validateObjectLevel(
          responseData,
          assertion,
          inputs
        );
        if (!pass) {
          passed = false;
          message = msg;
        }
      }
    } catch (err) {
      passed = false;
      message = `Error during assertion "${assertion}": ${err.message}`;
    }

    results.push({ assertion, passed, message });
  }

  return results;
}

/**
 * classifyAssertion
 * -----------------
 * Simple helper to decide if an assertion is primarily an "array-level" or "object-level" check.
 * Add or remove from this classification as needed.
 */
function classifyAssertion(assertionType) {
  const arrayAssertions = new Set(["Array Validation"]);
  // Example: Everything else is object-level (e.g., "Required Fields", "No Additional Fields", etc.)
  // For "Schema Compliance," "Number Field Validation," etc., we consider them object-level
  // when dealing with an array of items.

  return {
    arrayCheck: arrayAssertions.has(assertionType),
    objectCheck: !arrayAssertions.has(assertionType), // everything else
  };
}

/**
 * validateArrayLevel
 * ------------------
 * Runs checks that apply to the array **as a whole** (length, uniqueness, etc.).
 * Returns a single pass/fail plus a message.
 *
 * The signature of `inputs` can vary, but typically might look like:
 * {
 *   minLength: 1,
 *   maxLength: 10,
 *   enforceUnique: true, // if we wanted to ensure uniqueness across entire array items
 *   ...
 * }
 */
function validateArrayLevel(arrayData, assertion, inputs) {
  let pass = true;
  let msg = "Assertion passed.";

  switch (assertion) {
    case "Array Validation": {
      const { minLength, maxLength } = inputs;
      if (typeof minLength === "number" && arrayData.length < minLength) {
        pass = false;
        msg = `Array length is below minimum ${minLength}. Actual length = ${arrayData.length}`;
        break;
      }
      if (typeof maxLength === "number" && arrayData.length > maxLength) {
        pass = false;
        msg = `Array length exceeds maximum ${maxLength}. Actual length = ${arrayData.length}`;
        break;
      }

      // If you had a scenario about uniqueness at the top-level array, you'd implement it here
      break;
    }

    default:
      msg = `Unrecognized array-level assertion: "${assertion}". Skipping.`;
      break;
  }

  return { pass, msg };
}

/**
 * validateOnArrayItems
 * --------------------
 * Runs an "object-level" assertion on each item of the array. If any item fails,
 * we mark the entire assertion as failed and add the failing indices in the message.
 */
async function validateOnArrayItems(arrayData, assertion, inputs) {
  let pass = true;
  let msg = "Assertion passed.";

  const failedIndices = [];
  const subMessages = []; // store specific fail messages per item

  for (let i = 0; i < arrayData.length; i++) {
    const item = arrayData[i];
    // If the item is not an object, we can wrap it or skip
    if (typeof item !== "object" || item === null) {
      // Some assertions may not even make sense, but let's attempt them anyway
      const wrapped = { value: item };
      const { pass: localPass, msg: localMsg } = await validateObjectLevel(
        wrapped,
        assertion,
        inputs
      );
      if (!localPass) {
        failedIndices.push(i);
        subMessages.push(`Index ${i}: ${localMsg}`);
      }
    } else {
      // Item is an object - apply the object-level checks
      const { pass: localPass, msg: localMsg } = await validateObjectLevel(
        item,
        assertion,
        inputs
      );
      if (!localPass) {
        failedIndices.push(i);
        subMessages.push(`Index ${i}: ${localMsg}`);
      }
    }
  }

  if (failedIndices.length > 0) {
    pass = false;
    msg = `Item(s) at index [${failedIndices.join(
      ", "
    )}] failed. Reasons: ${subMessages.join(" | ")}`;
  }

  return { pass, msg };
}

async function validateObjectLevel(obj, assertion, inputs) {
  let pass = true;
  let msg = "Assertion passed.";

  switch (assertion) {
    // ------------------------------------------------------------------
    // 1. Schema Compliance
    // ------------------------------------------------------------------
    case "Schema Compliance": {
      // Example of inputs:
      // { schema: { name: "string", age: "number" }, strict: false }
      const { schema, strict = false } = inputs;
      if (!schema || typeof schema !== "object") {
        // No real schema provided, so we skip or mark pass = false
        msg = "No schema object provided in inputs.";
        pass = false;
        break;
      }

      // Naive approach: check if each field's type matches schema's "type" property
      for (const fieldName in schema) {
        const expectedType = schema[fieldName];
        if (typeof obj[fieldName] !== expectedType) {
          pass = false;
          msg = `Field "${fieldName}" should be type "${expectedType}" but got "${typeof obj[fieldName]}".`;
          break;
        }
      }

      if (pass && strict) {
        // If strict = true, ensure no extra fields are in obj
        for (const key of Object.keys(obj)) {
          if (!schema.hasOwnProperty(key)) {
            pass = false;
            msg = `Strict schema compliance failed. Unexpected field "${key}".`;
            break;
          }
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 2. Required Fields
    // ------------------------------------------------------------------
    case "Required Fields": {
      const requiredFields = Array.isArray(inputs) ? inputs : [inputs];
      for (const field of requiredFields) {
        if (!Object.prototype.hasOwnProperty.call(obj, field)) {
          pass = false;
          msg = `Missing required field: "${field}".`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 3. No Additional Fields
    // ------------------------------------------------------------------
    case "No Additional Fields": {
      const allowedFields = new Set(Array.isArray(inputs) ? inputs : [inputs]);
      for (const key of Object.keys(obj)) {
        if (!allowedFields.has(key)) {
          pass = false;
          msg = `Unexpected field found: "${key}".`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 4. String Field Validation
    case "String Field Validation": {
      if (Array.isArray(inputs)) {
        for (const field of inputs) {
          if (typeof obj[field] !== "string") {
            pass = false;
            msg = `Field "${field}" is not a string.`;
            break;
          }
          if (obj[field].trim().length === 0) {
            pass = false;
            msg = `Field "${field}" cannot be an empty string.`;
            break;
          }
        }
      } else {
        const {
          fields,
          minLength,
          maxLength,
          pattern,
        } = inputs;
        for (const field of fields) {
          if (typeof obj[field] !== "string") {
            pass = false;
            msg = `Field "${field}" is not a string.`;
            break;
          }
          const trimmed = obj[field].trim();
          if (typeof minLength === "number" && trimmed.length < minLength) {
            pass = false;
            msg = `Field "${field}" length is below minimum ${minLength}.`;
            break;
          }
          if (typeof maxLength === "number" && trimmed.length > maxLength) {
            pass = false;
            msg = `Field "${field}" length exceeds maximum ${maxLength}.`;
            break;
          }
          if (pattern) {
            const re = new RegExp(pattern);
            if (!re.test(trimmed)) {
              pass = false;
              msg = `Field "${field}" does not match pattern: ${pattern}`;
              break;
            }
          }
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 5. Number Field Validation
    case "Number Field Validation": {
      if (Array.isArray(inputs)) {
        for (const field of inputs) {
          if (typeof obj[field] !== "number") {
            pass = false;
            msg = `Field "${field}" is not a number.`;
            break;
          }
        }
      } else {
        const {
          fields,
          min,
          max,
          integerOnly = false
        } = inputs;
        for (const field of fields) {
          const value = obj[field];
          if (typeof value !== "number") {
            pass = false;
            msg = `Field "${field}" is not a number.`;
            break;
          }
          if (typeof min === "number" && value < min) {
            pass = false;
            msg = `Field "${field}" is below minimum value ${min}.`;
            break;
          }
          if (typeof max === "number" && value > max) {
            pass = false;
            msg = `Field "${field}" exceeds maximum value ${max}.`;
            break;
          }
          if (integerOnly && !Number.isInteger(value)) {
            pass = false;
            msg = `Field "${field}" must be an integer.`;
            break;
          }
        }
      }
      break;
    }

    case "Boolean Field Validation": {
      const boolFields = Array.isArray(inputs) ? inputs : [inputs];
      for (const field of boolFields) {
        if (typeof obj[field] !== "boolean") {
          pass = false;
          msg = `Field "${field}" is not a boolean.`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 7. Array Validation
    case "Array Validation": {
      const { field, minLength, maxLength, enforceUnique } = inputs;
      const arr = obj[field];
      if (!Array.isArray(arr)) {
        pass = false;
        msg = `Field "${field}" is not an array.`;
        break;
      }
      if (typeof minLength === "number" && arr.length < minLength) {
        pass = false;
        msg = `Array "${field}" length is below minimum ${minLength}.`;
        break;
      }
      if (typeof maxLength === "number" && arr.length > maxLength) {
        pass = false;
        msg = `Array "${field}" length exceeds maximum ${maxLength}.`;
        break;
      }
      if (enforceUnique) {
        const set = new Set(arr);
        if (set.size !== arr.length) {
          pass = false;
          msg = `Array "${field}" contains duplicate elements.`;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 8. Nested Object Validation
    case "Nested Object Validation": {
      const { field, requiredFields } = inputs;
      const nestedObj = obj[field];
      if (typeof nestedObj !== "object" || nestedObj === null || Array.isArray(nestedObj)) {
        pass = false;
        msg = `Field "${field}" is not a valid nested object.`;
        break;
      }
      for (const rf of requiredFields) {
        if (!Object.prototype.hasOwnProperty.call(nestedObj, rf)) {
          pass = false;
          msg = `Missing nested field "${rf}" in object "${field}".`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 9. Pattern Matching
    case "Pattern Matching": {
      const { field, pattern } = inputs;
      const regex = new RegExp(pattern);
      const val = obj[field] || "";
      if (!regex.test(val)) {
        pass = false;
        msg = `Field "${field}" does not match pattern: ${pattern}`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 10. Enumeration Validation
    case "Enumeration Validation": {
      const { field, allowedValues } = inputs;
      const val = obj[field];
      if (!allowedValues.includes(val)) {
        pass = false;
        msg = `Field "${field}" has invalid value: "${val}". Allowed: ${allowedValues}`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 11. Date Field Validation
    case "Date Field Validation": {
      const { field, validateActualDate } = inputs;
      const dateValue = obj[field];
      if (typeof dateValue !== "string") {
        pass = false;
        msg = `Field "${field}" is not a string date.`;
        break;
      }
      const parsed = new Date(dateValue);
      if (validateActualDate && isNaN(parsed.getTime())) {
        pass = false;
        msg = `Field "${field}" is not a valid date: ${dateValue}`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 12. Nullability
    case "Nullability": {
      const { nonNullable = [], nullable = [] } = inputs;
    
      for (const field of nonNullable) {
        if (obj[field] === null) {
          pass = false;
          msg = `Field "${field}" should not be null.`;
          break;
        }
      }
    
      if (pass) { // Only continue if we haven't failed yet
        for (const field of nullable) {
          // If the field exists in the object, we enforce it must be null
          if (Object.prototype.hasOwnProperty.call(obj, field)) {
            if (obj[field] !== null) {
              pass = false;
              msg = `Field "${field}" must be null if present.`;
              break;
            }
          }
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 13. Default Values
    case "Default Values": {
      const { field, defaultValue } = inputs;
      if (!Object.prototype.hasOwnProperty.call(obj, field)) {
        pass = false;
        msg = `Missing field "${field}". Expected a default of "${defaultValue}".`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 14. Strict Validation
    case "Strict Validation": {
      const { allowedFields = [] } = inputs;
      const allowedSet = new Set(allowedFields);
      for (const key of Object.keys(obj)) {
        if (!allowedSet.has(key)) {
          pass = false;
          msg = `Strict validation failed: unexpected field "${key}".`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 15. Custom Logic
    case "Custom Logic": {
      const { ifField, thenField } = inputs;
      if (obj[ifField] && obj[thenField] === undefined) {
        pass = false;
        msg = `If "${ifField}" is present, "${thenField}" must be set.`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 16. Data Transformation
    case "Data Transformation": {
      const { field, expectedTypeAfterCoercion } = inputs;
      if (typeof obj[field] !== expectedTypeAfterCoercion) {
        pass = false;
        msg = `Field "${field}" is not coerced to type "${expectedTypeAfterCoercion}".`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 17. Multi-Type Fields
    case "Multi-Type Fields": {
      const { field, allowedTypes } = inputs;
      const actualType = typeof obj[field];
      if (!allowedTypes.includes(actualType)) {
        pass = false;
        msg = `Field "${field}" has type "${actualType}" but must be one of [${allowedTypes.join(
          ", "
        )}].`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 18. Error Messaging
    case "Error Messaging": {
      const { errorField = "error", messageContains } = inputs;
      const errMsg = obj[errorField];
      if (typeof errMsg !== "string") {
        pass = false;
        msg = `Expected a string in "${errorField}" but got ${typeof errMsg}.`;
      } else if (messageContains && !errMsg.includes(messageContains)) {
        pass = false;
        msg = `Error message does not contain: "${messageContains}". Actual: "${errMsg}"`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // 19. Read-Only Fields
    case "Read-Only Fields": {
      const readOnlyFields = Array.isArray(inputs) ? inputs : [inputs];
      for (const roField of readOnlyFields) {
        if (obj.hasOwnProperty(roField)) {
          pass = false;
          msg = `Read-only field "${roField}" should not be present or changed.`;
          break;
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    // 20. CDisallowed Pattern
    case "Disallowed Pattern": {
      const { field, disallowedPattern } = inputs;
      const re = new RegExp(disallowedPattern);
      if (re.test(obj[field] || "")) {
        pass = false;
        msg = `Field "${field}" has disallowed characters matching: ${disallowedPattern}`;
      }
      break;
    }

    case "Custom": {
      const { path, ...rest } = inputs;
    
      try {
        const customModule = await import(path);
        
        if (typeof customModule.validate !== 'function') {
          pass = false;
          msg = `Custom script does not export a 'validate' function.`;
          break;
        }
    
        const result = customModule.validate(obj, rest);
    
        if (!result || typeof result.status !== 'boolean' || typeof result.error !== 'string') {
          pass = false;
          msg = `Custom script returned invalid structure. Must be { status: boolean, error: string }.`;
          break;
        }
    
        // If status is false, the test fails and we store the error message
        pass = result.status;
        if (!pass) {
          msg = result.error || 'Custom assertion script failed.';
        }
      } catch (err) {
        pass = false;
        msg = `Error running custom assertion script: ${err.message}`;
      }
      break;
    }

    // ------------------------------------------------------------------
    // DEFAULT: Unrecognized assertion
    default: {
      msg = `Unrecognized assertion type: "${assertion}". Skipping.`;
    }
  }

  return { pass, msg };
}

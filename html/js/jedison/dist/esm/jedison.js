function clone(thing) {
  if (thing === null || typeof thing !== "object") {
    return thing;
  }
  if (Array.isArray(thing)) {
    const len = thing.length;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) {
      const item = thing[i];
      arr[i] = item === null || typeof item !== "object" ? item : clone(item);
    }
    return arr;
  }
  const keys = Object.keys(thing);
  const obj = {};
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    const val = thing[key];
    const cloned = val === null || typeof val !== "object" ? val : clone(val);
    if (key === "__proto__") {
      Object.defineProperty(obj, key, { value: cloned, writable: true, enumerable: true, configurable: true });
    } else {
      obj[key] = cloned;
    }
  }
  return obj;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}
function pathToAttribute(path) {
  return replaceAll(replaceAll(path, "#", "root"), "/", "-").replace(/[^a-zA-Z0-9_-]/g, "");
}
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function sortObject(obj) {
  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {});
}
function equal(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray) {
    const len = a.length;
    if (len !== b.length) return false;
    for (let i = 0; i < len; i++) {
      if (!equal(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0, len = keysA.length; i < len; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!equal(a[key], b[key])) return false;
  }
  return true;
}
function different(a, b) {
  return !equal(a, b);
}
function isNull(value) {
  return value === null;
}
function isSet(value) {
  return typeof value !== "undefined";
}
function notSet(value) {
  return typeof value === "undefined";
}
function isNumber(value) {
  return typeof value === "number";
}
function isInteger(value) {
  return isNumber(value) && value === Math.floor(value);
}
function isString(value) {
  return typeof value === "string";
}
function isBoolean(value) {
  return typeof value === "boolean";
}
function isArray(value) {
  return Array.isArray(value);
}
function isObject(value) {
  return !isNull(value) && !isArray(value) && typeof value === "object";
}
function getType(value) {
  let type2 = "any";
  if (isNumber(value)) {
    type2 = isInteger(value) ? "integer" : "number";
  } else if (isString(value)) {
    type2 = "string";
  } else if (isBoolean(value)) {
    type2 = "boolean";
  } else if (isArray(value)) {
    type2 = "array";
  } else if (isNull(value)) {
    type2 = "null";
  } else if (isObject(value)) {
    type2 = "object";
  }
  return type2;
}
const UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (UNSAFE_KEYS.has(key)) return;
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, {
            [key]: {}
          });
        }
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, {
          [key]: source[key]
        });
      }
    });
  }
  return mergeDeep(target, ...sources);
}
function combineDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();
  if (Array.isArray(target) && Array.isArray(source)) {
    target.push(...source);
  } else if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (UNSAFE_KEYS.has(key)) return;
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, {
            [key]: {}
          });
        }
        combineDeep(target[key], source[key]);
      } else if (Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = [];
        }
        target[key].push(...source[key]);
      } else {
        Object.assign(target, {
          [key]: source[key]
        });
      }
    });
  }
  return combineDeep(target, ...sources);
}
const overwriteExistingProperties = (obj1, obj2) => {
  Object.keys(obj2).forEach((key) => {
    if (key in obj1) {
      if (isSet(obj1[key]) && isSet(obj2[key]) && (isObject(obj1[key]) && isObject(obj2[key]) || isArray(obj1[key]) && isArray(obj2[key]) || isString(obj1[key]) && isString(obj2[key]) || isNumber(obj1[key]) && isNumber(obj2[key]) || isBoolean(obj1[key]) && isBoolean(obj2[key]) || isNull(obj1[key]) && isNull(obj2[key]))) {
        if (isObject(obj1[key]) && isObject(obj2[key])) {
          overwriteExistingProperties(obj1[key], obj2[key]);
        } else {
          obj1[key] = obj2[key];
        }
      }
    }
  });
  return obj1;
};
function getValueByJSONPath(data, path) {
  const keys = path.split(".");
  let value = data;
  for (const key of keys) {
    if (Array.isArray(value) && /^\d+$/.test(key)) {
      const index2 = parseInt(key);
      if (index2 >= 0 && index2 < value.length) {
        value = value[index2];
      } else {
        return void 0;
      }
    } else if (hasOwn(value, key)) {
      value = value[key];
    } else {
      return void 0;
    }
  }
  return value;
}
function compileTemplate(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, inner) => {
    inner = inner.trim();
    const pipeIdx = inner.indexOf("||");
    let path, fallback;
    if (pipeIdx !== -1) {
      path = inner.slice(0, pipeIdx).trim();
      const raw = inner.slice(pipeIdx + 2).trim();
      fallback = raw.replace(/^['"]|['"]$/g, "");
    } else {
      path = inner;
      fallback = "";
    }
    const value = getValueByJSONPath(data, path);
    return value !== void 0 && value !== null ? value : fallback;
  });
}
function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}
function removeDuplicatesFromArray(arr) {
  const uniqueObjects = [];
  const uniqueValues = /* @__PURE__ */ new Set();
  for (const obj of arr) {
    const objString = JSON.stringify(obj);
    if (!uniqueValues.has(objString)) {
      uniqueValues.add(objString);
      uniqueObjects.push(obj);
    }
  }
  return uniqueObjects;
}
function resolveInstancePath(currentPath, sourcePath) {
  if (sourcePath.startsWith("#")) return sourcePath;
  const parts = currentPath.split("/");
  parts.pop();
  for (const part of sourcePath.split("/")) {
    if (part === "..") {
      if (parts.length > 1) parts.pop();
    } else if (part !== "." && part !== "") {
      parts.push(part);
    }
  }
  return parts.join("/");
}
function generateRandomID(maxLength2) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomID = "";
  for (let i = 0; i < maxLength2; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomID += chars[randomIndex];
  }
  return randomID;
}
const Utils = {
  clone,
  escapeRegExp,
  replaceAll,
  pathToAttribute,
  hasOwn,
  sortObject,
  equal,
  different,
  isNull,
  isSet,
  notSet,
  isNumber,
  isInteger,
  isString,
  isBoolean,
  isArray,
  isObject,
  getType,
  mergeDeep,
  combineDeep,
  overwriteExistingProperties,
  getValueByJSONPath,
  compileTemplate,
  clamp,
  removeDuplicatesFromArray,
  generateRandomID
};
const OPTION_ALIASES = {
  enforceEnumDefault: "enforceEnum"
};
function resolveAlias(name) {
  return OPTION_ALIASES[name] ?? name;
}
function getAliasesFor(canonicalName) {
  return Object.keys(OPTION_ALIASES).filter((old) => OPTION_ALIASES[old] === canonicalName);
}
function getSchemaX(schema, keyword) {
  const key = "x-" + keyword;
  return schema[key];
}
function getSchemaSchema(schema) {
  return isString(schema.$schema) ? clone(schema.$schema) : void 0;
}
function getSchemaAdditionalProperties(schema) {
  return isObject(schema.additionalProperties) || isBoolean(schema.additionalProperties) ? clone(schema.additionalProperties) : void 0;
}
function getSchemaPropertyNames(schema) {
  return isObject(schema.propertyNames) || isBoolean(schema.propertyNames) ? clone(schema.propertyNames) : void 0;
}
function getSchemaAllOf(schema) {
  return isArray(schema.allOf) ? clone(schema.allOf) : void 0;
}
function getSchemaAnyOf(schema) {
  return isArray(schema.anyOf) ? clone(schema.anyOf) : void 0;
}
function getSchemaConst(schema) {
  return clone(schema.const);
}
function getSchemaContains(schema) {
  return isObject(schema.contains) || isBoolean(schema.contains) ? clone(schema.contains) : void 0;
}
function getSchemaDefault(schema) {
  return clone(schema.default);
}
function getSchemaDependentRequired(schema) {
  return isObject(schema.dependentRequired) ? clone(schema.dependentRequired) : void 0;
}
function getSchemaDependentSchemas(schema) {
  return isObject(schema.dependentSchemas) ? clone(schema.dependentSchemas) : void 0;
}
function getSchemaDescription(schema) {
  return isString(schema.description) ? clone(schema.description) : void 0;
}
function getSchemaElse(schema) {
  return isObject(schema.else) || isBoolean(schema.else) ? clone(schema.else) : void 0;
}
function getSchemaEnum(schema) {
  if (isArray(schema.enum) && schema.enum.length > 0) {
    return clone(schema.enum);
  }
  return void 0;
}
function getSchemaExclusiveMaximum(schema) {
  return isNumber(schema.exclusiveMaximum) ? clone(schema.exclusiveMaximum) : void 0;
}
function getSchemaExclusiveMinimum(schema) {
  return isNumber(schema.exclusiveMinimum) ? schema.exclusiveMinimum : void 0;
}
function getSchemaFormat(schema) {
  return isString(schema.format) ? clone(schema.format) : void 0;
}
function getSchemaIf(schema) {
  if (isObject(schema.if)) {
    return clone(schema.if);
  }
  if (isBoolean(schema.if)) {
    return clone(schema.if);
  }
  return void 0;
}
function getSchemaItems(schema) {
  return isObject(schema.items) || isBoolean(schema.items) ? clone(schema.items) : void 0;
}
function getSchemaMaximum(schema) {
  return isNumber(schema.maximum) ? clone(schema.maximum) : void 0;
}
function getSchemaMaxContains(schema) {
  if (isInteger(schema.maxContains) && schema.maxContains >= 0) {
    return clone(schema.maxContains);
  }
  return void 0;
}
function getSchemaMaxItems(schema) {
  if (isInteger(schema.maxItems) && schema.maxItems >= 0) {
    return clone(schema.maxItems);
  }
  return void 0;
}
function getSchemaMaxLength(schema) {
  if (isInteger(schema.maxLength) && schema.maxLength >= 0) {
    return clone(schema.maxLength);
  }
  return void 0;
}
function getSchemaMaxProperties(schema) {
  if (isInteger(schema.maxProperties)) {
    return clone(schema.maxProperties);
  }
  return void 0;
}
function getSchemaMinimum(schema) {
  return isNumber(schema.minimum) ? clone(schema.minimum) : void 0;
}
function getSchemaMinContains(schema) {
  if (isInteger(schema.minContains) && schema.minContains >= 0) {
    return clone(schema.minContains);
  }
  return void 0;
}
function getSchemaMinItems(schema) {
  if (isInteger(schema.minItems) && schema.minItems >= 0) {
    return clone(schema.minItems);
  }
  return void 0;
}
function getSchemaMinLength(schema) {
  if (isInteger(schema.minLength) && schema.minLength >= 0) {
    return clone(schema.minLength);
  }
  return void 0;
}
function getSchemaMinProperties(schema) {
  if (isInteger(schema.minProperties) && schema.minProperties >= 0) {
    return clone(schema.minProperties);
  }
  return void 0;
}
function getSchemaMultipleOf(schema) {
  if (isNumber(schema.multipleOf) && schema.multipleOf >= 0) {
    return clone(schema.multipleOf);
  }
  return void 0;
}
function getSchemaNot(schema) {
  return isObject(schema.not) || isBoolean(schema.not) ? clone(schema.not) : void 0;
}
function getSchemaXOption(schema, option) {
  const xOption = "x-" + option;
  if (isSet(schema[xOption])) {
    return schema[xOption];
  }
  if (schema["x-options"] && isSet(schema["x-options"][option])) {
    return schema["x-options"][option];
  }
  for (const alias of getAliasesFor(option)) {
    const xAlias = "x-" + alias;
    if (isSet(schema[xAlias])) {
      console.warn(`Jedison: schema option "${xAlias}" is deprecated. Use "${xOption}" instead.`);
      return schema[xAlias];
    }
    if (schema["x-options"] && isSet(schema["x-options"][alias])) {
      console.warn(`Jedison: schema x-options.${alias} is deprecated. Use x-options.${option} instead.`);
      return schema["x-options"][alias];
    }
  }
  return void 0;
}
function getSchemaPattern(schema) {
  return isString(schema.pattern) ? clone(schema.pattern) : void 0;
}
function getSchemaPatternProperties(schema) {
  return isObject(schema.patternProperties) ? clone(schema.patternProperties) : void 0;
}
function getSchemaPrefixItems(schema) {
  return isArray(schema.prefixItems) ? clone(schema.prefixItems) : void 0;
}
function getSchemaProperties(schema) {
  return isObject(schema.properties) ? clone(schema.properties) : void 0;
}
function getSchemaReadOnly(schema) {
  return isBoolean(schema.readOnly) ? clone(schema.readOnly) : void 0;
}
function getSchemaRequired(schema) {
  return isArray(schema.required) ? [...new Set(schema.required)] : void 0;
}
function getSchemaThen(schema) {
  return isObject(schema.then) || isBoolean(schema.then) ? clone(schema.then) : void 0;
}
function getSchemaTitle(schema) {
  return isString(schema.title) ? clone(schema.title) : void 0;
}
function getSchemaType(schema) {
  if (isString(schema.type) || isArray(schema.type)) {
    return clone(schema.type);
  }
  return void 0;
}
function getSchemaOneOf(schema) {
  return isArray(schema.oneOf) ? clone(schema.oneOf) : void 0;
}
function getSchemaUnevaluatedProperties(schema) {
  return isBoolean(schema.unevaluatedProperties) ? clone(schema.unevaluatedProperties) : void 0;
}
function getSchemaUniqueItems(schema) {
  return isBoolean(schema.uniqueItems) ? clone(schema.uniqueItems) : void 0;
}
const Schema = {
  getSchemaX,
  getSchemaSchema,
  getSchemaAdditionalProperties,
  getSchemaPropertyNames,
  getSchemaAllOf,
  getSchemaAnyOf,
  getSchemaConst,
  getSchemaContains,
  getSchemaDefault,
  getSchemaDependentRequired,
  getSchemaDependentSchemas,
  getSchemaDescription,
  getSchemaElse,
  getSchemaEnum,
  getSchemaExclusiveMaximum,
  getSchemaExclusiveMinimum,
  getSchemaFormat,
  getSchemaIf,
  getSchemaItems,
  getSchemaMaximum,
  getSchemaMaxContains,
  getSchemaMaxItems,
  getSchemaMaxLength,
  getSchemaMaxProperties,
  getSchemaMinimum,
  getSchemaMinContains,
  getSchemaMinItems,
  getSchemaMinLength,
  getSchemaMinProperties,
  getSchemaMultipleOf,
  getSchemaNot,
  getSchemaXOption,
  getSchemaPattern,
  getSchemaPatternProperties,
  getSchemaPrefixItems,
  getSchemaProperties,
  getSchemaReadOnly,
  getSchemaRequired,
  getSchemaThen,
  getSchemaTitle,
  getSchemaType,
  getSchemaOneOf,
  getSchemaUnevaluatedProperties,
  getSchemaUniqueItems
};
class SchemaGenerator {
  static inferType(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }
  static generate(obj) {
    if (typeof obj !== "object" || obj === null) {
      return { type: this.inferType(obj) };
    }
    if (Array.isArray(obj)) {
      const itemSchemas = obj.map((item) => this.generate(item));
      return {
        type: "array",
        items: itemSchemas.length ? itemSchemas[0] : {}
      };
    }
    const properties2 = {};
    for (const key in obj) {
      properties2[key] = this.generate(obj[key]);
    }
    return {
      type: "object",
      properties: properties2
    };
  }
}
function allOf(context) {
  let errors = [];
  const allOf2 = getSchemaAllOf(context.schema);
  if (isSet(allOf2)) {
    const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
    if (enableSubErrors) {
      const schemaResults = [];
      allOf2.forEach((schema, index2) => {
        const subSchemaErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        if (subSchemaErrors.length > 0) {
          schemaResults.push({ schemaIndex: index2, errors: subSchemaErrors });
        }
      });
      if (schemaResults.length > 0) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "allOf",
          subErrors: schemaResults
        });
      }
    } else {
      allOf2.forEach((schema) => {
        const subSchemaErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        subSchemaErrors.forEach((error) => {
          error.path = context.path;
        });
        errors.push(...subSchemaErrors);
      });
      errors = removeDuplicatesFromArray(errors);
    }
  }
  return errors;
}
function minLength(context) {
  const errors = [];
  const minLength2 = getSchemaMinLength(context.schema);
  if (isString(context.value) && isSet(minLength2)) {
    context.value = context.value.replace(/[\uDCA9]/g, "");
    const invalid = context.value.length < minLength2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "minLength",
        messages: [
          compileTemplate(context.translator.translate("errorMinLength"), {
            minLength: minLength2
          })
        ]
      });
    }
  }
  return errors;
}
function anyOf(context) {
  const errors = [];
  const anyOf2 = getSchemaAnyOf(context.schema);
  if (isSet(anyOf2)) {
    const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
    let valid = false;
    if (enableSubErrors) {
      const schemaResults = [];
      anyOf2.forEach((schema, index2) => {
        const anyOfErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        if (anyOfErrors.length === 0) {
          valid = true;
        }
        schemaResults.push({ schemaIndex: index2, errors: anyOfErrors });
      });
      if (!valid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "anyOf",
          messages: [
            context.translator.translate("errorAnyOf")
          ],
          subErrors: schemaResults.filter((r) => r.errors.length > 0)
        });
      }
    } else {
      for (const schema of anyOf2) {
        const anyOfErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        if (anyOfErrors.length === 0) {
          valid = true;
          break;
        }
      }
      if (!valid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "anyOf",
          messages: [
            context.translator.translate("errorAnyOf")
          ]
        });
      }
    }
  }
  return errors;
}
function _enum(context) {
  const errors = [];
  const schemaEnum = getSchemaEnum(context.schema);
  if (isSet(schemaEnum)) {
    const invalid = !schemaEnum.some((e) => JSON.stringify(context.value) === JSON.stringify(e));
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "enum",
        messages: [
          compileTemplate(context.translator.translate("errorEnum"), {
            enum: JSON.stringify(schemaEnum)
          })
        ]
      });
    }
  }
  return errors;
}
function exclusiveMaximum(context) {
  const errors = [];
  const exclusiveMaximum2 = getSchemaExclusiveMaximum(context.schema);
  if (isNumber(context.value) && isSet(exclusiveMaximum2)) {
    const invalid = context.value >= exclusiveMaximum2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "exclusiveMaximum",
        messages: [
          compileTemplate(context.translator.translate("errorExclusiveMaximum"), {
            exclusiveMaximum: exclusiveMaximum2
          })
        ]
      });
    }
  }
  return errors;
}
function exclusiveMinimum(context) {
  const errors = [];
  const exclusiveMinimum2 = getSchemaExclusiveMinimum(context.schema);
  if (isNumber(context.value) && isSet(exclusiveMinimum2)) {
    const invalid = context.value <= exclusiveMinimum2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "exclusiveMinimum",
        messages: [
          compileTemplate(context.translator.translate("errorExclusiveMinimum"), {
            exclusiveMinimum: exclusiveMinimum2
          })
        ]
      });
    }
  }
  return errors;
}
function format(context) {
  const errors = [];
  const format2 = getSchemaFormat(context.schema);
  const xAssertFormat = getSchemaXOption(context.schema, "assertFormat");
  const assertFormat = xAssertFormat !== void 0 ? xAssertFormat : context.validator.assertFormat;
  if (isSet(format2) && isString(context.value) && assertFormat) {
    let regexp;
    if (format2 === "email") {
      regexp = new RegExp(/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/i);
    }
    if (format2 === "url") {
      regexp = new RegExp(/^(?:https?|ftp):\/\/(?:[^\s:@]+(?::[^\s:@]*)?@)?(?:(?:[^\s:@]+(?::[^\s:@]*)?@)?(?:[^\s:@](?:[^\s:@-]*[^\s:@])?\.?)+[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s]*)?$/i);
    }
    if (format2 === "uuid") {
      regexp = new RegExp(/^(?:urn:uuid:)?[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/i);
    }
    const invalid = isSet(regexp) && !regexp.test(context.value);
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "format",
        messages: [
          compileTemplate(context.translator.translate("errorFormat"), { format: format2 })
        ]
      });
    }
  }
  return errors;
}
function items(context) {
  const errors = [];
  const items2 = getSchemaItems(context.schema);
  const prefixItems2 = getSchemaPrefixItems(context.schema);
  if (isArray(context.value) && isSet(items2)) {
    const prefixItemsSchemasCount = isSet(prefixItems2) ? prefixItems2.length : 0;
    if (items2 === false && context.value.length > 0 && context.value.length > prefixItemsSchemasCount) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "items",
        messages: [context.translator.translate("errorItems")]
      });
    } else if (isObject(items2)) {
      const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
      context.value.slice(prefixItemsSchemasCount).forEach((itemValue, i) => {
        const index2 = prefixItemsSchemasCount + i;
        const tmpErrors = context.validator.getErrors(itemValue, items2, index2, context.path + "/" + index2);
        if (tmpErrors.length > 0) {
          const error = {
            type: "error",
            path: context.path,
            constraint: "items",
            messages: [
              compileTemplate(context.translator.translate("errorItems"), { index: index2 })
            ]
          };
          if (enableSubErrors) {
            error.subErrors = tmpErrors;
          }
          errors.push(error);
        }
      });
    }
  }
  return errors;
}
function maxItems(context) {
  const errors = [];
  const maxItems2 = getSchemaMaxItems(context.schema);
  if (isArray(context.value) && isSet(maxItems2)) {
    const invalid = context.value.length > maxItems2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "maxItems",
        messages: [
          compileTemplate(context.translator.translate("errorMaxItems"), {
            maxItems: maxItems2
          })
        ]
      });
    }
  }
  return errors;
}
function maxLength(context) {
  const errors = [];
  const maxLength2 = getSchemaMaxLength(context.schema);
  if (isString(context.value) && isSet(maxLength2)) {
    context.value = context.value.replace(/[\uDCA9]/g, "");
    const invalid = context.value.length > maxLength2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "maxLength",
        messages: [
          compileTemplate(context.translator.translate("errorMaxLength"), {
            maxLength: maxLength2
          })
        ]
      });
    }
  }
  return errors;
}
function maxProperties(context) {
  const errors = [];
  const maxProperties2 = getSchemaMaxProperties(context.schema);
  if (isObject(context.value) && isSet(maxProperties2)) {
    const propertiesCount = Object.keys(context.value).length;
    const invalid = propertiesCount > maxProperties2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "maxProperties",
        messages: [
          compileTemplate(context.translator.translate("errorMaxProperties"), {
            maxProperties: maxProperties2
          })
        ]
      });
    }
  }
  return errors;
}
function minimum(context) {
  const errors = [];
  const minimum2 = getSchemaMinimum(context.schema);
  if (isNumber(context.value) && isSet(minimum2)) {
    const invalid = context.value < minimum2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "minimum",
        messages: [
          compileTemplate(context.translator.translate("errorMinimum"), {
            minimum: minimum2
          })
        ]
      });
    }
  }
  return errors;
}
function minItems(context) {
  const errors = [];
  const minItems2 = getSchemaMinItems(context.schema);
  if (isArray(context.value) && isSet(minItems2)) {
    const invalid = context.value.length < minItems2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "minItems",
        messages: [
          compileTemplate(context.translator.translate("errorMinItems"), {
            minItems: minItems2
          })
        ]
      });
    }
  }
  return errors;
}
function minProperties(context) {
  const errors = [];
  const minProperties2 = getSchemaMinProperties(context.schema);
  if (isObject(context.value) && isSet(minProperties2)) {
    const propertiesCount = Object.keys(context.value).length;
    const invalid = propertiesCount < minProperties2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "minProperties",
        messages: [
          compileTemplate(context.translator.translate("errorMinProperties"), {
            minProperties: minProperties2
          })
        ]
      });
    }
  }
  return errors;
}
function multipleOf(context) {
  const errors = [];
  const multipleOf2 = getSchemaMultipleOf(context.schema);
  if (isNumber(context.value) && isSet(multipleOf2)) {
    if (context.value === 0) {
      return errors;
    }
    const isMultipleOf = context.value / multipleOf2 === Math.floor(context.value / multipleOf2);
    const invalid = !isMultipleOf || context.value.toString().includes("e");
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "multipleOf",
        messages: [
          compileTemplate(context.translator.translate("errorMultipleOf"), {
            multipleOf: multipleOf2
          })
        ]
      });
    }
  }
  return errors;
}
function not(context) {
  const errors = [];
  const not2 = getSchemaNot(context.schema);
  if (isSet(not2)) {
    const notErrors = context.validator.getErrors(context.value, not2, context.key, context.path);
    const invalid = notErrors.length === 0;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "not",
        messages: [
          compileTemplate(context.translator.translate("errorNot"))
        ]
      });
    }
  }
  return errors;
}
function oneOf(context) {
  const errors = [];
  const oneOf2 = getSchemaOneOf(context.schema);
  if (isSet(oneOf2)) {
    let counter = 0;
    const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
    if (enableSubErrors) {
      const schemaResults = [];
      oneOf2.forEach((schema, index2) => {
        const oneOfErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        if (oneOfErrors.length === 0) {
          counter++;
          schemaResults.push({ schemaIndex: index2, matched: true, errors: [] });
        } else {
          schemaResults.push({ schemaIndex: index2, matched: false, errors: oneOfErrors });
        }
      });
      if (counter !== 1) {
        const error = {
          type: "error",
          path: context.path,
          constraint: "oneOf",
          messages: [
            compileTemplate(context.translator.translate("errorOneOf"), {
              counter
            })
          ]
        };
        if (counter === 0) {
          error.subErrors = schemaResults.filter((r) => !r.matched).map((r) => ({
            schemaIndex: r.schemaIndex,
            errors: r.errors
          }));
        } else {
          error.matchingSchemas = schemaResults.filter((r) => r.matched).map((r) => r.schemaIndex);
        }
        errors.push(error);
      }
    } else {
      const matchingSchemas = [];
      oneOf2.forEach((schema, index2) => {
        const oneOfErrors = context.validator.getErrors(context.value, schema, context.key, context.path);
        if (oneOfErrors.length === 0) {
          counter++;
          matchingSchemas.push(index2);
        }
      });
      if (counter !== 1) {
        const error = {
          type: "error",
          path: context.path,
          constraint: "oneOf",
          messages: [
            compileTemplate(context.translator.translate("errorOneOf"), {
              counter
            })
          ]
        };
        if (counter > 0) {
          error.matchingSchemas = matchingSchemas;
        }
        errors.push(error);
      }
    }
  }
  return errors;
}
function pattern(context) {
  const errors = [];
  const pattern2 = getSchemaPattern(context.schema);
  if (isString(context.value) && isSet(pattern2)) {
    const regexp = new RegExp(pattern2);
    const invalid = !regexp.test(context.value);
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "pattern",
        messages: [
          compileTemplate(context.translator.translate("errorPattern"), {
            pattern: pattern2
          })
        ]
      });
    }
  }
  return errors;
}
function patternProperties(context) {
  let errors = [];
  const patternProperties2 = getSchemaPatternProperties(context.schema);
  if (isObject(context.value) && isSet(patternProperties2)) {
    Object.keys(context.value).forEach((propertyName) => {
      Object.keys(patternProperties2).forEach((pattern2) => {
        const regexp = new RegExp(pattern2);
        if (regexp.test(propertyName)) {
          const schema = patternProperties2[pattern2];
          const editorErrors = context.validator.getErrors(context.value[propertyName], schema, propertyName, context.path + "/" + propertyName).map((error) => {
            return {
              type: "error",
              path: context.path + "/" + propertyName,
              constraint: "patternProperties",
              messages: error.messages
            };
          });
          errors = [...errors, ...editorErrors];
        }
      });
    });
  }
  return errors;
}
function properties(context) {
  const schemaProperties = getSchemaProperties(context.schema);
  const invalidProperties = [];
  const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
  const propertySubErrors = [];
  if (isObject(context.value) && isSet(schemaProperties)) {
    Object.keys(schemaProperties).forEach((propertyName) => {
      if (hasOwn(context.value, propertyName)) {
        const propertySchema = schemaProperties[propertyName];
        const propertyErrors = context.validator.getErrors(
          context.value[propertyName],
          propertySchema,
          propertyName,
          context.path + "/" + propertyName
        );
        if (propertyErrors.length > 0) {
          invalidProperties.push(propertyName);
          if (enableSubErrors) {
            propertySubErrors.push({ property: propertyName, errors: propertyErrors });
          }
        }
      }
    });
  }
  if (invalidProperties.length > 0) {
    const error = {
      type: "error",
      path: context.path,
      constraint: "properties",
      messages: [
        compileTemplate(context.translator.translate("errorProperties"), { properties: invalidProperties.join(", ") })
      ]
    };
    if (enableSubErrors) {
      error.subErrors = propertySubErrors;
    }
    return [error];
  }
  return [];
}
function required(context) {
  const errors = [];
  const required2 = getSchemaRequired(context.schema);
  if (isObject(context.value) && isSet(required2)) {
    const missingProperties = [];
    const keys = Object.keys(context.value);
    required2.forEach((key) => {
      if (!keys.includes(key)) {
        missingProperties.push(key);
      }
    });
    const invalid = missingProperties.length > 0;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "required",
        messages: [
          compileTemplate(context.translator.translate("errorRequired"), {
            required: missingProperties.join(", ")
          })
        ]
      });
    }
  }
  return errors;
}
function type(context) {
  const errors = [];
  const type2 = getSchemaType(context.schema);
  if (type2 === "any") {
    return errors;
  }
  if (isSet(type2)) {
    const types = {
      string: (value) => isString(value),
      number: (value) => isNumber(value),
      integer: (value) => isInteger(value),
      boolean: (value) => isBoolean(value),
      array: (value) => isArray(value),
      object: (value) => isObject(value),
      null: (value) => isNull(value)
    };
    let valid = true;
    if (isArray(type2)) {
      valid = type2.some((type3) => {
        return types[type3](context.value);
      });
    } else {
      valid = types[type2](context.value);
    }
    if (!valid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "type",
        messages: [
          compileTemplate(context.translator.translate("errorType"), {
            type: type2,
            valueType: getType(context.value)
          })
        ]
      });
    }
  }
  return errors;
}
function maximum(context) {
  const errors = [];
  const maximum2 = getSchemaMaximum(context.schema);
  if (isNumber(context.value) && isSet(maximum2)) {
    const invalid = context.value > maximum2;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "maximum",
        messages: [
          compileTemplate(context.translator.translate("errorMaximum"), {
            maximum: maximum2
          })
        ]
      });
    }
  }
  return errors;
}
function uniqueItems(context) {
  const errors = [];
  const uniqueItems2 = getSchemaUniqueItems(context.schema);
  if (isArray(context.value) && isSet(uniqueItems2) && uniqueItems2 === true) {
    const seen = [];
    let hasDuplicatedItems = false;
    for (let i = 0; i < context.value.length; i++) {
      let item = context.value[i];
      if (isObject(item)) {
        item = sortObject(item);
      }
      const itemStringified = JSON.stringify(item);
      hasDuplicatedItems = seen.some((seen2) => seen2 === itemStringified);
      if (hasDuplicatedItems) {
        break;
      } else {
        seen.push(itemStringified);
      }
    }
    const invalid = hasDuplicatedItems;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "uniqueItems",
        messages: [
          context.translator.translate("errorUniqueItems")
        ]
      });
    }
  }
  return errors;
}
function additionalProperties(context) {
  const errors = [];
  const schemaAdditionalProperties = getSchemaAdditionalProperties(context.schema);
  const schemaPatternProperties = getSchemaPatternProperties(context.schema);
  const schemaProperties = getSchemaProperties(context.schema);
  if (isObject(context.value) && isSet(schemaAdditionalProperties)) {
    const properties2 = schemaProperties || {};
    const additionalProperties2 = schemaAdditionalProperties;
    const patternProperties2 = schemaPatternProperties || {};
    Object.keys(context.value).forEach((property) => {
      const definedInPatternProperty = Object.keys(patternProperties2).some((pattern2) => {
        const regexp = new RegExp(pattern2);
        return regexp.test(property);
      });
      const isDefinedInProperties = hasOwn(properties2, property);
      if (!definedInPatternProperty && !isDefinedInProperties) {
        if (additionalProperties2 === false) {
          errors.push({
            type: "error",
            path: context.path,
            constraint: "additionalProperties",
            messages: [
              compileTemplate(context.translator.translate("errorAdditionalProperties"), { property })
            ]
          });
        } else if (isObject(additionalProperties2)) {
          const additionalPropertyErrors = context.validator.getErrors(context.value[property], additionalProperties2, property, context.path + "/" + property).map((error) => ({
            type: "error",
            path: `${context.path}.${property}`,
            constraint: "additionalProperties",
            messages: error.messages
          }));
          errors.push(...additionalPropertyErrors);
        }
      }
    });
  }
  return errors;
}
const draft04 = {
  additionalProperties,
  allOf,
  anyOf,
  enum: _enum,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  items,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  patternProperties,
  properties,
  required,
  type,
  uniqueItems
};
function _const(context) {
  const errors = [];
  const schemaConst = getSchemaConst(context.schema);
  if (isSet(schemaConst)) {
    const valueIsNotEqualConst = different(context.value, schemaConst);
    const invalid = valueIsNotEqualConst;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "const",
        messages: [
          compileTemplate(context.translator.translate("errorConst"), {
            const: JSON.stringify(schemaConst)
          })
        ]
      });
    }
  }
  return errors;
}
function contains(context) {
  const errors = [];
  const contains2 = getSchemaContains(context.schema);
  const minContains = getSchemaMinContains(context.schema);
  const maxContains = getSchemaMaxContains(context.schema);
  if (isArray(context.value) && isSet(contains2)) {
    let counter = 0;
    context.value.forEach((item, index2) => {
      const containsErrors = context.validator.getErrors(item, contains2, index2, context.path + "/" + index2);
      if (containsErrors.length === 0) {
        counter++;
      }
    });
    const containsInvalid = counter === 0;
    if (isSet(minContains)) {
      const minContainsInvalid = counter < minContains;
      if (minContainsInvalid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "minContains",
          messages: [
            compileTemplate(context.translator.translate("errorMinContains"), {
              counter,
              minContains
            })
          ]
        });
      }
    } else {
      if (containsInvalid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "contains",
          messages: [context.translator.translate("errorContains")]
        });
      }
    }
    if (isSet(maxContains)) {
      const maxContainsInvalid = counter > maxContains;
      if (maxContainsInvalid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "maxContains",
          messages: [
            compileTemplate(context.translator.translate("errorMaxContains"), {
              counter,
              maxContains
            })
          ]
        });
      }
    }
  }
  return errors;
}
function dependentRequired(context) {
  const errors = [];
  const dependentRequired2 = getSchemaDependentRequired(context.schema);
  if (isObject(context.value) && isSet(dependentRequired2)) {
    let missingProperties = [];
    Object.keys(dependentRequired2).forEach((key) => {
      if (isSet(context.value[key])) {
        const requiredProperties = dependentRequired2[key];
        if (isArray(requiredProperties)) {
          missingProperties = requiredProperties.filter((property) => {
            return !hasOwn(context.value, property);
          });
        }
      }
    });
    const invalid = missingProperties.length > 0;
    if (invalid) {
      errors.push({
        type: "error",
        path: context.path,
        constraint: "dependentRequired",
        messages: [
          compileTemplate(context.translator.translate("errorDependentRequired"), {
            dependentRequired: missingProperties.join(", ")
          })
        ]
      });
    }
  }
  return errors;
}
function dependentSchemas(context) {
  let errors = [];
  const dependentSchemas2 = getSchemaDependentSchemas(context.schema);
  if (isObject(context.value) && isSet(dependentSchemas2)) {
    Object.keys(dependentSchemas2).forEach((key) => {
      if (isSet(context.value[key])) {
        const dependentSchema = dependentSchemas2[key];
        const tmpErrors = context.validator.getErrors(context.value, dependentSchema, context.key, context.path);
        errors = [...errors, ...tmpErrors];
      }
    });
  }
  return errors;
}
function ifThenElse(context) {
  const schemaIf = getSchemaIf(context.schema);
  const schemaThen = getSchemaThen(context.schema);
  const schemaElse = getSchemaElse(context.schema);
  if (isSet(schemaIf)) {
    if (notSet(schemaThen) && notSet(schemaElse)) {
      return [];
    }
    if (schemaIf === true) {
      return isSet(schemaThen) ? context.validator.getErrors(context.value, schemaThen, context.key, context.path) : [];
    }
    if (schemaIf === false) {
      return isSet(schemaElse) ? context.validator.getErrors(context.value, schemaElse, context.key, context.path) : [];
    }
    const ifErrors = context.validator.getErrors(context.value, schemaIf, context.key, context.path);
    if (ifErrors.length === 0) {
      return isSet(schemaThen) ? context.validator.getErrors(context.value, schemaThen, context.key, context.path) : [];
    }
    return isSet(schemaElse) ? context.validator.getErrors(context.value, schemaElse, context.key, context.path) : [];
  }
  return [];
}
function prefixItems(context) {
  const errors = [];
  const prefixItems2 = getSchemaPrefixItems(context.schema);
  if (isArray(context.value) && isSet(prefixItems2)) {
    const enableSubErrors = getSchemaXOption(context.schema, "subErrors") ?? context.validator.subErrors;
    prefixItems2.forEach((itemSchema, index2) => {
      const itemValue = context.value[index2];
      if (isSet(itemValue)) {
        const tmpErrors = context.validator.getErrors(itemValue, itemSchema, index2, context.path + "/" + index2);
        if (tmpErrors.length > 0) {
          const error = {
            type: "error",
            path: context.path,
            constraint: "prefixItems",
            messages: [
              compileTemplate(context.translator.translate("errorPrefixItems"), {
                index: index2
              })
            ]
          };
          if (enableSubErrors) {
            error.subErrors = tmpErrors;
          }
          errors.push(error);
        }
      }
    });
  }
  return errors;
}
const draft06 = {
  additionalProperties,
  allOf,
  anyOf,
  const: _const,
  contains,
  dependentRequired,
  dependentSchemas,
  enum: _enum,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  if: ifThenElse,
  items,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  patternProperties,
  properties,
  prefixItems,
  required,
  type,
  uniqueItems
};
const draft07 = {
  additionalProperties,
  allOf,
  anyOf,
  const: _const,
  contains,
  dependentRequired,
  dependentSchemas,
  enum: _enum,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  if: ifThenElse,
  items,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  patternProperties,
  properties,
  prefixItems,
  required,
  type,
  uniqueItems
};
function unevaluatedProperties(context) {
  let errors = [];
  const schemaUnevaluatedProperties = getSchemaUnevaluatedProperties(context.schema);
  const schemaPatternProperties = getSchemaPatternProperties(context.schema);
  const schemaProperties = getSchemaProperties(context.schema);
  const schemaAllOf = getSchemaAllOf(context.schema);
  const schemaAnyOf = getSchemaAnyOf(context.schema);
  const schemaOneOf = getSchemaOneOf(context.schema);
  if (isObject(context.value) && isSet(schemaUnevaluatedProperties)) {
    let properties2 = isSet(schemaProperties) ? schemaProperties : {};
    const unevaluatedProperties2 = schemaUnevaluatedProperties;
    const patternProperties2 = schemaPatternProperties;
    const ofSchemas = [
      schemaAllOf,
      schemaAnyOf,
      schemaOneOf
    ];
    ofSchemas.forEach((subSchema) => {
      if (isSet(subSchema)) {
        subSchema.forEach((subschema) => {
          if (isSet(subschema["properties"])) {
            properties2 = { ...properties2, ...subschema["properties"] };
          }
        });
      }
    });
    if (properties2) {
      Object.keys(context.value).forEach((property) => {
        let definedInPatternProperty = false;
        if (isSet(patternProperties2)) {
          Object.keys(patternProperties2).forEach((pattern2) => {
            const regexp = new RegExp(pattern2);
            definedInPatternProperty = regexp.test(property);
          });
        }
        if (!definedInPatternProperty && unevaluatedProperties2 === false && !hasOwn(properties2, property)) {
          errors.push({
            type: "error",
            path: context.path,
            constraint: "unevaluatedProperties",
            messages: [
              compileTemplate(context.translator.translate("errorUnevaluatedProperties"), {
                property
              })
            ]
          });
        }
        if (!definedInPatternProperty && isObject(unevaluatedProperties2) && !hasOwn(properties2, property)) {
          const unevaluatedPropertiesErrors = context.validator.getErrors(context.value[property], unevaluatedProperties2, property, context.path + "/" + property).map((error) => {
            return {
              type: "error",
              path: property,
              constraint: "unevaluatedProperties",
              messages: error.messages
            };
          });
          errors = [...errors, ...unevaluatedPropertiesErrors];
        }
      });
    }
  }
  return errors;
}
const draft201909 = {
  additionalProperties,
  allOf,
  anyOf,
  const: _const,
  contains,
  dependentRequired,
  dependentSchemas,
  enum: _enum,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  if: ifThenElse,
  items,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  patternProperties,
  propertie: properties,
  prefixItems,
  required,
  type,
  unevaluatedProperties,
  uniqueItems
};
function propertyNames(context) {
  const errors = [];
  const schemaPropertyNames = getSchemaPropertyNames(context.schema);
  if (isObject(context.value) && isSet(schemaPropertyNames)) {
    Object.keys(context.value).forEach((propertyName) => {
      const invalid = context.validator.getErrors(propertyName, schemaPropertyNames, propertyName, context.path).length > 0;
      if (invalid) {
        errors.push({
          type: "error",
          path: context.path,
          constraint: "propertyNames",
          messages: [
            compileTemplate(context.translator.translate("errorPropertyNames"), { propertyName })
          ]
        });
      }
    });
  }
  return errors;
}
const draft202012 = {
  additionalProperties,
  allOf,
  anyOf,
  const: _const,
  contains,
  dependentRequired,
  dependentSchemas,
  enum: _enum,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  if: ifThenElse,
  items,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  patternProperties,
  prefixItems,
  propertyNames,
  properties,
  required,
  type,
  unevaluatedProperties,
  uniqueItems
};
class Validator {
  constructor(config = {}) {
    this.refParser = config.refParser;
    this.constraints = config.constraints ?? {};
    this.assertFormat = config.assertFormat ? config.assertFormat : false;
    this.translator = config.translator ? config.translator : false;
    this.subErrors = config.subErrors ?? false;
    this.draft = draft202012;
    this.jsonSchemaDrafts = {
      "http://json-schema.org/draft-04/schema#": draft04,
      "http://json-schema.org/draft-06/schema#": draft06,
      "http://json-schema.org/draft-07/schema#": draft07,
      "https://json-schema.org/draft/2019-09/schema": draft201909,
      "https://json-schema.org/draft/2020-12/schema": draft202012
    };
  }
  /**
   * Validates a value against it's schema
   */
  getErrors(value, schema, key, path) {
    let schemaErrors = [];
    if (isBoolean(schema) && schema === true) {
      return schemaErrors;
    }
    if (isBoolean(schema) && schema === false) {
      return [{
        type: "error",
        messages: ["invalid"],
        path
      }];
    }
    if (this.refParser && isObject(schema) && hasOwn(schema, "$ref")) {
      schema = this.refParser.expand(schema);
    }
    const allConstraints = { ...this.draft, ...this.constraints };
    for (const [constraintName, constraint] of Object.entries(allConstraints)) {
      if (hasOwn(schema, constraintName)) {
        const context = {
          validator: this,
          value,
          schema,
          key,
          path,
          translator: this.translator
        };
        const validatorErrors = constraint(context);
        if (validatorErrors) {
          schemaErrors = [...schemaErrors, ...validatorErrors];
        }
      }
    }
    const schemaOptionsMessages = getSchemaXOption(schema, "messages");
    if (isSet(schemaOptionsMessages)) {
      if (isObject(schemaOptionsMessages)) {
        schemaErrors.forEach((schemaError) => {
          var _a, _b;
          const schemaMessageListedByLanguage = (_b = schemaOptionsMessages == null ? void 0 : schemaOptionsMessages[(_a = this.translator) == null ? void 0 : _a.language]) == null ? void 0 : _b[schemaError == null ? void 0 : schemaError.constraint];
          const schemaMessageListedByConstraint = schemaOptionsMessages == null ? void 0 : schemaOptionsMessages[schemaError == null ? void 0 : schemaError.constraint];
          const schemaMessage = schemaMessageListedByLanguage ?? schemaMessageListedByConstraint;
          if (isSet(schemaMessage)) {
            schemaError.messages = [
              schemaMessage
            ];
          }
          return schemaError;
        });
      }
      if (isArray(schemaOptionsMessages) && schemaErrors.length > 0) {
        schemaErrors.forEach((schemaError) => {
          schemaError.messages = schemaOptionsMessages;
          return schemaError;
        });
      }
    }
    return schemaErrors;
  }
}
class EventEmitter {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Adds a named event listener
   * @public
   * @param {string} name - The name of the event
   * @param {function} callback - A callback functions that will be executed when this event is emitted
   */
  on(name, callback) {
    let callbacks = this.listeners.get(name);
    if (!callbacks) {
      callbacks = [];
      this.listeners.set(name, callbacks);
    }
    callbacks.push(callback);
  }
  off(name) {
    this.listeners.delete(name);
  }
  /**
   * Triggers the callback function of a named event listener
   * @public
   * @param {string} name - The name of the event to be emitted
   * @param {...*} args - Arguments to be passed to the callback function
   */
  emit(name, ...args) {
    const callbacks = this.listeners.get(name);
    if (callbacks) {
      for (const listener of callbacks) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in listener callback for event "${name}":`, error);
        }
      }
    }
  }
  /**
   * Deletes all properties of the class
   */
  destroy() {
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
}
class Instance extends EventEmitter {
  constructor(config) {
    super();
    this.jedison = config.jedison;
    this.path = config.path || this.jedison.rootName;
    this.schema = config.schema;
    this.originalSchema = config.originalSchema ?? clone(config.schema);
    this.value = isSet(config.value) ? config.value : void 0;
    this.isActive = true;
    this.parent = config.parent || null;
    this.children = [];
    this.ui = null;
    this.isDirty = false;
    this.watched = {};
    this.key = this.path.split(this.jedison.pathSeparator).pop();
    this.arrayTemplateData = config.arrayTemplateData || {};
    this.init();
  }
  /**
   * Initializes and register the instance
   */
  init() {
    this.register();
    this.setInitialValue();
    this.prepare();
    this.setDefaultValue();
    this.registerWatcher();
    this.setValueFormTemplate();
    if (this.jedison.getOption("container")) {
      this.setUI();
    }
    this.on("notifyParent", (initiator) => {
      if (this.parent) {
        this.parent.isDirty = true;
        this.parent.onChildChange(initiator);
      }
    });
  }
  /**
   * Sets the instance ui property. UI can be an editor instance or similar
   */
  setUI() {
    if (this.jedison.isEditor) {
      const EditorClass = this.jedison.uiResolver.getClass(this.schema);
      this.ui = new EditorClass(this);
    }
  }
  /**
   * Return the last part of the instance path
   */
  getKey() {
    return this.key;
  }
  /**
   * Return the instance schema
   */
  getSchema() {
    return this.schema;
  }
  /**
   * Adds a child instance pointer to the instance list
   */
  register() {
    this.jedison.register(this);
    if (this.children.length === 0) return;
    const registerChildRecursive = (child) => {
      this.jedison.register(child);
      if (child.children.length > 0) {
        child.children.forEach(registerChildRecursive);
      }
    };
    this.children.forEach(registerChildRecursive);
  }
  /**
   * Deletes a child instance pointer from the instance list
   */
  unregister() {
    this.jedison.unregister(this);
    if (this.children.length === 0) return;
    const unregisterChildRecursive = (child) => {
      this.jedison.unregister(child);
      if (child.children.length > 0) {
        child.children.forEach(unregisterChildRecursive);
      }
    };
    this.children.forEach(unregisterChildRecursive);
  }
  /**
   * Sets the default value of the instance based on it's type
   */
  setInitialValue() {
    const enforceEnum = getSchemaXOption(this.schema, "enforceEnum") ?? this.jedison.getOption("enforceEnum");
    const schemaEnum = getSchemaEnum(this.schema);
    if (isSet(schemaEnum) && !schemaEnum.includes(this.getValueRaw()) && isSet(schemaEnum[0]) && enforceEnum) {
      this.setValue(schemaEnum[0], false);
    }
    if (notSet(this.value)) {
      let value;
      const schemaType = getSchemaType(this.schema);
      if (schemaType === "boolean") value = false;
      if (schemaType === "number") value = 0;
      if (schemaType === "integer") value = 0;
      if (schemaType === "string") value = "";
      if (schemaType === "array") value = [];
      if (schemaType === "object") value = {};
      if (schemaType === "null") value = null;
      this.value = value;
    }
  }
  setDefaultValue() {
    const schemaDefault = getSchemaDefault(this.schema);
    if (isSet(schemaDefault)) {
      this.setValue(schemaDefault, false);
    }
    const enforceConst = getSchemaXOption(this.schema, "enforceConst") ?? this.jedison.getOption("enforceConst");
    if (isSet(enforceConst) && equal(enforceConst, true)) {
      const schemaConst = getSchemaConst(this.schema);
      if (isSet(schemaConst)) {
        this.setValue(schemaConst, false);
      }
    }
  }
  registerWatcher() {
    const watch = getSchemaXOption(this.schema, "watch");
    if (!isSet(watch)) return;
    Object.entries(watch).forEach(([name, path]) => {
      this.jedison.watch(path, () => {
        this.updateWatchedData(name, path);
      });
    });
  }
  updateWatchedData(name, path) {
    const instance = this.jedison.getInstance(path);
    if (!isSet(instance)) {
      return;
    }
    if (instance) {
      this.watched[name] = {
        value: instance.getValue(),
        schema: instance.getSchema(),
        properties: instance.schema.properties ? Object.keys(instance.schema.properties) : []
      };
    }
    this.setValueFormTemplate();
  }
  setValueFormTemplate() {
    const template = getSchemaXOption(this.schema, "template");
    if (!isSet(template)) return;
    if (template) {
      this.setValue(compileTemplate(template, this.watched));
    }
  }
  /**
   * Returns the value of the instance
   */
  getValue() {
    return clone(this.value);
  }
  /**
   * Returns the value of the instance without cloning (internal read-only use)
   */
  getValueRaw() {
    return this.value;
  }
  /**
   * Returns the data that will replace placeholders in titles, descriptions (e.g. "{{ i1 }} {{ value.title }}")
   */
  getTemplateData(template) {
    const templateData = {
      ...this.arrayTemplateData,
      value: this.getValueRaw(),
      settings: this.jedison.getOption("settings")
    };
    if (typeof this.value === "string") {
      templateData.length = this.value.length;
      if (typeof this.schema.maxLength === "number") {
        templateData.remaining = this.schema.maxLength - this.value.length;
      }
    }
    if (template == null ? void 0 : template.includes("{{ functions.")) {
      templateData.functions = this.resolveTemplateFunctions(
        this.jedison.getOption("functions")
      );
    }
    if (this.parent) {
      templateData.parent = this.parent.getTemplateData();
    }
    return templateData;
  }
  resolveTemplateFunctions(functionsObject = {}) {
    const context = {
      instance: this
    };
    return Object.fromEntries(Object.entries(functionsObject).map(([functionName, functionValue]) => [functionName, functionValue(context)]));
  }
  purify(value) {
    if (typeof value === "string" && this.jedison.getOption("purifyData") && typeof window !== "undefined" && window.DOMPurify) {
      value = window.DOMPurify.sanitize(value);
    }
    return value;
  }
  /**
   * Sets the instance value
   * @returns {*} The final value after constraint enforcement
   */
  setValue(newValue, notifyParent = true, initiator = "api") {
    if (this.value === newValue) {
      return this.value;
    }
    const purifiedValue = this.purify(newValue);
    const wasPurified = newValue !== purifiedValue;
    newValue = purifiedValue;
    const enforceConst = getSchemaXOption(this.schema, "enforceConst") ?? this.jedison.getOption("enforceConst");
    if (isSet(enforceConst) && equal(enforceConst, true)) {
      const schemaConst = getSchemaConst(this.schema);
      if (isSet(schemaConst)) {
        newValue = schemaConst;
      }
    }
    if (!wasPurified && !different(this.value, newValue)) {
      return this.value;
    }
    this.value = newValue;
    this.isDirty = true;
    this.emit("set-value", newValue, initiator);
    this.emit("change", initiator);
    this.jedison.emit("instance-change", this, initiator);
    if (notifyParent) {
      this.emit("notifyParent", initiator);
    }
    return this.value;
  }
  /**
   * Fires when a child's instance state changes
   */
  onChildChange(initiator) {
  }
  /**
   * Returns an array of validation error messages
   */
  getErrors() {
    if (!this.isActive) {
      return [];
    }
    let ancestor = this.parent;
    while (ancestor) {
      if (!ancestor.isActive) {
        return [];
      }
      ancestor = ancestor.parent;
    }
    return removeDuplicatesFromArray(
      this.jedison.validator.getErrors(this.getValueRaw(), this.originalSchema, this.getKey(), this.path)
    );
  }
  /**
   * Returns true if any leaf descendant is showing validation errors.
   * Only checks leaves to avoid stale container-level constraint flags.
   */
  hasNestedValidationErrors() {
    if (this.children.length === 0) {
      return !!(this.ui && this.ui.showingValidationErrors);
    }
    return this.children.some((child) => child.hasNestedValidationErrors());
  }
  /**
   * Prepare data before building the editor
   */
  prepare() {
  }
  /**
   * Activates the instance
   */
  activate() {
    if (this.isActive === false) {
      this.isActive = true;
      this.emit("notifyParent");
    }
  }
  /**
   * Deactivates the instance
   */
  deactivate() {
    if (this.isActive === true) {
      this.isActive = false;
      this.emit("notifyParent");
    }
  }
  /**
   * Returns true if this instance is read only
   */
  isReadOnly() {
    if (getSchemaReadOnly(this.schema) === true) {
      return true;
    }
    return this.parent ? this.parent.isReadOnly() : false;
  }
  /**
   * Destroy the instance and it's children
   */
  destroy() {
    this.unregister();
    this.listeners = null;
    if (this.children.length > 0) {
      this.children.forEach((child) => child.destroy());
      this.children = [];
    }
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    Object.keys(this).forEach((key) => {
      this[key] = null;
    });
    super.destroy();
  }
}
class Editor {
  constructor(instance) {
    this.instance = instance;
    this.theme = null;
    this.control = null;
    this.disabled = false;
    this.readOnly = this.instance.isReadOnly();
    this.showingValidationErrors = false;
    this.markdownEnabled = false;
    this.purifyEnabled = false;
    this.title = null;
    this.description = null;
    this.storedEventListeners = [];
    this.init();
    this.build();
    this.setAttributes();
    this.setReadOnlyAttribute();
    this.addEventListeners();
    this.setVisibility();
    this.setContainerAttributes();
    this.refreshUI();
    const alwaysShowErrors = this.instance.jedison.getOption("showErrors") === "always" || getSchemaXOption(this.instance.schema, "showErrors") === "always";
    if (alwaysShowErrors) {
      this.showValidationErrors(this.instance.getErrors());
    }
    const valueChangeHandler = () => {
      this.refreshUI();
      this.showValidationErrors(this.instance.getErrors());
    };
    this.instance.on("change", valueChangeHandler);
  }
  static resolves(schema) {
  }
  /**
   * Initializes the editor
   */
  init() {
    this.theme = this.instance.jedison.theme;
    this.markdownEnabled = getSchemaXOption(this.instance.schema, "parseMarkdown") ?? this.instance.jedison.getOption("parseMarkdown");
    this.purifyEnabled = getSchemaXOption(this.instance.schema, "purifyHtml") ?? this.instance.jedison.getOption("purifyHtml");
  }
  /**
   * Gets the json path level by counting how many "/" it has
   */
  getLevel() {
    return (this.instance.path.match(/\//g) || []).length;
  }
  setVisibility() {
    const schemaOptionHidden = getSchemaXOption(this.instance.schema, "hidden");
    if (isSet(schemaOptionHidden) && schemaOptionHidden === true) {
      this.control.container.style.display = "none";
      this.control.container.setAttribute("aria-hidden", "true");
    }
  }
  /**
   * Sets container attributes like data-path and data-type
   */
  setContainerAttributes() {
    this.control.container.setAttribute("data-level", this.getLevel());
    this.control.container.setAttribute("data-path", this.instance.path);
    this.control.container.setAttribute("data-type", getSchemaType(this.instance.schema));
    const schemaContainerAttributes = getSchemaXOption(this.instance.schema, "containerAttributes");
    if (isSet(schemaContainerAttributes) && isObject(schemaContainerAttributes)) {
      for (const [key, value] of Object.entries(schemaContainerAttributes)) {
        if (key === "class") {
          const classes = value.split(" ");
          classes.forEach((cls) => {
            this.control.container.classList.add(cls);
          });
        } else {
          this.control.container.setAttribute(key, value);
        }
      }
    }
  }
  /**
   * Builds the editor control and appends it to the editor container
   */
  build() {
  }
  adaptForTable() {
  }
  /**
   * Adds attributes to generated html elements if specified in schema x-options
   */
  setAttributes() {
    const input = this.control.input;
    if (isSet(input)) {
      const inputAttributes = getSchemaXOption(this.instance.schema, "inputAttributes");
      if (isObject(inputAttributes)) {
        for (const [key, value] of Object.entries(inputAttributes)) {
          input.setAttribute(key, value);
        }
      }
    }
  }
  setReadOnlyAttribute() {
    if (this.readOnly) {
      const inputElements = this.control.container.querySelectorAll("input, textarea, select");
      inputElements.forEach((element) => {
        element.setAttribute("always-disabled", "");
      });
    }
  }
  getIdFromPath(path) {
    const optionId = this.instance.jedison.getOption("id");
    return optionId ? optionId + "-" + pathToAttribute(path) : pathToAttribute(path);
  }
  /**
   * Determines the event type to use for validation trigger based on showErrors option
   * @returns {string} - 'input' or 'change'
   */
  getValidationEventType() {
    const showErrors = getSchemaXOption(this.instance.schema, "showErrors") ?? this.instance.jedison.getOption("showErrors");
    return showErrors === "input" ? "input" : "change";
  }
  /**
   * Add event listeners to ui elements
   */
  addEventListeners() {
  }
  /**
   * Clears any stored event listeners that might persist
   * This method can be overridden by subclasses to provide custom cleanup logic
   */
  clearStoredEventListeners() {
    if (this.storedEventListeners) {
      this.storedEventListeners.forEach((listener) => {
        if (listener.element && listener.handler) {
          listener.element.removeEventListener(listener.eventType || "click", listener.handler);
        }
      });
    }
    this.storedEventListeners = [];
  }
  /**
   * Shows validation error messages in the editor container.
   */
  showValidationErrors(errors, force = false) {
    errors = errors.filter((error) => {
      return error.path === this.instance.path;
    });
    this.control.messages.innerHTML = "";
    this.showingValidationErrors = false;
    this.setAriaInvalid(false);
    const neverShowErrors = this.instance.jedison.getOption("showErrors") === "never" || getSchemaXOption(this.instance.schema, "showErrors") === "never";
    if (neverShowErrors && !force || errors.length === 0) {
      return;
    }
    const muteValidationMessages = getSchemaXOption(this.instance.schema, "muteValidationMessages") ?? this.instance.jedison.getOption("muteValidationMessages") ?? [];
    let hasErrors = false;
    errors.forEach((error) => {
      if (muteValidationMessages.includes(error.constraint)) {
        return;
      }
      error.messages.forEach((message) => {
        let invalidFeedback;
        if (error.type === "error") {
          hasErrors = true;
          invalidFeedback = this.getErrorFeedback({
            message
          });
        } else {
          invalidFeedback = this.getWarningFeedback({
            message
          });
        }
        this.control.messages.appendChild(invalidFeedback);
      });
    });
    if (hasErrors) {
      this.setAriaInvalid(true);
    }
    this.showingValidationErrors = true;
  }
  setAriaInvalid(invalid) {
    if (this.control.input) {
      if (invalid) {
        this.control.input.setAttribute("aria-invalid", "true");
      } else {
        this.control.input.removeAttribute("aria-invalid");
      }
    }
  }
  /**
   * Get an error message container
   */
  getErrorFeedback(config) {
    return this.theme.getErrorFeedback(config);
  }
  /**
   * Get an error message container
   */
  getWarningFeedback(config) {
    return this.theme.getWarningFeedback(config);
  }
  /**
   * Disables the editor
   */
  disable() {
    this.disabled = true;
    this.refreshUI();
  }
  /**
   * Enables the editor
   */
  enable() {
    this.disabled = false;
    this.refreshUI();
  }
  /**
   * Clean out HTML tags from txt
   */
  purifyContent(content, domPurifyOptions) {
    if (this.instance.jedison.getOption("purifyHtml") && typeof window !== "undefined" && window.DOMPurify) {
      return window.DOMPurify.sanitize(content, domPurifyOptions);
    } else {
      const tmp = document.createElement("div");
      tmp.innerHTML = content;
      return tmp.textContent || tmp.innerText;
    }
  }
  getHtmlFromMarkdown(content) {
    return window.marked.parse(content);
  }
  getTitle() {
    let titleFromSchema = false;
    this.title = this.instance.getKey();
    const schemaTitle = getSchemaTitle(this.instance.schema);
    if (isSet(schemaTitle)) {
      this.title = schemaTitle;
      titleFromSchema = true;
    }
    if (titleFromSchema) {
      this.title = compileTemplate(this.title, this.instance.getTemplateData(this.title));
      this.title = this.markdownEnabled ? this.getHtmlFromMarkdown(this.title) : this.title;
      const domPurifyOptions = combineDeep({}, this.instance.jedison.getOption("domPurifyOptions"), {
        FORBID_TAGS: ["p"]
      });
      this.title = this.purifyEnabled ? this.purifyContent(this.title, domPurifyOptions) : this.title;
    }
    return this.title;
  }
  getDescription() {
    const schemaDescription = getSchemaDescription(this.instance.schema);
    if (isSet(schemaDescription)) {
      this.description = compileTemplate(schemaDescription, this.instance.getTemplateData(this.description));
      this.description = this.markdownEnabled ? this.getHtmlFromMarkdown(this.description) : this.description;
      const domPurifyOptions = this.instance.jedison.getOption("domPurifyOptions");
      this.description = this.purifyEnabled ? this.purifyContent(this.description, domPurifyOptions) : this.description;
    }
    return this.description;
  }
  getInfo(schema = null) {
    const _schema = schema ?? this.instance.schema;
    const schemaInfo = getSchemaXOption(_schema, "info");
    if (!isSet(schemaInfo)) {
      return schemaInfo;
    }
    const domPurifyOptions = this.instance.jedison.getOption("domPurifyOptions");
    if (isSet(schemaInfo.title)) {
      schemaInfo.title = this.markdownEnabled ? this.getHtmlFromMarkdown(schemaInfo.title) : schemaInfo.title;
      schemaInfo.title = this.purifyEnabled ? this.purifyContent(schemaInfo.title, domPurifyOptions) : schemaInfo.title;
    }
    if (isSet(schemaInfo.content)) {
      schemaInfo.content = this.markdownEnabled ? this.getHtmlFromMarkdown(schemaInfo.content) : schemaInfo.content;
      schemaInfo.content = this.purifyEnabled ? this.purifyContent(schemaInfo.content, domPurifyOptions) : schemaInfo.content;
    }
    return schemaInfo;
  }
  refreshLegendWarning() {
  }
  /**
   * Updates control UI when its state changes
   */
  refreshUI() {
    this.refreshDisabledState();
    this.refreshTemplates();
  }
  refreshDisabledState() {
    const interactiveElements = this.control.container.querySelectorAll("button, input, select, textarea");
    interactiveElements.forEach((element) => {
      if (this.disabled || this.readOnly || element.hasAttribute("always-disabled")) {
        element.setAttribute("disabled", "");
      } else {
        element.removeAttribute("disabled", "");
      }
      if (element.hasAttribute("always-enabled")) {
        element.removeAttribute("disabled", "");
      }
    });
  }
  refreshTemplates() {
    if (this.control.legendText && this.getTitle()) {
      this.control.legendText.innerHTML = this.getTitle();
    }
    if (this.control.labelText && this.getTitle()) {
      this.control.labelText.innerHTML = this.getTitle();
    }
    if (this.control.description && this.getDescription()) {
      this.control.description.innerHTML = this.getDescription();
    }
  }
  /**
   * Transforms the input value if necessary before value set
   */
  sanitize(value) {
    return value;
  }
  /**
   * Refreshes the JSON data input size to match content
   */
  refreshJsonDataInputSize() {
    if (this.control && this.control.jsonData && this.control.jsonData.input) {
      const input = this.control.jsonData.input;
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      setTimeout(() => {
        if (input) {
          input.scrollTop = 0;
        }
      });
    }
  }
  /**
   * Refreshes the JSON data input with current instance value
   */
  refreshJsonData() {
    if (this.control && this.control.jsonData && this.control.jsonData.input) {
      this.control.jsonData.input.value = JSON.stringify(this.instance.getValue(), null, 2);
    }
  }
  getNextChildPath(path) {
    const currentDepth = this.instance.path.split(this.instance.jedison.pathSeparator).length;
    const targetSegments = path.split(this.instance.jedison.pathSeparator);
    if (targetSegments.length <= currentDepth) return null;
    return targetSegments.slice(0, currentDepth + 1).join(this.instance.jedison.pathSeparator);
  }
  navigateTo(path) {
    if (path === this.instance.path) {
      this.control.container.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const nextChildPath = this.getNextChildPath(path);
    if (!nextChildPath) return;
    const child = this.instance.children.find((c) => c.path === nextChildPath);
    if (child == null ? void 0 : child.ui) {
      child.ui.navigateTo(path);
    }
  }
  /**
   * Destroys the editor
   */
  destroy() {
    this.clearStoredEventListeners();
    if (this.control.container && this.control.container.parentNode) {
      this.control.container.parentNode.removeChild(this.control.container);
    }
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
}
class EditorIfThenElse extends Editor {
  static resolves(schema) {
    const schemaIf = getSchemaIf(schema);
    return isSet(schemaIf);
  }
  build() {
    this.control = this.theme.getIfThenElseControl({
      title: "Options",
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      id: this.getIdFromPath(this.instance.path),
      description: getSchemaDescription(this.instance.schema)
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.childrenSlot.innerHTML = "";
    this.control.childrenSlot.appendChild(this.instance.activeInstance.ui.control.container);
    if (this.disabled || this.instance.isReadOnly()) {
      this.instance.activeInstance.ui.disable();
    } else {
      this.instance.activeInstance.ui.enable();
    }
  }
  getErrorFeedback(config) {
    return this.theme.getAlert(config);
  }
}
class InstanceIfThenElse extends Instance {
  setUI() {
    this.ui = new EditorIfThenElse(this);
  }
  prepare() {
    this.instances = [];
    this.instanceStartingValues = [];
    this.instanceWithoutIf = null;
    this.activeInstance = null;
    this.index = 0;
    this.schemas = [];
    this.ifThenElseSchemas = [];
    this.traverseSchema(this.schema);
    delete this.schema.if;
    delete this.schema.then;
    delete this.schema.else;
    this.ifThenElseSchemas.forEach((item) => {
      if (isSet(item.then)) {
        this.schemas.push(mergeDeep({}, clone(this.schema), item.then));
      }
      if (isSet(item.else)) {
        this.schemas.push(mergeDeep({}, clone(this.schema), item.else));
      }
    });
    const schemaClone = clone(this.schema);
    delete schemaClone.if;
    delete schemaClone.then;
    delete schemaClone.else;
    this.instanceWithoutIf = this.jedison.createInstance({
      jedison: this.jedison,
      schema: schemaClone,
      originalSchema: this.originalSchema,
      path: this.path,
      parent: this.parent,
      arrayTemplateData: this.arrayTemplateData
    });
    this.schemas.forEach((schema) => {
      const instance = this.jedison.createInstance({
        jedison: this.jedison,
        schema,
        originalSchema: this.originalSchema,
        path: this.path,
        parent: this.parent,
        arrayTemplateData: this.arrayTemplateData
      });
      this.instanceStartingValues.push(instance.getValue());
      this.instances.push(instance);
    });
    this.on("set-value", (value, initiator) => {
      this.changeValue(value, initiator);
    });
    const ifValue = this.instanceWithoutIf.getValueRaw();
    this.changeValue(ifValue);
  }
  changeValue(value, initiator = "api") {
    const withoutIf = this.getWithoutIfValueFromValue(value);
    const fittestIndex = this.getFittestIndex(withoutIf);
    const indexChanged = fittestIndex !== this.index;
    this.index = fittestIndex;
    this.activeInstance = this.instances[fittestIndex];
    this.activeInstance.register();
    this.instances.forEach((instance, index2) => {
      instance.off("notifyParent");
      if (instance.children && isObject(value)) {
        instance.children.forEach((child) => {
          const shouldUpdateValue = child.isMultiple && hasOwn(value, child.getKey());
          if (shouldUpdateValue) {
            child.setValue(value[child.getKey()], true, "api");
          }
        });
      }
      const startingValue = this.instanceStartingValues[index2];
      let instanceValue = value;
      if (isObject(startingValue) && isObject(value)) {
        if (indexChanged && initiator !== "api") {
          instanceValue = overwriteExistingProperties(startingValue, withoutIf);
        } else {
          const audacity = this.jedison.getOption("audacity");
          if (audacity && initiator === "api" && index2 === fittestIndex) {
            const prePassValue = mergeDeep({}, instance.getValue(), value);
            instance.setValue(prePassValue, false, "api");
          }
          const currentValue = instance.getValue();
          instanceValue = overwriteExistingProperties(currentValue, value);
        }
      }
      if (indexChanged) {
        this.jedison.updateInstancesWatchedData();
      }
      instance.setValue(instanceValue, false, initiator);
      instance.on("notifyParent", (initiator2) => {
        const value2 = instance.getValueRaw();
        this.changeValue(value2, initiator2);
        this.emit("notifyParent", initiator2);
        this.emit("change", initiator2);
      });
    });
    if (initiator === "api" && this.hasNullableFields(this.activeInstance)) {
      this.activeInstance.setValue(value, false, "secondary");
    }
    this.activeInstance.register();
    this.value = this.activeInstance.getValueRaw();
  }
  getWithoutIfValueFromValue(value) {
    let withoutIf = this.instanceWithoutIf.getValue();
    if (isObject(withoutIf) && isObject(value)) {
      withoutIf = overwriteExistingProperties(withoutIf, value);
      return withoutIf;
    }
    return value;
  }
  traverseSchema(schema) {
    const schemaIf = getSchemaIf(schema);
    if (isSet(schemaIf)) {
      const schemaThen = getSchemaThen(schema);
      const schemaElse = getSchemaElse(schema);
      this.ifThenElseSchemas.push({
        if: schemaIf,
        then: isSet(schemaThen) ? schemaThen : {}
      });
      this.ifThenElseSchemas.push({
        if: schemaIf,
        else: isSet(schemaElse) ? schemaElse : {}
      });
    }
  }
  /**
   * Check if an instance has nullable fields in its schema or children
   */
  hasNullableFields(instance) {
    if (!instance) return false;
    if (this.isNullableSchema(instance.schema)) {
      return true;
    }
    if (instance.children) {
      return instance.children.some((child) => this.hasNullableFields(child));
    }
    return false;
  }
  /**
   * Check if a schema is nullable (has x-format: 'number-nullable' or similar nullable formats)
   */
  isNullableSchema(schema) {
    if (!schema) return false;
    if (schema["x-format"] && schema["x-format"].includes("nullable")) {
      return true;
    }
    if (Array.isArray(schema.type) && schema.type.includes("null")) {
      return true;
    }
    if (schema.properties) {
      return Object.values(schema.properties).some((prop) => this.isNullableSchema(prop));
    }
    return false;
  }
  /**
   * Returns the index of the instance that has less validation errors
   */
  getFittestIndex(value) {
    let fittestIndex = this.index;
    const key = this.getKey();
    this.ifThenElseSchemas.forEach((schema, index2) => {
      if (schema.if === true) {
        fittestIndex = 0;
      } else if (schema.if === false) {
        fittestIndex = 1;
      } else {
        const testSchema = isSet(this.schema.type) ? { ...schema.if, type: this.schema.type } : schema.if;
        const ifErrors = this.jedison.validator.getErrors(value, testSchema, key, this.path);
        if (ifErrors.length === 0 && schema.then) {
          fittestIndex = index2;
        }
        if (ifErrors.length > 0 && schema.else) {
          fittestIndex = index2;
        }
      }
    });
    return fittestIndex;
  }
  hasNestedValidationErrors() {
    return this.activeInstance ? this.activeInstance.hasNestedValidationErrors() : false;
  }
  destroy() {
    if (this.instanceWithoutIf) {
      this.instanceWithoutIf.destroy();
    }
    this.instances.forEach((instance) => {
      instance.destroy();
    });
    super.destroy();
  }
}
class InstanceMultiple extends Instance {
  prepare() {
    this.instances = [];
    this.activeInstance = null;
    this.index = 0;
    this.schemas = [];
    this.switcherOptionValues = [];
    this.switcherOptionsLabels = [];
    this.isMultiple = true;
    this.on("set-value", () => {
      this.onSetValue();
    });
    const schemaType = getSchemaType(this.schema);
    if (isSet(getSchemaAnyOf(this.schema)) || isSet(getSchemaOneOf(this.schema))) {
      const schemasOf = isSet(getSchemaAnyOf(this.schema)) ? getSchemaAnyOf(this.schema) : getSchemaOneOf(this.schema);
      const schemaCopy = clone(this.schema);
      delete schemaCopy["anyOf"];
      delete schemaCopy["oneOf"];
      delete schemaCopy["options"];
      schemasOf.forEach((schema, index2) => {
        schema = { ...schemaCopy, ...schema };
        let switcherOptionsLabel = "Option-" + (index2 + 1);
        const switcherTitle = getSchemaXOption(schema, "switcherTitle");
        const schemaTitle = getSchemaTitle(schema);
        const schemaDescription = getSchemaDescription(schema);
        if (isSet(schemaDescription)) {
          switcherOptionsLabel = schemaDescription;
        }
        if (isSet(schemaTitle)) {
          switcherOptionsLabel = schemaTitle;
        }
        if (isSet(switcherTitle)) {
          switcherOptionsLabel = switcherTitle;
        }
        this.switcherOptionValues.push(index2);
        this.switcherOptionsLabels.push(switcherOptionsLabel);
        this.schemas.push(schema);
      });
    } else if (isArray(schemaType)) {
      schemaType.forEach((type2, index2) => {
        const schemaClone = mergeDeep(this.schema);
        const schema = {
          ...schemaClone,
          ...{ type: type2, title: type2[0].toUpperCase() + type2.slice(1) }
        };
        if (isSet(schemaClone.title)) {
          schema.title = schemaClone.title;
        }
        this.switcherOptionValues.push(index2);
        this.switcherOptionsLabels.push(type2.charAt(0).toUpperCase() + type2.slice(1));
        this.schemas.push(schema);
      });
    } else if (schemaType === "any" || !schemaType) {
      const schemaClone = clone(this.schema);
      this.schemas = [
        { ...schemaClone, ...{ type: "string" } },
        { ...schemaClone, ...{ type: "boolean" } },
        { ...schemaClone, ...{ type: "integer" } },
        { ...schemaClone, ...{ type: "number" } },
        { ...schemaClone, ...{ type: "array" } },
        { ...schemaClone, ...{ type: "object" } },
        { ...schemaClone, ...{ type: "null" } }
      ];
      this.schemas.forEach((schema, index2) => {
        this.switcherOptionValues.push(index2);
      });
      this.switcherOptionsLabels = [
        "String",
        "Boolean",
        "Integer",
        "Number",
        "Array",
        "Object",
        "Null"
      ];
    }
    this.schemas.forEach((schema) => {
      const instance = this.jedison.createInstance({
        jedison: this.jedison,
        schema,
        path: this.path,
        parent: this.parent,
        value: clone(this.value)
      });
      if (isSet(this.value)) {
        instance.setValue(this.value, false);
      }
      instance.unregister();
      instance.off("notifyParent");
      instance.on("notifyParent", (initiator) => {
        this.value = this.activeInstance.getValueRaw();
        this.emit("change", initiator);
        this.emit("notifyParent", initiator);
      });
      this.instances.push(instance);
      this.register();
    });
    const fittestIndex = this.getFittestIndex(this.value);
    this.switchInstance(fittestIndex, this.value);
  }
  switchInstance(index2, value, initiator = "api") {
    if (this.activeInstance) {
      this.activeInstance.children.forEach((child) => child.unregister());
    }
    this.index = index2;
    this.activeInstance = this.instances[index2];
    if (isSet(value)) {
      this.activeInstance.setValue(value, false, initiator);
    }
    this.activeInstance.children.forEach((child) => child.register());
    this.setValue(this.activeInstance.getValueRaw(), true, initiator);
  }
  onSetValue() {
    if (different(this.activeInstance.getValueRaw(), this.value)) {
      const fittestIndex = this.getFittestIndex(this.value);
      this.switchInstance(fittestIndex, this.value);
    }
  }
  /**
   * Returns the index of the instance that has less validation errors
   */
  getFittestIndex(value) {
    const discriminator = getSchemaXOption(this.schema, "discriminator");
    if (isSet(discriminator) && isObject(value)) {
      const propName = isString(discriminator) ? discriminator : discriminator.propertyName;
      const discriminatorValue = value[propName];
      if (isSet(discriminatorValue)) {
        for (let index2 = 0; index2 < this.schemas.length; index2++) {
          const schema = this.schemas[index2];
          const propSchema = schema.properties && schema.properties[propName];
          if (propSchema) {
            const propErrors = this.jedison.validator.getErrors(discriminatorValue, propSchema, propName, this.path);
            if (propErrors.length === 0) return index2;
          }
        }
      }
    }
    let fittestIndex;
    let championErrors;
    for (let index2 = 0; index2 < this.instances.length; index2++) {
      const instance = this.instances[index2];
      const testValue = isSet(value) ? value : instance.getValueRaw();
      const instanceErrors = this.jedison.validator.getErrors(testValue, instance.schema, this.getKey(), this.path);
      if (instanceErrors.length === 0) {
        fittestIndex = index2;
        break;
      }
      if (fittestIndex === void 0 || championErrors === void 0 || instanceErrors.length < championErrors.length) {
        fittestIndex = index2;
        championErrors = instanceErrors;
      }
    }
    return fittestIndex;
  }
  hasNestedValidationErrors() {
    return this.activeInstance ? this.activeInstance.hasNestedValidationErrors() : false;
  }
  destroy() {
    this.instances.forEach((instance) => {
      instance.destroy();
    });
    super.destroy();
  }
}
class InstanceBoolean extends Instance {
}
class InstanceObject extends Instance {
  prepare() {
    this.properties = {};
    this.requiredProperties = /* @__PURE__ */ new Set();
    this.schemaPatternProperties = getSchemaPatternProperties(this.schema);
    this.schemaAdditionalProperties = getSchemaAdditionalProperties(this.schema);
    const schemaProperties = getSchemaProperties(this.schema);
    const schemaRequired = getSchemaRequired(this.schema);
    const initialValue = clone(this.value);
    if (isSet(schemaProperties)) {
      Object.keys(schemaProperties).forEach((key) => {
        const schema = schemaProperties[key];
        this.properties[key] = { schema };
        let musstCreateChild = true;
        const isRecursive = isSet(schema["x-recursive"]);
        const optionsDeactivateNonRequired = this.jedison.getOption("deactivateNonRequired");
        const deactivateNonRequired = getSchemaXOption(this.schema, "deactivateNonRequired");
        const schemaDeactivateNonRequired = getSchemaXOption(schema, "deactivateNonRequired");
        const isReq = this.isRequired(key);
        if (!isReq && isSet(optionsDeactivateNonRequired) && optionsDeactivateNonRequired === true) {
          musstCreateChild = false;
        }
        if (!isReq && isSet(deactivateNonRequired) && deactivateNonRequired === true) {
          musstCreateChild = false;
        }
        if (!isReq && isSet(schemaDeactivateNonRequired) && schemaDeactivateNonRequired === true) {
          musstCreateChild = false;
        }
        if (!isReq && isRecursive) {
          musstCreateChild = false;
        }
        if (musstCreateChild) {
          this.createChild(schema, key, hasOwn(initialValue, key) ? initialValue[key] : void 0);
        }
      });
    }
    if (isSet(schemaRequired) && this.jedison.isEditor && this.jedison.getOption("enforceRequired") === true) {
      schemaRequired.forEach((requiredProperty) => {
        this.requiredProperties.add(requiredProperty);
        if (!hasOwn(this.properties, requiredProperty)) {
          this.properties[requiredProperty] = {};
          this.createChild({}, requiredProperty, hasOwn(initialValue, requiredProperty) ? initialValue[requiredProperty] : void 0);
        }
      });
    }
    this.refreshInstances();
    this.on("set-value", (value, initiator) => {
      this.addMissingRequiredPropertiesToValue(value);
      this.removeNotListedPropertiesFromValue(value);
      this.refreshInstances(initiator);
    });
  }
  removeNotListedPropertiesFromValue(value) {
    const schemaEnforceAdditionalProperties = getSchemaXOption(this.schema, "enforceAdditionalProperties");
    const enforceAdditionalProperties = isSet(schemaEnforceAdditionalProperties) ? schemaEnforceAdditionalProperties : this.jedison.getOption("enforceAdditionalProperties");
    const schemaAdditionalProperties = this.schemaAdditionalProperties;
    const schemaPatternProperties = this.schemaPatternProperties || {};
    if (this.jedison.isEditor && enforceAdditionalProperties && isSet(schemaAdditionalProperties) && schemaAdditionalProperties === false) {
      const compiledPatterns = Object.keys(schemaPatternProperties).map((p) => new RegExp(p));
      Object.keys(value).forEach((propertyName) => {
        const matchesPattern = compiledPatterns.some((re) => re.test(propertyName));
        if (!hasOwn(this.properties, propertyName) && !matchesPattern) {
          delete value[propertyName];
        }
      });
    }
  }
  addMissingRequiredPropertiesToValue(value) {
    const enforceRequired = getSchemaXOption(this.schema, "enforceRequired") ?? this.jedison.getOption("enforceRequired");
    if (this.jedison.isEditor && enforceRequired) {
      this.requiredProperties.forEach((propertyName) => {
        if (!hasOwn(value, propertyName)) {
          value[propertyName] = this.getChild(propertyName).getValue();
        }
      });
    }
  }
  /**
   * Returns true if the property is required
   */
  isRequired(property) {
    const schemaRequired = getSchemaRequired(this.schema);
    const inSchemaRequired = isSet(schemaRequired) && schemaRequired.includes(property);
    const inSchemaDependentRequired = this.isDependentRequired(property);
    return inSchemaRequired || inSchemaDependentRequired;
  }
  /**
   * Returns true if the property is dependent required
   */
  isDependentRequired(property) {
    const dependentRequired2 = getSchemaDependentRequired(this.schema);
    if (isSet(dependentRequired2)) {
      let missingProperties = [];
      Object.keys(dependentRequired2).forEach((key) => {
        if (isSet(this.value[key])) {
          const requiredProperties = dependentRequired2[key];
          if (isArray(requiredProperties)) {
            missingProperties = requiredProperties.filter((property2) => {
              return !hasOwn(this.value, property2);
            });
          }
        }
      });
      return missingProperties.includes(property);
    }
    return false;
  }
  createChild(schema, key, value, activate = false) {
    const instance = this.jedison.createInstance({
      jedison: this.jedison,
      schema,
      path: this.path + this.jedison.pathSeparator + key,
      parent: this,
      value: clone(value)
    });
    this.children.push(instance);
    this.value[key] = instance.getValue();
    const deactivateNonRequired = getSchemaXOption(this.schema, "deactivateNonRequired") ?? this.jedison.getOption("deactivateNonRequired");
    if (!this.isRequired(key) && isSet(deactivateNonRequired) && deactivateNonRequired === true && !activate) {
      instance.deactivate();
    }
    this.onChildChange();
    return instance;
  }
  deleteChild(key) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const instance = this.children[i];
      if (instance.getKey() === key) {
        instance.destroy();
        this.children.splice(i, 1);
        this.onChildChange();
      }
    }
  }
  getChild(key) {
    return this.children.find((instance) => {
      return key === instance.getKey().split(this.jedison.pathSeparator).pop();
    });
  }
  getPropertySchema(propertyName) {
    let schema;
    const schemaAdditionalProperties = this.schemaAdditionalProperties;
    const schemaProperties = getSchemaProperties(this.schema);
    const schemaPatternProperties = this.schemaPatternProperties;
    if (isSet(schemaProperties) && hasOwn(schemaProperties, propertyName)) {
      schema = schemaProperties[propertyName];
    } else if (isSet(schemaPatternProperties)) {
      for (const pattern2 of Object.keys(schemaPatternProperties)) {
        if (new RegExp(pattern2).test(propertyName)) {
          schema = schemaPatternProperties[pattern2];
          break;
        }
      }
    }
    if (notSet(schema) && isSet(schemaAdditionalProperties)) {
      schema = schemaAdditionalProperties;
    }
    if (notSet(schema)) {
      schema = {};
    }
    return schema;
  }
  onChildChange(initiator) {
    const value = {};
    this.children.forEach((child) => {
      if (child.isActive) {
        const propertyName = child.getKey();
        if (propertyName === "__proto__") {
          Object.defineProperty(value, propertyName, {
            value: child.getValueRaw(),
            enumerable: true
          });
        } else {
          value[propertyName] = child.getValueRaw();
        }
      }
    });
    this.value = value;
    this.jedison.emit("instance-change", this, initiator);
    this.emit("change", initiator);
    if (!this.refreshingInstances) {
      this.emit("notifyParent", initiator);
    }
  }
  /**
   * Sorts the children of the current instance based on their `propertyOrder` value in ascending order.
   * The sorting is done using the `propertyOrder` obtained from each child's schema, which should be a number.
   * If a child does not have a valid `propertyOrder` (i.e., the value is not a number), it will be placed after the child with a valid `propertyOrder`.
   * @returns {void} This function modifies the `children` array of the instance in place.
   */
  sortChildrenByPropertyOrder() {
    this.children = this.children.sort((a, b) => {
      const propertyOrderA = getSchemaXOption(a.schema, "propertyOrder");
      const propertyOrderB = getSchemaXOption(b.schema, "propertyOrder");
      const isValidNumberA = isNumber(propertyOrderA);
      const isValidNumberB = isNumber(propertyOrderB);
      if (!isValidNumberA && isValidNumberB) {
        return 1;
      }
      if (isValidNumberA && !isValidNumberB) {
        return -1;
      }
      if (propertyOrderA < propertyOrderB) {
        return -1;
      }
      if (propertyOrderA > propertyOrderB) {
        return 1;
      }
      return 0;
    });
  }
  refreshInstances(initiator) {
    const wasRefreshing = this.refreshingInstances;
    this.refreshingInstances = true;
    const value = this.getValue();
    if (!isObject(value)) {
      this.refreshingInstances = wasRefreshing;
      return;
    }
    const childMap = /* @__PURE__ */ new Map();
    for (const child of this.children) {
      childMap.set(child.getKey(), child);
    }
    Object.keys(value).forEach((propertyName) => {
      const child = childMap.get(propertyName);
      if (child) {
        child.activate();
        const oldValue = child.getValueRaw();
        const newValue = value[propertyName];
        if (different(oldValue, newValue)) {
          const finalValue = child.setValue(newValue, false, initiator);
          value[propertyName] = finalValue;
        }
      } else {
        const schema = this.getPropertySchema(propertyName);
        this.createChild(schema, propertyName, value[propertyName], true);
      }
    });
    for (let i = this.children.length - 1; i >= 0; i--) {
      const instance = this.children[i];
      const propertyName = instance.getKey();
      if (notSet(value[propertyName])) {
        if (childMap.has(propertyName)) {
          instance.deactivate();
        } else {
          this.deleteChild(propertyName);
        }
      }
    }
    this.sortChildrenByPropertyOrder();
    this.value = value;
    this.refreshingInstances = wasRefreshing;
  }
}
class InstanceArray extends Instance {
  prepare() {
    this.schemaItems = getSchemaItems(this.schema);
    if (isObject(this.schemaItems) && this.jedison.refParser && this.jedison.refParser.hasRef(this.schemaItems) && !this.schemaItems["x-recursive"]) {
      this.schemaItems = this.jedison.refParser.expand(this.schemaItems);
      this.schema.items = this.schemaItems;
    }
    this.schemaPrefixItems = getSchemaPrefixItems(this.schema);
    const schemaMinItems = getSchemaMinItems(this.schema);
    const schemaEnforceMinItems = getSchemaXOption(this.schema, "enforceMinItems");
    const enforceMinItems = isSet(schemaEnforceMinItems) ? schemaEnforceMinItems : this.jedison.getOption("enforceMinItems");
    const isEditor = this.jedison.isEditor;
    const hasEnforceMinItems = isSet(enforceMinItems) && enforceMinItems === true;
    const hasMinItems = isSet(schemaMinItems);
    if (isEditor && hasEnforceMinItems && hasMinItems) {
      for (let i = 0; i < schemaMinItems; i++) {
        this.addItem();
      }
    }
    this.refreshChildren();
    this.on("set-value", () => {
      this.refreshChildren();
    });
  }
  createItemInstance(index2) {
    let schema;
    const itemsCount = this.children.length;
    const schemaItems = this.schemaItems;
    const schemaPrefixItems = this.schemaPrefixItems;
    schema = isSet(schemaItems) ? schemaItems : {};
    const hasPrefixItemsSchema = isSet(schemaPrefixItems) && isSet(schemaPrefixItems[itemsCount]);
    if (hasPrefixItemsSchema) {
      schema = schemaPrefixItems[itemsCount];
    }
    return this.jedison.createInstance({
      jedison: this.jedison,
      schema,
      path: this.path + this.jedison.pathSeparator + itemsCount,
      parent: this,
      arrayTemplateData: {
        i0: index2,
        i1: index2 + 1
      }
    });
  }
  setDefaultValue() {
    const schemaDefault = getSchemaDefault(this.schema);
    if (isSet(schemaDefault)) {
      this.setValue(schemaDefault);
    }
  }
  move(fromIndex, toIndex, initiator) {
    const raw = this.getValueRaw();
    if (!isArray(raw)) {
      return;
    }
    const value = clone(raw);
    const item = value[fromIndex];
    value.splice(fromIndex, 1);
    value.splice(toIndex, 0, item);
    this.setValue(value, true, initiator);
    this.emit("item-move", initiator);
    this.jedison.emit("item-move", initiator);
  }
  addItem(initiator) {
    const tempEditor = this.createItemInstance();
    const raw = this.getValueRaw();
    const value = isArray(raw) ? clone(raw) : [];
    value.push(tempEditor.getValueRaw());
    tempEditor.destroy();
    this.setValue(value, true, initiator);
    const instance = this.children[this.children.length - 1];
    this.emit("item-add", initiator, instance);
    this.jedison.emit("item-add", initiator, instance);
  }
  addItemAfter(afterIndex, initiator) {
    const tempEditor = this.createItemInstance();
    const raw = this.getValueRaw();
    const value = isArray(raw) ? clone(raw) : [];
    value.splice(afterIndex + 1, 0, tempEditor.getValueRaw());
    tempEditor.destroy();
    this.setValue(value, true, initiator);
    const instance = this.children[afterIndex + 1];
    this.emit("item-add", initiator, instance);
    this.jedison.emit("item-add", initiator, instance);
  }
  deleteItem(itemIndex, initiator) {
    const raw = this.getValueRaw();
    if (!isArray(raw)) {
      return;
    }
    const currentValue = clone(raw);
    const newValue = currentValue.filter((item, index2) => index2 !== itemIndex);
    this.setValue(newValue, true, initiator);
    this.emit("item-delete", initiator);
    this.jedison.emit("item-delete", initiator);
  }
  onChildChange(initiator) {
    const value = [];
    this.children.forEach((child) => {
      value.push(child.getValueRaw());
    });
    this.value = value;
    this.jedison.emit("instance-change", this, initiator);
    this.emit("change", initiator);
    this.emit("notifyParent", initiator);
  }
  refreshChildren() {
    this.children = [];
    const value = this.getValueRaw();
    if (!isArray(value)) {
      return;
    }
    const correctedValues = [];
    value.forEach((itemValue, index2) => {
      const child = this.createItemInstance(index2);
      this.children.push(child);
      const finalValue = child.setValue(itemValue, false);
      correctedValues.push(finalValue);
    });
    this.value = correctedValues;
  }
}
class InstanceString extends Instance {
}
class InstanceNumber extends Instance {
}
class InstanceNull extends Instance {
}
const glyphicons = {
  properties: "glyphicon glyphicon-list",
  delete: "glyphicon glyphicon-trash",
  add: "glyphicon glyphicon-plus",
  moveUp: "glyphicon glyphicon-arrow-up",
  moveDown: "glyphicon glyphicon-arrow-down",
  collapse: "glyphicon glyphicon-chevron-down",
  expand: "glyphicon glyphicon-plus",
  // Expand set to plus
  drag: "glyphicon glyphicon-th",
  info: "glyphicon glyphicon-question-sign",
  close: "glyphicon glyphicon-remove",
  edit: "glyphicon glyphicon-pencil",
  save: "glyphicon glyphicon-floppy-disk",
  copy: "glyphicon glyphicon-copy"
};
const bootstrapIcons = {
  properties: "bi bi-card-list",
  delete: "bi bi-trash2",
  add: "bi bi-plus",
  moveUp: "bi bi-arrow-up",
  moveDown: "bi bi-arrow-down",
  collapse: "bi bi-chevron-down",
  expand: "bi bi-plus",
  drag: "bi bi-grip-vertical",
  info: "bi bi-question-circle",
  close: "bi bi-x",
  edit: "bi bi-pencil",
  save: "bi bi-floppy",
  copy: "bi bi-clipboard"
};
const fontAwesome3 = {
  properties: "icon-list",
  delete: "icon-trash",
  add: "icon-plus",
  moveUp: "icon-arrow-up",
  moveDown: "icon-arrow-down",
  collapse: "icon-chevron-down",
  expand: "icon-plus",
  drag: "icon-th",
  info: "icon-question-sign",
  close: "icon-remove",
  edit: "icon-pencil",
  save: "icon-save",
  copy: "icon-copy"
};
const fontAwesome4 = {
  properties: "fa fa-list",
  delete: "fa fa-trash-o",
  add: "fa fa-plus",
  moveUp: "fa fa-arrow-up",
  moveDown: "fa fa-arrow-down",
  collapse: "fa fa-chevron-down",
  expand: "fa fa-plus",
  drag: "fa fa-th",
  info: "fa fa-question-circle",
  close: "fa fa-times",
  edit: "fa fa-pencil",
  save: "fa fa-floppy-o",
  copy: "fa fa-clipboard"
};
const fontAwesome5 = {
  properties: "fas fa-list",
  delete: "fas fa-trash",
  add: "fas fa-plus",
  moveUp: "fas fa-arrow-up",
  moveDown: "fas fa-arrow-down",
  collapse: "fas fa-chevron-down",
  expand: "fas fa-plus",
  drag: "fas fa-grip-vertical",
  info: "fas fa-question-circle",
  close: "fas fa-times",
  edit: "fas fa-pencil-alt",
  save: "fas fa-save",
  copy: "fas fa-clipboard"
};
const fontAwesome6 = {
  properties: "fa-solid fa-list",
  delete: "fa-solid fa-trash",
  add: "fa-solid fa-plus",
  moveUp: "fa-solid fa-arrow-up",
  moveDown: "fa-solid fa-arrow-down",
  collapse: "fa-solid fa-chevron-down",
  expand: "fa-solid fa-plus",
  drag: "fa-solid fa-grip-vertical",
  info: "fa-solid fa-circle-question",
  close: "fa-solid fa-xmark",
  edit: "fa-solid fa-pencil",
  save: "fa-solid fa-floppy-disk",
  copy: "fa-solid fa-clipboard"
};
class EditorBoolean extends Editor {
  sanitize(value) {
    return Boolean(value);
  }
}
class EditorRadios extends EditorBoolean {
  static resolves(schema) {
    return getSchemaType(schema) === "boolean" && (getSchemaXOption(schema, "format") === "radios" || getSchemaXOption(schema, "format") === "radios-inline");
  }
  build() {
    this.control = this.theme.getRadiosControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values: ["false", "true"],
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || ["false", "true"],
      id: this.getIdFromPath(this.instance.path),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      inline: getSchemaXOption(this.instance.schema, "format") === "radios-inline",
      info: this.getInfo()
    });
  }
  adaptForTable() {
    this.theme.adaptForTableRadiosControl(this.control);
  }
  addEventListeners() {
    this.control.radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        const radioValue = radio.value === "true";
        this.instance.setValue(radioValue, true, "user");
      });
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.radios.forEach((radio) => {
      const radioValue = radio.value === "true";
      radio.checked = radioValue === this.instance.getValue();
    });
  }
  setAriaInvalid(invalid) {
    this.control.radios.forEach((radio) => {
      if (invalid) {
        radio.setAttribute("aria-invalid", "true");
      } else {
        radio.removeAttribute("aria-invalid");
      }
    });
  }
}
class EditorBooleanSelect extends EditorBoolean {
  static resolves(schema) {
    return getSchemaType(schema) === "boolean";
  }
  build() {
    this.control = this.theme.getSelectControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values: ["false", "true"],
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || ["false", "true"],
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
  }
  adaptForTable() {
    this.theme.adaptForTableSelectControl(this.control);
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      const value = this.control.input.value === "true";
      this.instance.setValue(value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.input.value = this.instance.getValue() === true ? "true" : "false";
  }
}
class EditorBooleanCheckbox extends EditorBoolean {
  static resolves(schema) {
    return getSchemaType(schema) === "boolean" && getSchemaXOption(schema, "format") === "checkbox";
  }
  build() {
    this.control = this.theme.getCheckboxControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
  }
  adaptForTable(td) {
    this.theme.adaptForTableCheckboxControl(this.control, td);
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      this.instance.setValue(this.control.input.checked, true, "user");
    });
  }
  sanitize(value) {
    return Boolean(value);
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.input.checked = this.instance.getValue();
  }
}
class EditorString extends Editor {
  sanitize(value) {
    return String(value);
  }
}
class EditorStringRadios extends EditorString {
  static resolves(schema) {
    return getSchemaType(schema) === "string" && (getSchemaXOption(schema, "format") === "radios" || getSchemaXOption(schema, "format") === "radios-inline");
  }
  init() {
    super.init();
    this.setupEnumSource();
  }
  setupEnumSource() {
    const enumSourceRaw = getSchemaXOption(this.instance.schema, "enumSource");
    if (!isSet(enumSourceRaw)) return;
    const enumSource = resolveInstancePath(this.instance.path, enumSourceRaw);
    const src = this.instance.jedison.getInstance(enumSource);
    if (src) this.enumSourceValues = src.getValue();
    this.instance.jedison.watch(enumSource, () => {
      if (!this.control) return;
      const s = this.instance.jedison.getInstance(enumSource);
      if (s) {
        this.enumSourceValues = s.getValue();
        this.refreshOptions();
      }
    });
  }
  getEnumSourceValues() {
    if (this.enumSourceValues !== void 0) {
      if (isArray(this.enumSourceValues)) return this.enumSourceValues;
      if (isObject(this.enumSourceValues)) return Object.keys(this.enumSourceValues);
      return [];
    }
    return getSchemaEnum(this.instance.schema) || [];
  }
  build() {
    const values = this.getEnumSourceValues();
    this.control = this.theme.getRadiosControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values,
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || values,
      id: this.getIdFromPath(this.instance.path),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      inline: getSchemaXOption(this.instance.schema, "format") === "radios-inline",
      info: this.getInfo()
    });
  }
  refreshOptions() {
    const values = this.getEnumSourceValues();
    const titles = getSchemaXOption(this.instance.schema, "enumTitles") || values;
    const id = this.getIdFromPath(this.instance.path);
    const messagesId = id + "-messages";
    const descriptionId = id + "-description";
    const describedBy = messagesId + " " + descriptionId;
    this.control.radioControls.forEach((rc) => {
      if (rc.parentNode) rc.parentNode.removeChild(rc);
    });
    this.control.radios = [];
    this.control.labels = [];
    this.control.radioControls = [];
    this.control.labelTexts = [];
    values.forEach((value, index2) => {
      const radioControl = document.createElement("div");
      const radio = document.createElement("input");
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      radio.setAttribute("type", "radio");
      radio.setAttribute("id", id + "-" + index2);
      radio.setAttribute("name", id);
      radio.setAttribute("value", value);
      radio.setAttribute("aria-describedby", describedBy);
      label.setAttribute("for", id + "-" + index2);
      label.classList.add("jedi-title");
      label.classList.add("jedi-label");
      labelText.textContent = titles && titles[index2] !== void 0 ? titles[index2] : value;
      radioControl.appendChild(radio);
      radioControl.appendChild(label);
      label.appendChild(labelText);
      this.control.radios.push(radio);
      this.control.labels.push(label);
      this.control.labelTexts.push(labelText);
      this.control.radioControls.push(radioControl);
      this.control.fieldset.insertBefore(radioControl, this.control.description);
    });
    this.addEventListeners();
    this.refreshUI();
  }
  adaptForTable() {
    this.theme.adaptForTableRadiosControl(this.control);
  }
  addEventListeners() {
    this.control.radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.instance.setValue(radio.value, true, "user");
      });
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.radios.forEach((radio) => {
      radio.checked = radio.value === this.instance.getValue();
    });
  }
  setAriaInvalid(invalid) {
    this.control.radios.forEach((radio) => {
      if (invalid) {
        radio.setAttribute("aria-invalid", "true");
      } else {
        radio.removeAttribute("aria-invalid");
      }
    });
  }
}
class EditorStringSelect extends EditorString {
  static resolves(schema) {
    return getSchemaType(schema) === "string" && (isSet(getSchemaEnum(schema)) || isSet(getSchemaXOption(schema, "enumSource")));
  }
  init() {
    super.init();
    this.setupEnumSource();
  }
  setupEnumSource() {
    const enumSourceRaw = getSchemaXOption(this.instance.schema, "enumSource");
    if (!isSet(enumSourceRaw)) return;
    const enumSource = resolveInstancePath(this.instance.path, enumSourceRaw);
    const src = this.instance.jedison.getInstance(enumSource);
    if (src) this.enumSourceValues = src.getValue();
    this.instance.jedison.watch(enumSource, () => {
      if (!this.control) return;
      const s = this.instance.jedison.getInstance(enumSource);
      if (s) {
        this.enumSourceValues = s.getValue();
        this.refreshOptions();
      }
    });
  }
  getEnumSourceValues() {
    if (this.enumSourceValues !== void 0) {
      if (isArray(this.enumSourceValues)) return this.enumSourceValues;
      if (isObject(this.enumSourceValues)) return Object.keys(this.enumSourceValues);
      return [];
    }
    return getSchemaEnum(this.instance.schema) || [];
  }
  build() {
    const values = this.getEnumSourceValues();
    this.control = this.theme.getSelectControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values,
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || values,
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
  }
  refreshOptions() {
    const values = this.getEnumSourceValues();
    const titles = getSchemaXOption(this.instance.schema, "enumTitles") || values;
    const select = this.control.input;
    select.innerHTML = "";
    values.forEach((value, i) => {
      const option = document.createElement("option");
      option.setAttribute("value", value);
      option.textContent = titles && titles[i] !== void 0 ? titles[i] : value;
      select.appendChild(option);
    });
    this.refreshUI();
  }
  adaptForTable() {
    this.theme.adaptForTableSelectControl(this.control);
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      this.instance.setValue(this.control.input.value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.input.value = this.instance.getValue();
  }
}
class EditorStringTextarea extends EditorString {
  static resolves(schema) {
    return getSchemaType(schema) === "string" && getSchemaXOption(schema, "format") === "textarea";
  }
  build() {
    this.control = this.theme.getTextareaControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    const useConstraintAttributes = getSchemaXOption(this.instance.schema, "useConstraintAttributes") ?? this.instance.jedison.getOption("useConstraintAttributes");
    if (useConstraintAttributes === true) {
      const schemaMinLength = getSchemaMinLength(this.instance.schema);
      const schemaMaxLength = getSchemaMaxLength(this.instance.schema);
      if (isSet(schemaMinLength)) {
        this.control.input.setAttribute("minlength", schemaMinLength);
      }
      if (isSet(schemaMaxLength)) {
        this.control.input.setAttribute("maxlength", schemaMaxLength);
      }
    }
  }
  adaptForTable() {
    this.theme.adaptForTableTextareaControl(this.control);
  }
  addEventListeners() {
    const eventType = this.getValidationEventType();
    this.control.input.addEventListener(eventType, () => {
      this.instance.setValue(this.control.input.value, true, "user");
    });
  }
  refreshUI() {
    super.refreshUI();
    this.control.input.value = this.instance.getValue();
  }
}
class EditorStringAwesomplete extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "awesomplete" && window.Awesomplete && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const awesompleteOptions = getSchemaXOption(this.instance.schema, "awesomplete") ?? {};
      this.awesomplete = new window.Awesomplete(this.control.input, awesompleteOptions);
      this.control.container.querySelector(".awesomplete").style.display = "block";
    } catch (e) {
      console.error("Awesomplete is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.control.input.addEventListener("awesomplete-selectcomplete", () => {
      this.instance.setValue(this.control.input.value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.input.value = this.instance.getValue();
  }
  destroy() {
    this.awesomplete.destroy();
    super.destroy();
  }
}
class EditorStringEmojiButton extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "emojiButton" && window.EmojiButton && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getInputControl({
      type: "button",
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    this.control.input.classList.add("jedi-emoji-button");
    this.control.input.value = "😀";
    const emojiButtonOptions = getSchemaXOption(this.instance.schema, "emojiButton") ?? {};
    const options = Object.assign({
      theme: "auto",
      autoHide: true,
      showPreview: false,
      showSearch: true,
      zIndex: 1e4,
      position: "auto"
    }, emojiButtonOptions);
    this.emojiButton = new window.EmojiButton(options);
  }
  addEventListeners() {
    this.emojiButton.on("emoji", (emoji) => {
      this.control.input.value = emoji;
      let value = emoji;
      if (typeof emoji === "object") {
        value = emoji.emoji;
      }
      this.instance.setValue(value, true, "user");
    });
    this.control.input.addEventListener("click", () => {
      this.emojiButton.togglePicker(this.control.input);
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.input.value = this.instance.getValue();
  }
  destroy() {
    if (this.emojiButton) {
      this.emojiButton = null;
    }
    super.destroy();
  }
}
class EditorStringInput extends EditorString {
  static resolves(schema) {
    return getSchemaType(schema) === "string";
  }
  static getTypes() {
    return ["hidden", "color", "date", "datetime-local", "email", "number", "month", "password", "search", "time", "tel", "text", "url", "week"];
  }
  build() {
    const optionFormat = getSchemaXOption(this.instance.schema, "format");
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: EditorStringInput.getTypes().includes(optionFormat) ? optionFormat : "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden") || optionFormat === "hidden",
      info: this.getInfo()
    });
    if (optionFormat === "color" && this.instance.value.length === 0) {
      this.instance.setValue("#000000", false, "user");
    }
    const useConstraintAttributes = getSchemaXOption(this.instance.schema, "useConstraintAttributes") ?? this.instance.jedison.getOption("useConstraintAttributes");
    if (useConstraintAttributes === true) {
      const schemaMinLength = getSchemaMinLength(this.instance.schema);
      const schemaMaxLength = getSchemaMaxLength(this.instance.schema);
      const schemaPattern = getSchemaPattern(this.instance.schema);
      if (isSet(schemaMinLength)) {
        this.control.input.setAttribute("minlength", schemaMinLength);
      }
      if (isSet(schemaMaxLength)) {
        this.control.input.setAttribute("maxlength", schemaMaxLength);
      }
      if (isSet(schemaPattern)) {
        this.control.input.setAttribute("pattern", schemaPattern);
      }
    }
  }
  adaptForTable() {
    this.theme.adaptForTableInputControl(this.control);
  }
  addEventListeners() {
    const eventType = this.getValidationEventType();
    this.control.input.addEventListener(eventType, () => {
      this.instance.setValue(this.control.input.value, true, "user");
    });
  }
  sanitize(value) {
    return String(value);
  }
  refreshUI() {
    super.refreshUI();
    this.control.input.value = this.instance.getValue();
  }
}
class EditorNumber extends Editor {
  sanitize(value) {
    if (getSchemaType(this.instance.schema) === "integer") {
      return Math.floor(Number(value));
    } else {
      return Number(value);
    }
  }
}
class EditorNumberRadios extends EditorNumber {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const schemaEnum = getSchemaEnum(schema);
    const optionFormat = getSchemaXOption(schema, "format");
    const typeIsNumeric = schemaType === "number" || schemaType === "integer";
    return typeIsNumeric && isSet(schemaEnum) && (optionFormat === "radios" || optionFormat === "radios-inline");
  }
  build() {
    this.control = this.theme.getRadiosControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values: getSchemaEnum(this.instance.schema),
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || getSchemaEnum(this.instance.schema),
      id: this.getIdFromPath(this.instance.path),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      inline: getSchemaXOption(this.instance.schema, "format") === "radios-inline",
      info: this.getInfo()
    });
  }
  adaptForTable() {
    this.theme.adaptForTableRadiosControl(this.control);
  }
  addEventListeners() {
    this.control.radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        const value = this.sanitize(radio.value);
        this.instance.setValue(value, true, "user");
      });
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.radios.forEach((radio) => {
      radio.checked = Number(radio.value) === Number(this.instance.getValue());
    });
  }
  setAriaInvalid(invalid) {
    this.control.radios.forEach((radio) => {
      if (invalid) {
        radio.setAttribute("aria-invalid", "true");
      } else {
        radio.removeAttribute("aria-invalid");
      }
    });
  }
}
class EditorNumberSelect extends EditorNumber {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const typeIsNumeric = schemaType === "number" || schemaType === "integer";
    return typeIsNumeric && (isSet(getSchemaEnum(schema)) || isSet(getSchemaXOption(schema, "enumSource")));
  }
  init() {
    super.init();
    this.setupEnumSource();
  }
  setupEnumSource() {
    const enumSourceRaw = getSchemaXOption(this.instance.schema, "enumSource");
    if (!isSet(enumSourceRaw)) return;
    const enumSource = resolveInstancePath(this.instance.path, enumSourceRaw);
    const src = this.instance.jedison.getInstance(enumSource);
    if (src) this.enumSourceValues = src.getValue();
    this.instance.jedison.watch(enumSource, () => {
      if (!this.control) return;
      const s = this.instance.jedison.getInstance(enumSource);
      if (s) {
        this.enumSourceValues = s.getValue();
        this.refreshOptions();
      }
    });
  }
  getEnumSourceValues() {
    if (this.enumSourceValues !== void 0) {
      if (isArray(this.enumSourceValues)) return this.enumSourceValues;
      if (isObject(this.enumSourceValues)) return Object.keys(this.enumSourceValues);
      return [];
    }
    return getSchemaEnum(this.instance.schema) || [];
  }
  build() {
    const values = this.getEnumSourceValues();
    this.control = this.theme.getSelectControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values,
      titles: getSchemaXOption(this.instance.schema, "enumTitles") || values,
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
  }
  refreshOptions() {
    const values = this.getEnumSourceValues();
    const titles = getSchemaXOption(this.instance.schema, "enumTitles") || values;
    const select = this.control.input;
    select.innerHTML = "";
    values.forEach((value, i) => {
      const option = document.createElement("option");
      option.setAttribute("value", value);
      option.textContent = titles && titles[i] !== void 0 ? titles[i] : value;
      select.appendChild(option);
    });
    this.refreshUI();
  }
  adaptForTable() {
    this.theme.adaptForTableSelectControl(this.control);
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      const value = this.sanitize(this.control.input.value);
      this.instance.setValue(value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    const value = this.instance.getValue();
    if (isNumber(value)) {
      this.control.input.value = this.instance.getValue();
    }
  }
}
class EditorNumberInput extends EditorNumber {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    return schemaType === "number" || schemaType === "integer";
  }
  build() {
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "number",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden") || getSchemaXOption(this.instance.schema, "format") === "hidden",
      info: this.getInfo()
    });
    this.control.input.setAttribute("step", "any");
    const useConstraintAttributes = getSchemaXOption(this.instance.schema, "useConstraintAttributes") ?? this.instance.jedison.getOption("useConstraintAttributes");
    if (useConstraintAttributes === true) {
      const schemaMinimum = getSchemaMinimum(this.instance.schema);
      const schemaMaximum = getSchemaMaximum(this.instance.schema);
      if (isSet(schemaMinimum)) {
        this.control.input.setAttribute("min", schemaMinimum);
      }
      if (isSet(schemaMaximum)) {
        this.control.input.setAttribute("max", schemaMaximum);
      }
    }
  }
  adaptForTable() {
    this.theme.adaptForTableInputControl(this.control);
  }
  addEventListeners() {
    const eventType = this.getValidationEventType();
    this.control.input.addEventListener(eventType, () => {
      const value = this.sanitize(this.control.input.value);
      this.instance.setValue(value, true, "user");
    });
    this.control.input.addEventListener("focus", () => {
      if (this.control.input.value === "0") {
        this.control.input.value = this.instance.getValue().toString();
      }
    });
    this.control.input.addEventListener("blur", () => {
      this.refreshUI();
    });
  }
  refreshUI() {
    super.refreshUI();
    const value = this.instance.getValue();
    if (isNumber(value)) {
      this.control.input.value = value;
    }
  }
}
class EditorNumberInputNullable extends EditorNumberInput {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "number-nullable" && isSet(schemaType) && isArray(schemaType) && schemaType.length === 2 && schemaType.includes("null") && (schemaType.includes("number") || schemaType.includes("integer"));
  }
  addEventListeners() {
    const eventType = this.getValidationEventType();
    this.control.input.addEventListener(eventType, () => {
      const value = this.sanitize(this.control.input.value);
      this.instance.setValue(value, true, "user");
    });
  }
  sanitize(value) {
    if (value === "") {
      return null;
    }
    const schemaType = getSchemaType(this.instance.schema);
    if (schemaType.includes("integer")) {
      return Math.floor(Number(value));
    } else {
      return Number(value);
    }
  }
  refreshUI() {
    super.refreshUI();
    const value = this.instance.getValue();
    if (value === null) {
      this.control.input.value = "";
    }
    if (isNumber(value)) {
      const schemaType = getSchemaType(this.instance.schema);
      if (schemaType.includes("integer")) {
        this.control.input.value = Math.floor(Number(value));
      } else {
        this.control.input.value = value;
      }
    }
  }
}
class EditorObject extends Editor {
  static resolves(schema) {
    return getSchemaType(schema) === "object";
  }
  build() {
    this.propertyActivators = {};
    let addProperty = true;
    const additionalProperties2 = getSchemaAdditionalProperties(this.instance.schema);
    if (isSet(additionalProperties2) && additionalProperties2 === false) {
      addProperty = false;
    }
    const objectAdd = getSchemaXOption(this.instance.schema, "objectAdd") ?? this.instance.jedison.getOption("objectAdd");
    if (isSet(objectAdd) && objectAdd === false) {
      addProperty = false;
    }
    let enablePropertiesToggle = false;
    if (isSet(this.instance.jedison.getOption("enablePropertiesToggle"))) {
      enablePropertiesToggle = this.instance.jedison.getOption("enablePropertiesToggle");
    }
    const schemaEnablePropertiesToggle = getSchemaXOption(this.instance.schema, "enablePropertiesToggle");
    if (isSet(schemaEnablePropertiesToggle)) {
      enablePropertiesToggle = schemaEnablePropertiesToggle;
    }
    this.control = this.theme.getObjectControl({
      title: this.getTitle(),
      description: this.getDescription(),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      id: this.getIdFromPath(this.instance.path),
      enablePropertiesToggle,
      addProperty,
      enableCollapseToggle: getSchemaXOption(this.instance.schema, "enableCollapseToggle") ?? this.instance.jedison.getOption("enableCollapseToggle"),
      startCollapsed: getSchemaXOption(this.instance.schema, "startCollapsed") ?? this.instance.jedison.getOption("startCollapsed"),
      readOnly: this.instance.isReadOnly(),
      info: this.getInfo(),
      editJsonData: getSchemaXOption(this.instance.schema, "editJsonData") ?? this.instance.jedison.getOption("editJsonData"),
      propertiesToggleContent: getSchemaXOption(this.instance.schema, "propertiesToggleContent") ?? this.instance.jedison.translator.translate("propertiesToggle"),
      collapseToggleContent: getSchemaXOption(this.instance.schema, "collapseToggleContent") ?? this.instance.jedison.translator.translate("collapseToggle"),
      addPropertyContent: getSchemaXOption(this.instance.schema, "addPropertyContent") ?? this.instance.jedison.translator.translate("objectAddProperty")
    });
    this.control.jsonData.input.value = JSON.stringify(this.instance.getValue(), null, 2);
  }
  announcePropertyAdded(propertyName, child) {
    const schemaTitle = getSchemaTitle(child.schema);
    const label = isSet(schemaTitle) ? schemaTitle : propertyName;
    const ariaLiveMessage = this.theme.getAriaLiveMessage();
    ariaLiveMessage.textContent = label + " " + this.instance.jedison.translator.translate("objectPropertyAdded");
    this.control.ariaLive.appendChild(ariaLiveMessage);
  }
  addProperty(input, postAction) {
    const propertyName = input.value.split(" ").join("");
    if (propertyName.length === 0) return;
    if (isSet(this.instance.value[propertyName])) return;
    const schema = this.instance.getPropertySchema(propertyName);
    const child = this.instance.createChild(schema, propertyName);
    child.activate();
    this.instance.setValue(this.instance.value, true, "user");
    input.value = "";
    this.announcePropertyAdded(propertyName, child);
    postAction();
  }
  addEventListeners() {
    this.control.quickAddPropertyBtn.addEventListener("click", () => {
      this.addProperty(this.control.quickAddPropertyControl.input, () => {
        this.control.quickAddPropertyContainer.close();
      });
    });
    this.control.jsonData.saveBtn.addEventListener("click", () => {
      try {
        const inputValue = JSON.parse(this.control.jsonData.input.value);
        this.instance.setValue(inputValue, true, "user");
        this.control.jsonData.dialog.close();
      } catch (error) {
        alert("Invalid JSON");
      }
    });
    this.control.jsonData.copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.control.jsonData.input.value);
    });
    this.control.jsonData.toggle.addEventListener("click", () => {
      this.refreshJsonDataInputSize();
    });
  }
  sanitize(value) {
    if (isObject(value)) {
      return value;
    }
    return {};
  }
  getErrorFeedback(config) {
    return this.theme.getAlert(config);
  }
  refreshPropertiesSlot() {
    const schemaOptionEnablePropertiesToggle = getSchemaXOption(this.instance.schema, "enablePropertiesToggle") ?? this.instance.jedison.getOption("enablePropertiesToggle");
    if (equal(schemaOptionEnablePropertiesToggle, true)) {
      const declaredProperties = Object.keys(this.instance.properties);
      const instanceProperties = this.instance.children.map((child) => child.getKey());
      const properties2 = [.../* @__PURE__ */ new Set([...declaredProperties, ...instanceProperties])];
      this.control.propertiesActivators.replaceChildren();
      const {
        container: defaultGroupContainer,
        group: defaultGroup
      } = this.theme.getPropertiesGroup();
      this.control.propertiesActivators.appendChild(defaultGroupContainer);
      const propertiesGroups = {};
      const currentValue = this.instance.getValue();
      properties2.forEach((property) => {
        const isRequired = this.instance.isRequired(property);
        const ariaLive = this.control.ariaLive;
        const schema = this.instance.getPropertySchema(property);
        const schemaTitle = getSchemaTitle(schema);
        const path = this.instance.path + this.instance.jedison.pathSeparator + property;
        const id = pathToAttribute(path) + "-activator";
        const title = isSet(schemaTitle) ? schemaTitle : property;
        const checkboxControl = this.theme.getCheckboxControl({
          id,
          title,
          titleHidden: false
        });
        const checkbox = checkboxControl.input;
        this.propertyActivators[property] = checkbox;
        checkbox.addEventListener("change", () => {
          ariaLive.innerHTML = "";
          const ariaLiveMessage = this.theme.getAriaLiveMessage();
          if (checkbox.checked) {
            const child = this.instance.getChild(property);
            if (!child) {
              this.instance.createChild(schema, property);
            }
            this.instance.getChild(property).activate();
            ariaLiveMessage.textContent = title + " " + this.instance.jedison.translator.translate("objectPropertyAdded");
            ariaLive.appendChild(ariaLiveMessage);
          } else {
            this.instance.getChild(property).deactivate();
            ariaLiveMessage.textContent = title + " " + this.instance.jedison.translator.translate("objectPropertyRemoved");
            ariaLive.appendChild(ariaLiveMessage);
          }
          this.control.propertiesContainer.close();
          this.control.propertiesContainer.showModal();
        });
        const propGroup = getSchemaXOption(schema, "propGroup");
        if (isSet(propGroup) && isString(propGroup)) {
          let propertiesGroup = propertiesGroups[propGroup];
          if (!isSet(propertiesGroup)) {
            propertiesGroup = this.theme.getPropertiesGroup({ name: propGroup });
            propertiesGroups[propGroup] = propertiesGroup;
          }
          propertiesGroup.group.appendChild(checkboxControl.container);
          this.control.propertiesActivators.appendChild(propertiesGroup.container);
        } else {
          defaultGroup.appendChild(checkboxControl.container);
        }
        checkbox.disabled = this.disabled || isRequired;
        checkbox.checked = hasOwn(currentValue, property);
      });
      const propGroupOrder = getSchemaXOption(this.instance.schema, "propGroupOrder");
      if (isSet(propGroupOrder) && Array.isArray(propGroupOrder)) {
        const orderedContainers = [defaultGroupContainer];
        propGroupOrder.forEach((groupName) => {
          if (isSet(propertiesGroups[groupName])) {
            orderedContainers.push(propertiesGroups[groupName].container);
          }
        });
        Object.keys(propertiesGroups).forEach((groupName) => {
          if (!propGroupOrder.includes(groupName)) {
            orderedContainers.push(propertiesGroups[groupName].container);
          }
        });
        this.control.propertiesActivators.replaceChildren();
        orderedContainers.forEach((container) => {
          this.control.propertiesActivators.appendChild(container);
        });
      }
    }
  }
  refreshEditors() {
    this.control.childrenSlot.replaceChildren();
    this.instance.children.forEach((child) => {
      const optIn = this.theme.getCheckboxControl({
        id: child.path + "-opt-in",
        title: child.path + "-opt-in",
        titleHidden: true
      });
      optIn.input.checked = child.isActive;
      optIn.input.addEventListener("change", () => {
        if (child.isActive) {
          child.deactivate();
        } else {
          child.activate();
        }
      });
      if (child.isActive) {
        if (child.ui.control.container.parentNode === null) {
          this.control.childrenSlot.appendChild(child.ui.control.container);
          if (child.ui.control.optInContainer) {
            child.ui.control.optInContainer.appendChild(optIn.container);
          }
        }
        if (this.disabled || this.instance.isReadOnly()) {
          child.ui.disable();
        } else {
          child.ui.enable();
        }
      } else {
        if (child.ui.control.container.parentNode) {
          child.ui.control.container.parentNode.removeChild(child.ui.control.container);
        }
      }
    });
  }
  refreshLegendWarning() {
    if (!this.control.legendText) return;
    const navWarning = getSchemaXOption(this.instance.schema, "navWarning") ?? true;
    const hasErrors = navWarning && this.instance.hasNestedValidationErrors();
    const existing = this.control.legendText.querySelector(".jedi-legend-warning");
    if (existing) existing.parentNode.removeChild(existing);
    if (hasErrors) {
      const warning = document.createElement("span");
      warning.classList.add("jedi-legend-warning");
      warning.textContent = "⚠";
      const navWarningMessage = getSchemaXOption(this.instance.schema, "navWarningMessage");
      if (navWarningMessage) warning.setAttribute("title", navWarningMessage);
      this.theme.styleLegendWarning(warning);
      this.control.legendText.appendChild(warning);
    }
  }
  showValidationErrors(errors, force = false) {
    super.showValidationErrors(errors, force);
    this.refreshLegendWarning();
  }
  refreshUI() {
    super.refreshUI();
    this.refreshPropertiesSlot();
    this.refreshEditors();
    this.refreshJsonData();
    this.refreshLegendWarning();
  }
}
class EditorObjectGrid extends EditorObject {
  static resolves(schema) {
    return getSchemaType(schema) === "object" && getSchemaXOption(schema, "format") === "grid";
  }
  refreshEditors() {
    while (this.control.childrenSlot.firstChild) {
      this.control.childrenSlot.removeChild(this.control.childrenSlot.lastChild);
    }
    let row = this.theme.getRow();
    this.control.childrenSlot.appendChild(row);
    this.instance.children.forEach((child) => {
      if (child.isActive) {
        const childGridOptions = getSchemaXOption(child.schema, "grid") || {};
        const gridColumns = getSchemaXOption(child.schema, "gridColumns") ?? void 0;
        const gridOffset = getSchemaXOption(child.schema, "gridOffset") ?? 0;
        const columnsMdRetro = childGridOptions.columns ?? void 0;
        const columnsXs = childGridOptions.columnsXs ?? gridColumns ?? 12;
        const columnsSm = childGridOptions.columnsSm ?? gridColumns ?? columnsXs;
        const columnsMd = childGridOptions.columnsMd ?? columnsMdRetro ?? gridColumns ?? columnsSm;
        const columnsLg = childGridOptions.columnsLg ?? gridColumns ?? columnsMd;
        const offset = childGridOptions.offset ?? gridOffset;
        const col = this.theme.getCol(columnsXs, columnsSm, columnsMd, columnsLg, offset);
        const newRow = childGridOptions.newRow || false;
        if (newRow) {
          row = this.theme.getRow();
          this.control.childrenSlot.appendChild(row);
        }
        row.appendChild(col);
        col.appendChild(child.ui.control.container);
        if (this.disabled || this.instance.isReadOnly()) {
          child.ui.disable();
        } else {
          child.ui.enable();
        }
      }
    });
  }
}
class EditorObjectCategories extends EditorObject {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    const regex = /^categories-(horizontal|vertical(?:-\d+)?)$/;
    return getSchemaType(schema) === "object" && regex.test(format2);
  }
  init() {
    super.init();
    this.activeCategoryName = null;
  }
  navigateTo(path) {
    const nextChildPath = this.getNextChildPath(path);
    if (nextChildPath) {
      const child = this.instance.children.find((c) => c.path === nextChildPath);
      if (child) {
        const defaultLabel = getSchemaXOption(this.instance.schema, "categoriesDefaultLabel") ?? "Basic";
        const childSchemaType = getSchemaType(child.schema);
        const xCategory = getSchemaXOption(child.schema, "category");
        let categoryName;
        if (isSet(xCategory)) {
          categoryName = xCategory;
        } else if (childSchemaType === "object" || childSchemaType === "array") {
          const schemaTitle = getSchemaTitle(child.schema);
          categoryName = isSet(schemaTitle) ? schemaTitle : child.getKey();
        } else {
          categoryName = defaultLabel;
        }
        this.activeCategoryName = categoryName;
        this.refreshUI();
      }
    }
    super.navigateTo(path);
  }
  refreshEditors() {
    while (this.control.childrenSlot.firstChild) {
      this.control.childrenSlot.removeChild(this.control.childrenSlot.lastChild);
    }
    const format2 = getSchemaXOption(this.instance.schema, "format");
    const formatParts = format2.split("-");
    const variant = formatParts[1];
    const columns = formatParts[2];
    const navColumns = variant === "horizontal" ? 12 : columns ?? 4;
    const row = this.theme.getRow();
    const tabListCol = this.theme.getCol(12, 12, navColumns, navColumns);
    const tabContentCol = this.theme.getCol(12, 12, 12 - navColumns, 12 - navColumns);
    const tabContent = this.theme.getTabContent();
    const tabList = this.theme.getTabList({
      variant
    });
    this.control.childrenSlot.appendChild(row);
    row.appendChild(tabListCol);
    row.appendChild(tabContentCol);
    tabListCol.appendChild(tabList);
    tabContentCol.appendChild(tabContent);
    const navWarning = getSchemaXOption(this.instance.schema, "navWarning") ?? true;
    const navWarningMessage = getSchemaXOption(this.instance.schema, "navWarningMessage");
    const defaultLabel = getSchemaXOption(this.instance.schema, "categoriesDefaultLabel") ?? "Basic";
    const categoriesMap = /* @__PURE__ */ new Map();
    this.instance.children.forEach((child) => {
      if (!child.isActive) return;
      const hidden = getSchemaXOption(child.schema, "hidden");
      if (isSet(hidden) && hidden === true) return;
      const childSchemaType = getSchemaType(child.schema);
      const xCategory = getSchemaXOption(child.schema, "category");
      let categoryName;
      if (isSet(xCategory)) {
        categoryName = xCategory;
      } else if (childSchemaType === "object" || childSchemaType === "array") {
        const schemaTitle = getSchemaTitle(child.schema);
        categoryName = isSet(schemaTitle) ? schemaTitle : child.getKey();
      } else {
        categoryName = defaultLabel;
      }
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, { children: [], id: this.getIdFromPath(child.path) });
      }
      categoriesMap.get(categoryName).children.push(child);
    });
    if (!categoriesMap.has(this.activeCategoryName)) {
      this.activeCategoryName = categoriesMap.keys().next().value;
    }
    const categoryOrder = getSchemaXOption(this.instance.schema, "categoryOrder");
    const allNames = Array.from(categoriesMap.keys());
    let orderedCategoryNames = allNames;
    if (isSet(categoryOrder) && isArray(categoryOrder)) {
      const specifiedFirst = categoryOrder.filter((name) => categoriesMap.has(name));
      const unspecified = allNames.filter((name) => !categoryOrder.includes(name));
      orderedCategoryNames = [...specifiedFirst, ...unspecified];
    }
    orderedCategoryNames.forEach((categoryName) => {
      const category = categoriesMap.get(categoryName);
      const active = categoryName === this.activeCategoryName;
      const { children, id } = category;
      const hasErrors = navWarning && children.some((child) => child.hasNestedValidationErrors());
      const tab = this.theme.getTab({
        hasErrors,
        navWarningMessage,
        title: categoryName,
        id,
        active
      });
      tab.list.addEventListener("click", () => {
        this.activeCategoryName = categoryName;
      });
      const pane = document.createElement("div");
      this.theme.setTabPaneAttributes(pane, active, id);
      children.forEach((child) => {
        pane.appendChild(child.ui.control.container);
        if (this.disabled || this.instance.isReadOnly()) {
          child.ui.disable();
        } else {
          child.ui.enable();
        }
      });
      tabList.appendChild(tab.list);
      tabContent.appendChild(pane);
    });
  }
}
class EditorObjectNav extends EditorObject {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    const regex = /^nav-(horizontal|vertical(?:-\d+)?)$/;
    const hasNavFormat = regex.test(format2);
    return getSchemaType(schema) === "object" && hasNavFormat;
  }
  init() {
    super.init();
    this.activeTabIndex = 0;
  }
  isChildVisible(child) {
    if (!child.isActive) return false;
    const hidden = getSchemaXOption(child.schema, "hidden");
    return !(isSet(hidden) && hidden === true);
  }
  getVisibleChildIndices() {
    return this.instance.children.reduce((indices, child, index2) => {
      if (this.isChildVisible(child)) indices.push(index2);
      return indices;
    }, []);
  }
  ensureActiveTabIsVisible(visibleIndices) {
    if (!visibleIndices.includes(this.activeTabIndex)) {
      this.activeTabIndex = visibleIndices[0] ?? 0;
    }
  }
  navigateTo(path) {
    const nextChildPath = this.getNextChildPath(path);
    if (nextChildPath) {
      const childIndex = this.instance.children.findIndex((c) => c.path === nextChildPath);
      if (childIndex !== -1) {
        this.activeTabIndex = childIndex;
        this.refreshUI();
      }
    }
    super.navigateTo(path);
  }
  refreshEditors() {
    while (this.control.childrenSlot.firstChild) {
      this.control.childrenSlot.removeChild(this.control.childrenSlot.lastChild);
    }
    const format2 = getSchemaXOption(this.instance.schema, "format");
    const formatParts = format2.split("-");
    const variant = formatParts[1];
    const columns = formatParts[2];
    const navColumns = variant === "horizontal" ? 12 : columns ?? 4;
    const row = this.theme.getRow();
    const tabListCol = this.theme.getCol(12, 12, navColumns, navColumns);
    const tabContentCol = this.theme.getCol(12, 12, 12 - navColumns, 12 - navColumns);
    const tabContent = this.theme.getTabContent();
    const tabList = this.theme.getTabList({
      variant
    });
    this.control.childrenSlot.appendChild(row);
    row.appendChild(tabListCol);
    row.appendChild(tabContentCol);
    tabListCol.appendChild(tabList);
    tabContentCol.appendChild(tabContent);
    const visibleIndices = this.getVisibleChildIndices();
    this.ensureActiveTabIsVisible(visibleIndices);
    this.instance.children.forEach((child, index2) => {
      if (!this.isChildVisible(child)) return;
      const active = index2 === this.activeTabIndex;
      const id = this.getIdFromPath(child.path);
      const schemaTitle = getSchemaTitle(child.schema);
      const navWarning = getSchemaXOption(this.instance.schema, "navWarning") ?? true;
      const navWarningMessage = getSchemaXOption(this.instance.schema, "navWarningMessage");
      const tab = this.theme.getTab({
        hasErrors: navWarning && child.hasNestedValidationErrors(),
        navWarningMessage,
        title: isSet(schemaTitle) ? schemaTitle : child.getKey(),
        id,
        active
      });
      tab.list.addEventListener("click", () => {
        this.activeTabIndex = index2;
      });
      this.theme.setTabPaneAttributes(child.ui.control.container, active, id);
      tabList.appendChild(tab.list);
      tabContent.appendChild(child.ui.control.container);
      if (this.disabled || this.instance.isReadOnly()) {
        child.ui.disable();
      } else {
        child.ui.enable();
      }
    });
  }
}
class EditorArray extends Editor {
  static resolves(schema) {
    return getSchemaType(schema) === "array";
  }
  init() {
    super.init();
    this.activeItemIndex = 0;
  }
  build() {
    this.control = this.theme.getArrayControl({
      title: this.getTitle(),
      description: this.getDescription(),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      id: this.getIdFromPath(this.instance.path),
      enableCollapseToggle: getSchemaXOption(this.instance.schema, "enableCollapseToggle") ?? this.instance.jedison.getOption("enableCollapseToggle"),
      startCollapsed: getSchemaXOption(this.instance.schema, "startCollapsed") ?? this.instance.jedison.getOption("startCollapsed"),
      readOnly: this.instance.isReadOnly(),
      info: this.getInfo(),
      editJsonData: getSchemaXOption(this.instance.schema, "editJsonData") ?? this.instance.jedison.getOption("editJsonData"),
      arrayAdd: getSchemaXOption(this.instance.schema, "arrayAdd") ?? this.instance.jedison.getOption("arrayAdd"),
      arrayAddContent: getSchemaXOption(this.instance.schema, "arrayAddContent") ?? this.instance.jedison.translator.translate("arrayAdd"),
      arrayFooterAdd: getSchemaXOption(this.instance.schema, "arrayFooterAdd") ?? this.instance.jedison.getOption("arrayFooterAdd"),
      arrayFooterAddContent: getSchemaXOption(this.instance.schema, "arrayFooterAddContent") ?? this.instance.jedison.translator.translate("arrayAdd"),
      arrayFooterButtonsPosition: getSchemaXOption(this.instance.schema, "arrayFooterButtonsPosition") ?? this.instance.jedison.getOption("arrayFooterButtonsPosition"),
      arrayDeleteAll: getSchemaXOption(this.instance.schema, "arrayDeleteAll") ?? this.instance.jedison.getOption("arrayDeleteAll"),
      arrayDeleteAllContent: getSchemaXOption(this.instance.schema, "arrayDeleteAllContent") ?? this.instance.jedison.translator.translate("arrayDeleteAll"),
      arrayFooterDeleteAll: getSchemaXOption(this.instance.schema, "arrayFooterDeleteAll") ?? this.instance.jedison.getOption("arrayFooterDeleteAll"),
      arrayFooterDeleteAllContent: getSchemaXOption(this.instance.schema, "arrayFooterDeleteAllContent") ?? this.instance.jedison.translator.translate("arrayDeleteAll"),
      collapseToggleContent: getSchemaXOption(this.instance.schema, "collapseToggleContent") ?? this.instance.jedison.translator.translate("collapseToggle")
    });
    this.control.jsonData.input.value = JSON.stringify(this.instance.getValue(), null, 2);
  }
  deleteAllItems() {
    const schemaConfirm = getSchemaXOption(this.instance.schema, "arrayDeleteConfirm");
    const globalConfirm = this.instance.jedison.getOption("arrayDeleteConfirm");
    const shouldConfirm = isSet(schemaConfirm) ? schemaConfirm : globalConfirm;
    const doDeleteAll = () => {
      this.instance.setValue([], true, "user");
    };
    if (shouldConfirm) {
      if (window.confirm(this.instance.jedison.translator.translate("arrayConfirmDeleteAll"))) {
        doDeleteAll();
      }
    } else {
      doDeleteAll();
    }
  }
  addEventListeners() {
    this.control.addBtn.addEventListener("click", () => {
      this.instance.addItem("user");
    });
    this.control.footerAddBtn.addEventListener("click", () => {
      this.instance.addItem("user");
    });
    if (this.control.deleteAllBtn) {
      this.control.deleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    if (this.control.footerDeleteAllBtn) {
      this.control.footerDeleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    this.addJsonDataEventListeners();
  }
  addJsonDataEventListeners() {
    this.control.jsonData.copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.control.jsonData.input.value);
    });
    this.control.jsonData.saveBtn.addEventListener("click", () => {
      try {
        const inputValue = JSON.parse(this.control.jsonData.input.value);
        this.instance.setValue(inputValue, true, "user");
        this.control.jsonData.dialog.close();
      } catch (error) {
        alert("Invalid JSON");
      }
    });
    this.control.jsonData.toggle.addEventListener("click", () => {
      this.refreshJsonDataInputSize();
    });
  }
  getErrorFeedback(config) {
    return this.theme.getAlert(config);
  }
  sanitize(value) {
    if (isArray(value)) {
      return value;
    }
    return [];
  }
  getButtons(index2) {
    const schemaDeleteContent = getSchemaXOption(this.instance.schema, "arrayDeleteContent");
    const schemaMoveUpContent = getSchemaXOption(this.instance.schema, "arrayMoveUpContent");
    const schemaMoveDownContent = getSchemaXOption(this.instance.schema, "arrayMoveDownContent");
    const schemaDragContent = getSchemaXOption(this.instance.schema, "arrayDragContent");
    const schemaAddAfterContent = getSchemaXOption(this.instance.schema, "arrayAddAfterContent");
    const deleteBtn = this.theme.getDeleteItemBtn({
      content: schemaDeleteContent ?? this.instance.jedison.translator.translate("arrayDelete")
    });
    const moveUpBtn = this.theme.getMoveUpItemBtn({
      content: schemaMoveUpContent ?? this.instance.jedison.translator.translate("arrayMoveUp")
    });
    const moveDownBtn = this.theme.getMoveDownItemBtn({
      content: schemaMoveDownContent ?? this.instance.jedison.translator.translate("arrayMoveDown")
    });
    const dragBtn = this.theme.getDragItemBtn({
      content: schemaDragContent ?? this.instance.jedison.translator.translate("arrayDrag")
    });
    const addAfterBtn = this.theme.getAddAfterItemBtn({
      content: schemaAddAfterContent ?? this.instance.jedison.translator.translate("arrayAddAfter")
    });
    const btnGroup = this.theme.getBtnGroup();
    deleteBtn.addEventListener("click", () => {
      const schemaConfirm = getSchemaXOption(this.instance.schema, "arrayDeleteConfirm");
      const globalConfirm = this.instance.jedison.getOption("arrayDeleteConfirm");
      const shouldConfirm = isSet(schemaConfirm) ? schemaConfirm : globalConfirm;
      const doDelete = () => {
        this.activeItemIndex = clamp(index2 - 1, 0, this.instance.value.length - 1);
        this.instance.deleteItem(index2, "user");
      };
      if (shouldConfirm) {
        if (window.confirm(this.instance.jedison.translator.translate("arrayConfirmDelete"))) {
          doDelete();
        }
      } else {
        doDelete();
      }
    });
    moveUpBtn.addEventListener("click", () => {
      const toIndex = index2 - 1;
      this.activeItemIndex = toIndex;
      this.instance.move(index2, toIndex, "user");
    });
    moveDownBtn.addEventListener("click", () => {
      const toIndex = index2 + 1;
      this.activeItemIndex = toIndex;
      this.instance.move(index2, toIndex, "user");
    });
    addAfterBtn.addEventListener("click", () => {
      this.activeItemIndex = index2 + 1;
      this.instance.addItemAfter(index2, "user");
    });
    if (index2 === 0) {
      moveUpBtn.setAttribute("always-disabled", true);
    }
    if (index2 === this.instance.children.length - 1) {
      moveDownBtn.setAttribute("always-disabled", true);
    }
    return { deleteBtn, moveUpBtn, moveDownBtn, btnGroup, dragBtn, addAfterBtn };
  }
  isSortable() {
    return window.Sortable && isSet(getSchemaXOption(this.instance.schema, "sortable"));
  }
  refreshSortable(container) {
    if (this.isSortable()) {
      if (this.sortable) {
        this.sortable.destroy();
      }
      this.sortable = window.Sortable.create(container, {
        animation: 150,
        handle: ".jedi-array-drag",
        disabled: this.disabled || this.readOnly,
        onEnd: (evt) => {
          this.instance.move(evt.oldIndex, evt.newIndex);
        }
      });
    }
  }
  refreshDeleteAllBtn() {
    if (!this.control.deleteAllBtn && !this.control.footerDeleteAllBtn) return;
    const isEmpty = this.instance.value.length === 0;
    const cannotDeleteAll = isEmpty;
    const btns = [this.control.deleteAllBtn, this.control.footerDeleteAllBtn].filter(Boolean);
    if (cannotDeleteAll || this.disabled || this.readOnly) {
      btns.forEach((btn) => {
        btn.setAttribute("disabled", "");
        btn.setAttribute("always-disabled", true);
      });
    } else {
      if (!this.disabled && !this.readOnly) {
        btns.forEach((btn) => {
          btn.removeAttribute("disabled");
          btn.removeAttribute("always-disabled");
        });
      }
    }
  }
  refreshAddBtn() {
    const maxItems2 = getSchemaMaxItems(this.instance.schema);
    const enforceMaxItems = getSchemaXOption(this.instance.schema, "enforceMaxItems") ?? this.instance.jedison.getOption("enforceMaxItems");
    if (isSet(maxItems2) && enforceMaxItems && maxItems2 <= this.instance.value.length) {
      this.control.addBtn.setAttribute("disabled", "");
      this.control.addBtn.setAttribute("always-disabled", true);
      this.control.footerAddBtn.setAttribute("disabled", "");
      this.control.footerAddBtn.setAttribute("always-disabled", true);
      this.control.childrenSlot.querySelectorAll(".jedi-array-add-after").forEach((btn) => {
        btn.setAttribute("disabled", "");
        btn.setAttribute("always-disabled", true);
      });
    } else {
      if (!this.disabled && !this.readOnly) {
        this.control.addBtn.removeAttribute("disabled");
        this.control.addBtn.removeAttribute("always-disabled");
        this.control.footerAddBtn.removeAttribute("disabled");
        this.control.footerAddBtn.removeAttribute("always-disabled");
        this.control.childrenSlot.querySelectorAll(".jedi-array-add-after").forEach((btn) => {
          btn.removeAttribute("disabled");
          btn.removeAttribute("always-disabled");
        });
      }
    }
  }
  refreshUI() {
    super.refreshUI();
    const minItems2 = getSchemaMinItems(this.instance.schema);
    const arrayDelete = getSchemaXOption(this.instance.schema, "arrayDelete") ?? this.instance.jedison.getOption("arrayDelete");
    const arrayMove = getSchemaXOption(this.instance.schema, "arrayMove") ?? this.instance.jedison.getOption("arrayMove");
    const arrayAddAfter = getSchemaXOption(this.instance.schema, "arrayAddAfter") ?? this.instance.jedison.getOption("arrayAddAfter");
    this.control.childrenSlot.innerHTML = "";
    this.instance.children.forEach((child, index2) => {
      const { deleteBtn, moveUpBtn, moveDownBtn, dragBtn, btnGroup, addAfterBtn } = this.getButtons(index2);
      const { container, arrayActions, body } = this.theme.getArrayItem({
        readOnly: this.instance.isReadOnly(),
        index: index2
      });
      arrayActions.appendChild(btnGroup);
      if (isSet(arrayDelete) && arrayDelete === true) {
        btnGroup.appendChild(deleteBtn);
      }
      if (isSet(arrayMove) && arrayMove === true) {
        btnGroup.appendChild(moveUpBtn);
        btnGroup.appendChild(moveDownBtn);
      }
      if (this.isSortable()) {
        btnGroup.appendChild(dragBtn);
      }
      if (isSet(arrayAddAfter) && arrayAddAfter === true) {
        btnGroup.appendChild(addAfterBtn);
      }
      this.control.childrenSlot.appendChild(container);
      body.appendChild(child.ui.control.container);
      if (this.disabled || this.instance.isReadOnly()) {
        child.ui.disable();
      } else {
        child.ui.enable();
      }
      if (isSet(minItems2) && this.instance.value.length <= minItems2) {
        deleteBtn.setAttribute("disabled", "");
      }
    });
    this.refreshDisabledState();
    this.refreshSortable(this.control.childrenSlot);
    this.instance.children.forEach((child) => {
      child.ui.refreshUI();
    });
    this.refreshAddBtn();
    this.refreshDeleteAllBtn();
    this.refreshJsonData();
    this.refreshLegendWarning();
  }
  refreshLegendWarning() {
    if (!this.control.legendText) return;
    const navWarning = getSchemaXOption(this.instance.schema, "navWarning") ?? true;
    const hasErrors = navWarning && this.instance.hasNestedValidationErrors();
    const existing = this.control.legendText.querySelector(".jedi-legend-warning");
    if (existing) existing.parentNode.removeChild(existing);
    if (hasErrors) {
      const warning = document.createElement("span");
      warning.classList.add("jedi-legend-warning");
      warning.textContent = "⚠";
      const navWarningMessage = getSchemaXOption(this.instance.schema, "navWarningMessage");
      if (navWarningMessage) warning.setAttribute("title", navWarningMessage);
      this.theme.styleLegendWarning(warning);
      this.control.legendText.appendChild(warning);
    }
  }
  showValidationErrors(errors, force = false) {
    super.showValidationErrors(errors, force);
    this.refreshLegendWarning();
  }
}
class EditorArrayTuple extends EditorArray {
  static resolves(schema) {
    const type2 = getSchemaType(schema);
    const format2 = getSchemaX(schema, "format");
    const prefixItems2 = getSchemaPrefixItems(schema);
    return type2 === "array" && format2 === "tuple" && isSet(prefixItems2);
  }
  build() {
    super.build();
    this.control.addBtn.style.display = "none";
  }
  addEventListeners() {
    this.addJsonDataEventListeners();
  }
  refreshUI() {
    this.control.childrenSlot.innerHTML = "";
    const table = this.theme.getTable();
    this.control.childrenSlot.appendChild(table.container);
    const schemaPrefixItems = getSchemaPrefixItems(this.instance.schema);
    schemaPrefixItems.forEach((prefixItemSchema) => {
      const th = this.theme.getTableHeader();
      const { label } = this.theme.getFakeLabel({
        content: getSchemaTitle(prefixItemSchema) ?? ""
      });
      th.appendChild(label);
      table.thead.appendChild(th);
    });
    const tbodyRow = document.createElement("tr");
    this.instance.children.forEach((child) => {
      const td = this.theme.getTableDefinition();
      child.ui.adaptForTable(child, td);
      td.appendChild(child.ui.control.container);
      tbodyRow.appendChild(td);
    });
    table.tbody.appendChild(tbodyRow);
    this.refreshJsonData();
    this.refreshDisabledState();
  }
}
class EditorArrayTable extends EditorArray {
  static resolves(schema, refParser) {
    return getSchemaType(schema) === "array" && getSchemaXOption(schema, "format") === "table";
  }
  addEventListeners() {
    this.control.addBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    this.control.footerAddBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    if (this.control.deleteAllBtn) {
      this.control.deleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    if (this.control.footerDeleteAllBtn) {
      this.control.footerDeleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    this.addJsonDataEventListeners();
  }
  isSortable() {
    return window.Sortable && isSet(getSchemaXOption(this.instance.schema, "sortable"));
  }
  refreshUI() {
    this.control.childrenSlot.innerHTML = "";
    const table = this.theme.getTable();
    this.control.childrenSlot.appendChild(table.container);
    const arrayDelete = getSchemaXOption(this.instance.schema, "arrayDelete") ?? this.instance.jedison.getOption("arrayDelete");
    const arrayMove = getSchemaXOption(this.instance.schema, "arrayMove") ?? this.instance.jedison.getOption("arrayMove");
    const arrayButtonsPosition = getSchemaXOption(this.instance.schema, "arrayButtonsPosition") ?? this.instance.jedison.getOption("arrayButtonsPosition");
    const arrayAddAfter = getSchemaXOption(this.instance.schema, "arrayAddAfter") ?? this.instance.jedison.getOption("arrayAddAfter");
    const th = this.theme.getTableHeader();
    const { label } = this.theme.getFakeLabel({
      content: "Controls",
      visuallyHidden: true
    });
    th.appendChild(label);
    if (arrayButtonsPosition === "left") {
      table.thead.appendChild(th);
    }
    if (this.instance.children.length) {
      const schemaItems = getSchemaItems(this.instance.schema);
      const thTitle = this.theme.getTableHeader();
      if (schemaItems) {
        if (schemaItems.title) {
          const fakeLabel = this.theme.getFakeLabel({
            content: schemaItems.title
          });
          thTitle.appendChild(fakeLabel.label);
        }
        const schemaXInfo = getSchemaXOption(schemaItems, "info");
        if (isSet(schemaXInfo)) {
          const infoContent = this.getInfo(schemaItems);
          const info = this.theme.getInfo(infoContent);
          if (schemaXInfo.variant === "modal") {
            this.theme.infoAsModal(info, this.getIdFromPath(this.instance.path) + "-item", infoContent);
          }
          thTitle.appendChild(info.container);
        }
      }
      table.thead.appendChild(thTitle);
    }
    if (arrayButtonsPosition === "right") {
      table.thead.appendChild(th);
    }
    this.instance.children.forEach((child, index2) => {
      const tbodyRow = document.createElement("tr");
      const buttonsTd = this.theme.getTableDefinition({ isButtonColumn: true });
      const { deleteBtn, moveUpBtn, moveDownBtn, dragBtn, btnGroup, addAfterBtn } = this.getButtons(index2);
      if (this.isSortable()) {
        btnGroup.appendChild(dragBtn);
      }
      if (isSet(arrayDelete) && arrayDelete === true) {
        btnGroup.appendChild(deleteBtn);
      }
      if (isSet(arrayMove) && arrayMove === true) {
        btnGroup.appendChild(moveUpBtn);
        btnGroup.appendChild(moveDownBtn);
      }
      if (isSet(arrayAddAfter) && arrayAddAfter === true) {
        btnGroup.appendChild(addAfterBtn);
      }
      buttonsTd.appendChild(btnGroup);
      if (arrayButtonsPosition === "left") {
        tbodyRow.appendChild(buttonsTd);
      }
      const td = this.theme.getTableDefinition();
      child.ui.adaptForTable(child, td);
      td.appendChild(child.ui.control.container);
      tbodyRow.appendChild(td);
      if (arrayButtonsPosition === "right") {
        tbodyRow.appendChild(buttonsTd);
      }
      table.tbody.appendChild(tbodyRow);
    });
    this.refreshSortable(table.tbody);
    this.refreshAddBtn();
    this.refreshDeleteAllBtn();
    this.refreshJsonData();
    this.refreshDisabledState();
    this.refreshScrollPosition(table.container);
    table.container.addEventListener("scroll", () => {
      this.lastScrollTop = table.container.scrollTop;
      this.lastScrollLeft = table.container.scrollLeft;
    });
  }
  refreshScrollPosition(element) {
    element.scroll({
      top: this.lastScrollTop,
      left: this.lastScrollLeft
    });
  }
  refreshSortable(container) {
    if (this.isSortable()) {
      if (this.sortable) {
        this.sortable.destroy();
      }
      this.sortable = window.Sortable.create(container, {
        animation: 150,
        handle: ".jedi-array-drag",
        disabled: this.disabled || this.readOnly,
        onEnd: (evt) => {
          this.instance.move(evt.oldIndex, evt.newIndex);
        }
      });
    }
  }
}
class EditorArrayTableObject extends EditorArray {
  static resolves(schema, refParser) {
    let schemaItems = getSchemaItems(schema);
    if (!schemaItems) {
      return false;
    }
    if (refParser) {
      schemaItems = refParser.expand(schemaItems);
    }
    const itemType = getSchemaType(schemaItems);
    if (!itemType) {
      return false;
    }
    return getSchemaType(schema) === "array" && itemType === "object" && getSchemaXOption(schema, "format") === "table-object";
  }
  addEventListeners() {
    this.control.addBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    this.control.footerAddBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    if (this.control.deleteAllBtn) {
      this.control.deleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    if (this.control.footerDeleteAllBtn) {
      this.control.footerDeleteAllBtn.addEventListener("click", () => {
        this.deleteAllItems();
      });
    }
    this.addJsonDataEventListeners();
  }
  isSortable() {
    return window.Sortable && isSet(getSchemaXOption(this.instance.schema, "sortable"));
  }
  refreshUI() {
    this.control.childrenSlot.innerHTML = "";
    const table = this.theme.getTable();
    this.control.childrenSlot.appendChild(table.container);
    const arrayDelete = getSchemaXOption(this.instance.schema, "arrayDelete") ?? this.instance.jedison.getOption("arrayDelete");
    const arrayMove = getSchemaXOption(this.instance.schema, "arrayMove") ?? this.instance.jedison.getOption("arrayMove");
    const arrayButtonsPosition = getSchemaXOption(this.instance.schema, "arrayButtonsPosition") ?? this.instance.jedison.getOption("arrayButtonsPosition");
    const arrayAddAfter = getSchemaXOption(this.instance.schema, "arrayAddAfter") ?? this.instance.jedison.getOption("arrayAddAfter");
    const th = this.theme.getTableHeader();
    const { label } = this.theme.getFakeLabel({
      content: "Controls",
      visuallyHidden: true
    });
    th.appendChild(label);
    if (arrayButtonsPosition === "left") {
      table.thead.appendChild(th);
    }
    const value = this.instance.getValue();
    if (!isArray(value) || value.length === 0) {
      table.table.removeChild(table.thead);
    }
    let schemaItems = getSchemaItems(this.instance.schema);
    if (this.instance.jedison.refParser) {
      schemaItems = this.instance.jedison.refParser.expand(schemaItems);
    }
    const itemProperties = getSchemaProperties(schemaItems);
    Object.entries(itemProperties).forEach(([propertyKey, propertySchema]) => {
      const th2 = this.theme.getTableHeader();
      if (propertySchema.title) {
        const fakeLabel = this.theme.getFakeLabel({
          content: propertySchema.title
        });
        th2.appendChild(fakeLabel.label);
      }
      const schemaXInfo = getSchemaXOption(propertySchema, "info");
      if (isSet(schemaXInfo)) {
        const infoContent = this.getInfo(propertySchema);
        const info = this.theme.getInfo(infoContent);
        if (schemaXInfo.variant === "modal") {
          this.theme.infoAsModal(info, this.getIdFromPath(this.instance.path) + "-" + propertyKey, infoContent);
        }
        th2.appendChild(info.container);
      }
      table.thead.appendChild(th2);
    });
    if (arrayButtonsPosition === "right") {
      table.thead.appendChild(th);
    }
    this.instance.children.forEach((child, index2) => {
      const tbodyRow = document.createElement("tr");
      const buttonsTd = this.theme.getTableDefinition({ isButtonColumn: true });
      const { deleteBtn, moveUpBtn, moveDownBtn, dragBtn, btnGroup, addAfterBtn } = this.getButtons(index2);
      if (this.isSortable()) {
        btnGroup.appendChild(dragBtn);
      }
      if (isSet(arrayDelete) && arrayDelete === true) {
        btnGroup.appendChild(deleteBtn);
      }
      if (isSet(arrayMove) && arrayMove === true) {
        btnGroup.appendChild(moveUpBtn);
        btnGroup.appendChild(moveDownBtn);
      }
      if (isSet(arrayAddAfter) && arrayAddAfter === true) {
        btnGroup.appendChild(addAfterBtn);
      }
      buttonsTd.appendChild(btnGroup);
      if (arrayButtonsPosition === "left") {
        tbodyRow.appendChild(buttonsTd);
      }
      if (child.children.length) {
        child.children.forEach((grandchild) => {
          const td = this.theme.getTableDefinition();
          grandchild.ui.adaptForTable(td);
          td.appendChild(grandchild.ui.control.container);
          tbodyRow.appendChild(td);
        });
      } else {
        const td = this.theme.getTableDefinition();
        child.ui.adaptForTable(td);
        td.appendChild(child.ui.control.container);
        tbodyRow.appendChild(td);
      }
      if (arrayButtonsPosition === "right") {
        tbodyRow.appendChild(buttonsTd);
      }
      table.tbody.appendChild(tbodyRow);
    });
    this.refreshSortable(table.tbody);
    this.refreshAddBtn();
    this.refreshDeleteAllBtn();
    this.refreshJsonData();
    this.refreshDisabledState();
    this.refreshScrollPosition(table.container);
    table.container.addEventListener("scroll", () => {
      this.lastScrollTop = table.container.scrollTop;
      this.lastScrollLeft = table.container.scrollLeft;
    });
  }
  refreshScrollPosition(element) {
    element.scroll({
      top: this.lastScrollTop,
      left: this.lastScrollLeft
    });
  }
  refreshSortable(container) {
    if (this.isSortable()) {
      if (this.sortable) {
        this.sortable.destroy();
      }
      this.sortable = window.Sortable.create(container, {
        animation: 150,
        handle: ".jedi-array-drag",
        disabled: this.disabled || this.readOnly,
        onEnd: (evt) => {
          this.instance.move(evt.oldIndex, evt.newIndex);
        }
      });
    }
  }
}
class EditorArrayChoices extends Editor {
  static resolves(schema) {
    const hasChoicesFormat = getSchemaXOption(schema, "format") === "choices";
    const choicesInstalled = window.Choices;
    const schemaType = getSchemaType(schema);
    const schemaItems = getSchemaItems(schema);
    const schemaItemsType = isSet(schemaItems) && getSchemaType(schemaItems);
    const isArrayType = isSet(schemaType) && schemaType === "array";
    const isUniqueItems = getSchemaUniqueItems(schema) === true;
    const hasTypes = isSet(schemaItems) && isSet(schemaItemsType);
    const validTypes = ["string", "number", "integer"];
    const hasValidItemType = isSet(schemaItems) && isSet(schemaItemsType) && (validTypes.includes(schemaItemsType) || isArray(schemaItemsType) && schemaItemsType.some((type2) => validTypes.includes(type2)));
    return hasChoicesFormat && choicesInstalled && isArrayType && isUniqueItems && hasTypes && hasValidItemType;
  }
  init() {
    super.init();
    this.setupEnumSource();
  }
  setupEnumSource() {
    const enumSourceRaw = getSchemaXOption(this.instance.schema, "enumSource");
    if (!isSet(enumSourceRaw)) return;
    const enumSource = resolveInstancePath(this.instance.path, enumSourceRaw);
    const src = this.instance.jedison.getInstance(enumSource);
    if (src) this.enumSourceValues = src.getValue();
    this.instance.jedison.watch(enumSource, () => {
      if (!this.control) return;
      const s = this.instance.jedison.getInstance(enumSource);
      if (s) {
        this.enumSourceValues = s.getValue();
        this.refreshOptions();
      }
    });
  }
  getEnumSourceValues() {
    if (this.enumSourceValues !== void 0) {
      if (isArray(this.enumSourceValues)) return this.enumSourceValues;
      if (isObject(this.enumSourceValues)) return Object.keys(this.enumSourceValues);
      return [];
    }
    return this.instance.schema.items && this.instance.schema.items.enum || [];
  }
  refreshOptions() {
    if (!this.choicesInstance) return;
    const values = this.getEnumSourceValues();
    const currentValue = this.instance.getValue();
    const itemEnumTitles = getSchemaXOption(this.instance.schema.items || {}, "enumTitles") || [];
    const choices = values.map((item, index2) => ({
      value: item,
      label: itemEnumTitles[index2] || item,
      selected: isArray(currentValue) && currentValue.includes(item)
    }));
    this.choicesInstance.setChoices(choices, "value", "label", true);
  }
  build() {
    this.control = this.theme.getSelectControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values: [],
      titles: [],
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    this.control.input.setAttribute("multiple", "");
    try {
      const value = this.instance.getValue();
      const itemEnum = this.getEnumSourceValues();
      const itemEnumTitles = getSchemaXOption(this.instance.schema.items || {}, "enumTitles") || [];
      const choicesOptions = getSchemaXOption(this.instance.schema, "choicesOptions") ?? {};
      if (this.choicesInstance) {
        this.choicesInstance.destroy();
      }
      this.choices = itemEnum.map((item, index2) => ({
        value: item,
        label: itemEnumTitles[index2] || item,
        selected: isArray(value) && value.includes(item)
      }));
      this.choicesInstance = new window.Choices(this.control.input, {
        duplicateItemsAllowed: false,
        removeItemButton: true,
        choices: this.choices,
        ...choicesOptions
      });
    } catch (e) {
      console.error("Choices is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      const value = this.choicesInstance.getValue(true);
      if (value !== this.instance.getValue()) {
        this.instance.setValue(value, true, "user");
      }
    });
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      this.choicesInstance.disable();
    } else {
      this.choicesInstance.enable();
    }
  }
  refreshUI() {
    super.refreshUI();
    const value = this.instance.getValue();
    this.choicesInstance.removeActiveItems();
    if (Array.isArray(value)) {
      value.forEach((val) => {
        this.choicesInstance.setChoiceByValue(val);
      });
    }
  }
  destroy() {
    this.choicesInstance.destroy();
    super.destroy();
  }
}
class EditorArrayNav extends EditorArray {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    const regex = /^nav-(horizontal|vertical(?:-\d+)?)$/;
    const hasNavFormat = regex.test(format2);
    return getSchemaType(schema) === "array" && hasNavFormat;
  }
  navigateTo(path) {
    const nextChildPath = this.getNextChildPath(path);
    if (nextChildPath) {
      const childIndex = this.instance.children.findIndex((c) => c.path === nextChildPath);
      if (childIndex !== -1) {
        this.activeItemIndex = childIndex;
        this.refreshUI();
      }
    }
    super.navigateTo(path);
  }
  addEventListeners() {
    this.control.addBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    this.control.footerAddBtn.addEventListener("click", () => {
      this.activeItemIndex = this.instance.value.length;
      this.instance.addItem("user");
    });
    if (this.control.deleteAllBtn) {
      this.control.deleteAllBtn.addEventListener("click", () => {
        this.activeItemIndex = 0;
        this.deleteAllItems();
      });
    }
    if (this.control.footerDeleteAllBtn) {
      this.control.footerDeleteAllBtn.addEventListener("click", () => {
        this.activeItemIndex = 0;
        this.deleteAllItems();
      });
    }
    this.addJsonDataEventListeners();
  }
  refreshUI() {
    this.control.childrenSlot.innerHTML = "";
    this.clearStoredEventListeners();
    const format2 = getSchemaXOption(this.instance.schema, "format");
    const formatParts = format2.split("-");
    const variant = formatParts[1];
    const columns = formatParts[2];
    const navColumns = variant === "horizontal" ? 12 : columns ?? 4;
    const row = this.theme.getRow();
    const tabListCol = this.theme.getCol(12, 12, navColumns, navColumns);
    const tabContentCol = this.theme.getCol(12, 12, 12 - navColumns, 12 - navColumns);
    const tabContent = this.theme.getTabContent();
    const tabList = this.theme.getTabList({
      variant
    });
    const arrayDelete = getSchemaXOption(this.instance.schema, "arrayDelete") ?? this.instance.jedison.getOption("arrayDelete");
    const arrayMove = getSchemaXOption(this.instance.schema, "arrayMove") ?? this.instance.jedison.getOption("arrayMove");
    const arrayAddAfter = getSchemaXOption(this.instance.schema, "arrayAddAfter") ?? this.instance.jedison.getOption("arrayAddAfter");
    this.control.childrenSlot.appendChild(row);
    row.appendChild(tabListCol);
    row.appendChild(tabContentCol);
    tabListCol.appendChild(tabList);
    tabContentCol.appendChild(tabContent);
    this.instance.children.forEach((child, index2) => {
      const { deleteBtn, moveUpBtn, moveDownBtn, dragBtn, btnGroup, addAfterBtn } = this.getButtons(index2);
      if (isSet(arrayDelete) && arrayDelete === true) {
        btnGroup.appendChild(deleteBtn);
      }
      if (isSet(arrayMove) && arrayMove === true) {
        btnGroup.appendChild(moveUpBtn);
        btnGroup.appendChild(moveDownBtn);
      }
      if (isSet(arrayAddAfter) && arrayAddAfter === true) {
        btnGroup.appendChild(addAfterBtn);
      }
      if (this.isSortable()) {
        btnGroup.appendChild(dragBtn);
      }
      this.control.childrenSlot.appendChild(child.ui.control.container);
      const schemaTitle = getSchemaTitle(child.schema);
      const childTitle = isSet(schemaTitle) ? schemaTitle + " " + (index2 + 1) : child.getKey();
      let titleTemplate;
      const schemaOptionTitleTemplate = getSchemaXOption(this.instance.schema, "titleTemplate");
      if (schemaOptionTitleTemplate) {
        const template = schemaOptionTitleTemplate;
        const data = child.getTemplateData(template);
        titleTemplate = compileTemplate(template, data) ?? childTitle;
      }
      const active = index2 === this.activeItemIndex;
      const id = this.getIdFromPath(child.path);
      const navWarning = getSchemaXOption(this.instance.schema, "navWarning") ?? true;
      const navWarningMessage = getSchemaXOption(this.instance.schema, "navWarningMessage");
      const { list, arrayActions } = this.theme.getTab({
        hasErrors: navWarning && child.hasNestedValidationErrors(),
        navWarningMessage,
        title: (titleTemplate == null ? void 0 : titleTemplate.length) ? titleTemplate : childTitle,
        id,
        active
      });
      arrayActions.appendChild(btnGroup);
      const clickHandler = () => {
        this.activeItemIndex = index2;
      };
      list.addEventListener("click", clickHandler);
      this.storedEventListeners.push({
        element: list,
        handler: clickHandler,
        eventType: "click"
      });
      this.theme.setTabPaneAttributes(child.ui.control.container, active, id);
      tabList.appendChild(list);
      tabContent.appendChild(child.ui.control.container);
      if (this.disabled || this.instance.isReadOnly()) {
        child.ui.disable();
      } else {
        child.ui.enable();
      }
      if (index2 === 0) {
        moveUpBtn.setAttribute("disabled", "");
      }
      if (this.instance.value.length - 1 === index2) {
        moveDownBtn.setAttribute("disabled", "");
      }
    });
    this.refreshSortable(tabList);
    this.refreshDisabledState();
    this.refreshAddBtn();
    this.refreshDeleteAllBtn();
    this.refreshJsonData();
  }
  showValidationErrors(errors, force = false) {
    super.showValidationErrors(errors, force);
    this.refreshUI();
  }
  refreshSortable(container) {
    if (this.isSortable()) {
      if (this.sortable) {
        this.sortable.destroy();
      }
      this.sortable = window.Sortable.create(container, {
        animation: 150,
        handle: ".jedi-array-drag",
        disabled: this.disabled || this.readOnly,
        onEnd: (evt) => {
          this.activeItemIndex = evt.newIndex;
          this.instance.move(evt.oldIndex, evt.newIndex);
        }
      });
    }
  }
}
class EditorMultiple extends Editor {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const schemaOneOf = getSchemaOneOf(schema);
    const schemaAnyOf = getSchemaAnyOf(schema);
    return isSet(schemaAnyOf) || isSet(schemaOneOf) || schemaType === "any" || isArray(schemaType) || notSet(schemaType);
  }
  build() {
    this.switcherInput = getSchemaXOption(this.instance.schema, "switcherInput") ?? this.instance.jedison.getOption("switcherInput");
    this.embedSwitcher = getSchemaXOption(this.instance.schema, "embedSwitcher") ?? this.instance.jedison.getOption("embedSwitcher");
    this.control = this.theme.getMultipleControl({
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      id: this.getIdFromPath(this.instance.path),
      switcherOptionValues: this.instance.switcherOptionValues,
      switcherOptionsLabels: this.instance.switcherOptionsLabels,
      switcher: this.switcherInput,
      readOnly: this.instance.isReadOnly()
    });
    if (this.embedSwitcher) {
      this.control.header.style.display = "none";
    }
    this.instance.on("change", (initiator) => {
      if (initiator === "api") return;
      const jedison = this.instance.jedison;
      const errors = jedison.getErrors(["error", "warning"]);
      const prefix = this.instance.path + "/";
      const matching = [];
      for (const inst of jedison.instances.values()) {
        if (inst.ui && inst.path.startsWith(prefix)) {
          matching.push(inst);
        }
      }
      for (const inst of matching.reverse()) {
        inst.ui.showValidationErrors(errors);
      }
    });
  }
  adaptForTable(td) {
    this.theme.adaptForTableMultipleControl(this.control, td);
  }
  addEventListeners() {
    if (this.switcherInput === "select") {
      this.control.switcher.input.addEventListener("change", () => {
        const index2 = Number(this.control.switcher.input.value);
        this.instance.switchInstance(index2, void 0, "user");
      });
    }
    if (this.switcherInput === "radios" || this.switcherInput === "radios-inline") {
      this.control.switcher.radios.forEach((radio) => {
        radio.addEventListener("change", () => {
          const index2 = Number(radio.value);
          this.instance.switchInstance(index2, void 0, "user");
        });
      });
    }
  }
  refreshUI() {
    this.refreshDisabledState();
    this.control.childrenSlot.innerHTML = "";
    this.control.childrenSlot.appendChild(this.instance.activeInstance.ui.control.container);
    if (this.embedSwitcher) {
      const slot = this.instance.activeInstance.ui.control.switcherSlot;
      if (slot) {
        slot.innerHTML = "";
        slot.appendChild(this.control.switcher.container);
        this.control.header.style.display = "none";
      } else {
        this.control.header.style.display = "";
        this.control.header.appendChild(this.control.switcher.container);
      }
    }
    if (this.switcherInput === "select") {
      this.control.switcher.input.value = this.instance.index;
    }
    if (this.switcherInput === "radios" || this.switcherInput === "radios-inline") {
      this.control.switcher.radios.forEach((radio) => {
        const radioIndex = Number(radio.value);
        radio.checked = radioIndex === this.instance.index;
      });
    }
    if (this.disabled || this.instance.isReadOnly()) {
      this.instance.activeInstance.ui.disable();
    } else {
      this.instance.activeInstance.ui.enable();
    }
  }
  getErrorFeedback(config) {
    return this.theme.getAlert(config);
  }
}
class EditorNull extends Editor {
  static resolves(schema) {
    return getSchemaType(schema) === "null";
  }
  build() {
    this.control = this.theme.getNullControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden") || getSchemaXOption(this.instance.schema, "format") === "hidden",
      info: this.getInfo()
    });
  }
  sanitize() {
    return null;
  }
}
class EditorStringSimpleMDE extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "simplemde" && window.SimpleMDE && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getTextareaControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const simplemdeOptions = clone(getSchemaXOption(this.instance.schema, "simplemde") ?? {});
      simplemdeOptions.element = this.control.input;
      this.simplemde = new window.SimpleMDE(simplemdeOptions);
    } catch (e) {
      console.error("simpleMDE is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.simplemde.codemirror.on("blur", () => {
      const mdeText = this.simplemde.value();
      if (mdeText !== this.instance.getValue()) {
        this.instance.setValue(mdeText, true, "user");
      }
    });
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      if (!this.simplemde.isPreviewActive()) {
        this.simplemde.togglePreview();
        this.control.container.querySelector(".editor-toolbar").style.display = "none";
      }
    } else {
      if (this.simplemde.isPreviewActive()) {
        this.simplemde.togglePreview();
        this.control.container.querySelector(".editor-toolbar").style.display = "block";
      }
    }
  }
  refreshUI() {
    super.refreshUI();
    this.simplemde.value(this.instance.getValue());
  }
  destroy() {
    if (this.aceEditor) {
      this.aceEditor.destroy();
      this.aceEditor.container.remove();
    }
    super.destroy();
  }
}
class EditorStringQuill extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "quill" && window.Quill && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getPlaceholderControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const quillOptions = getSchemaXOption(this.instance.schema, "quill") ?? {};
      this.quill = new window.Quill(this.control.placeholder, quillOptions);
    } catch (e) {
      console.error("Quill is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.quill.root.addEventListener("blur", () => {
      const quillText = this.quill.getText();
      if (quillText !== this.instance.getValue()) {
        this.instance.setValue(quillText, true, "user");
      }
    });
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      this.quill.disable();
    } else {
      this.quill.enable();
    }
  }
  refreshUI() {
    super.refreshUI();
    this.quill.setText(this.instance.getValue());
  }
}
class EditorStringJodit extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "jodit" && window.Jodit && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getTextareaControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const joditDefaultOptions = {
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
        toolbarAdaptive: false,
        buttons: [
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "|",
          "ul",
          "ol",
          "|",
          "link",
          "|",
          "source",
          "preview"
        ]
      };
      const joditSchemaOptions = getSchemaXOption(this.instance.schema, "jodit") ?? {};
      const joditOptions = Object.assign({}, joditDefaultOptions, joditSchemaOptions);
      this.jodit = window.Jodit.make(this.control.input, joditOptions);
    } catch (e) {
      console.error("Jodit is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.jodit.events.on("change", () => {
      const joditValue = this.jodit.value;
      if (joditValue !== this.instance.getValue()) {
        const savedSelection = this.jodit.selection.save();
        this.instance.setValue(joditValue, true, "user");
        this.jodit.selection.restore(savedSelection);
      }
    });
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      this.jodit.setReadOnly(true);
    } else {
      this.jodit.setReadOnly(false);
    }
  }
  refreshUI() {
    super.refreshUI();
    const joditInstanceValue = this.instance.getValue();
    if (this.jodit.value !== joditInstanceValue) {
      this.jodit.value = joditInstanceValue;
    }
  }
  destroy() {
    this.jodit.destruct();
    super.destroy();
  }
}
class EditorStringPickr extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "pickr" && window.Pickr && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getPlaceholderControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    const pickrOptions = getSchemaXOption(this.instance.schema, "pickr") ?? {};
    try {
      this.pickr = window.Pickr.create({
        el: this.control.placeholder,
        default: this.instance.getValue() || "#000000",
        comparison: false,
        ...pickrOptions
      });
      const updateValue = (color) => {
        const value = color ? color.toHEXA().toString() : "";
        this.updatingFromPickr = true;
        this.instance.setValue(value, true, "user");
        this.updatingFromPickr = false;
      };
      this.pickr.on("change", (color) => {
        updateValue(color);
        this.pickr.applyColor(true);
      });
      this.pickr.on("save", updateValue);
      this.pickr.on("hide", () => updateValue(this.pickr.getColor()));
      this.refreshUI();
    } catch (e) {
      console.error("Pickr is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
  }
  refreshUI() {
    if (!this.pickr) return;
    this.refreshTemplates();
    if (this.disabled) {
      this.pickr.disable();
    } else {
      this.pickr.enable();
    }
    if (!this.updatingFromPickr) {
      const value = this.instance.getValue();
      if (value) {
        this.pickr.setColor(value, true);
      }
    }
  }
  destroy() {
    if (this.pickr) {
      this.pickr.destroyAndRemove();
    }
    super.destroy();
  }
}
class EditorStringFlatpickr extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "flatpickr" && window.flatpickr && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const flatpickrOptions = getSchemaXOption(this.instance.schema, "flatpickr") ?? {};
      this.flatpickr = window.flatpickr(this.control.input, flatpickrOptions);
    } catch (e) {
      console.error("Flatpickr is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      this.instance.setValue(this.control.input.value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.flatpickr.setDate(this.instance.getValue());
  }
  destroy() {
    this.flatpickr.destroy();
    super.destroy();
  }
}
class EditorStringIMask extends EditorString {
  static resolves(schema) {
    const hasSchemaTypeString = getSchemaType(schema) === "string";
    const imaskAvailable = window.IMask;
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "imask" && hasSchemaTypeString && imaskAvailable;
  }
  build() {
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const schemaImask = getSchemaXOption(this.instance.schema, "imask") ?? {};
      const schemaImaskSettings = schemaImask["x-settings"];
      const settings = schemaImaskSettings && this.instance.jedison.getOption("settings")[schemaImaskSettings] ? this.instance.jedison.getOption("settings")[schemaImaskSettings] : {};
      const imaskOptions = { ...schemaImask, ...settings };
      this.imask = window.IMask(this.control.input, imaskOptions);
      this.useMaskedValue = schemaImask["x-masked"] ?? false;
    } catch (e) {
      console.error("IMask is not available or not loaded or configured correctly.", e);
    }
  }
  addEventListeners() {
    this.imask.on("accept", () => {
      const value = this.useMaskedValue ? this.imask.value : this.imask.unmaskedValue;
      this.instance.setValue(value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    this.imask.value = this.instance.getValue();
  }
  destroy() {
    this.imask.destroy();
    super.destroy();
  }
}
class EditorNumberIMask extends EditorNumber {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const imaskAvailable = window.IMask;
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "imask" && schemaType === "number" && imaskAvailable;
  }
  build() {
    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const schemaImask = getSchemaXOption(this.instance.schema, "imask") ?? {};
      const schemaImaskSettings = schemaImask["x-settings"];
      const settings = schemaImaskSettings && this.instance.jedison.getOption("settings")[schemaImaskSettings] ? this.instance.jedison.getOption("settings")[schemaImaskSettings] : {};
      const imaskOptions = {
        mask: Number,
        ...schemaImask,
        ...settings
      };
      this.imask = window.IMask(this.control.input, imaskOptions);
      this.useMaskedValue = schemaImask["x-masked"] ?? false;
    } catch (e) {
      console.error("IMask is not available or not loaded or configured correctly.", e);
    }
  }
  addEventListeners() {
    this.imask.on("accept", () => {
      const value = this.imask.typedValue;
      this.instance.setValue(value, true, "user");
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    const val = this.instance.getValue();
    this.imask.value = val != null ? String(val) : "";
  }
  destroy() {
    this.imask.destroy();
    super.destroy();
  }
}
class EditorNumberRaty extends EditorNumber {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "raty" && typeof Raty !== "undefined" && getSchemaType(schema) === "number";
  }
  build() {
    this.control = this.theme.getPlaceholderControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const ratyOptions = getSchemaXOption(this.instance.schema, "raty") ?? {};
      this.raty = new Raty(this.control.placeholder, Object.assign({}, ratyOptions, {
        click: (score) => {
          this.instance.setValue(score, true, "user");
        }
      }));
      this.raty.init();
    } catch (e) {
      console.error("Raty is not available or not loaded correctly.", e);
    }
  }
  adaptForTable() {
    this.theme.visuallyHidden(this.control.label);
    this.theme.visuallyHidden(this.control.description);
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      this.raty.readOnly(true);
    } else {
      this.raty.readOnly(false);
    }
  }
  refreshUI() {
    super.refreshUI();
    this.raty.score(this.instance.getValue());
  }
}
class EditorAnyJson extends Editor {
  static resolves(schema) {
    return getSchemaXOption(schema, "format") === "json";
  }
  build() {
    this.control = this.theme.getTextareaControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    this.jsonErrorEl = document.createElement("div");
    this.jsonErrorEl.style.color = "red";
    this.control.container.appendChild(this.jsonErrorEl);
  }
  addEventListeners() {
    this.control.input.addEventListener("change", () => {
      try {
        const parsed = JSON.parse(this.control.input.value);
        this.jsonErrorEl.textContent = "";
        this.instance.setValue(parsed, true, "user");
      } catch (e) {
        this.jsonErrorEl.textContent = e.message;
      }
    });
  }
  refreshUI() {
    this.control.input.value = JSON.stringify(this.instance.getValue(), null, 2);
  }
}
class EditorArrayCheckboxes extends Editor {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const schemaItems = getSchemaItems(schema);
    const schemaItemsType = isSet(schemaItems) && getSchemaType(schemaItems);
    const isArrayType = isSet(schemaType) && schemaType === "array";
    const isUniqueItems = getSchemaUniqueItems(schema) === true;
    const hasEnum = isSet(schemaItems) && isSet(getSchemaEnum(schema.items));
    const hasTypes = isSet(schemaItems) && isSet(schemaItemsType);
    const hasEnumSource = isSet(getSchemaXOption(schema, "enumSource"));
    const validTypes = ["string", "number", "integer"];
    const hasValidItemType = isSet(schemaItems) && isSet(schemaItemsType) && (validTypes.includes(schemaItemsType) || isArray(schemaItemsType) && schemaItemsType.some((type2) => validTypes.includes(type2)));
    return isArrayType && isUniqueItems && (hasEnumSource || hasEnum && hasTypes && hasValidItemType);
  }
  init() {
    super.init();
    this.setupEnumSource();
  }
  setupEnumSource() {
    const enumSourceRaw = getSchemaXOption(this.instance.schema, "enumSource");
    if (!isSet(enumSourceRaw)) return;
    const enumSource = resolveInstancePath(this.instance.path, enumSourceRaw);
    const src = this.instance.jedison.getInstance(enumSource);
    if (src) this.enumSourceValues = src.getValue();
    this.instance.jedison.watch(enumSource, () => {
      if (!this.control) return;
      const s = this.instance.jedison.getInstance(enumSource);
      if (s) {
        this.enumSourceValues = s.getValue();
        this.refreshOptions();
      }
    });
  }
  getEnumSourceValues() {
    if (this.enumSourceValues !== void 0) {
      if (isArray(this.enumSourceValues)) return this.enumSourceValues;
      if (isObject(this.enumSourceValues)) return Object.keys(this.enumSourceValues);
      return [];
    }
    return getSchemaEnum(this.instance.schema.items) || [];
  }
  build() {
    const values = this.getEnumSourceValues();
    const schemaItems = this.instance.schema.items || {};
    const titles = getSchemaXOption(schemaItems, "enumTitles") || values;
    this.control = this.theme.getCheckboxesControl({
      title: this.getTitle(),
      description: this.getDescription(),
      values,
      titles,
      id: this.getIdFromPath(this.instance.path),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      inline: getSchemaXOption(this.instance.schema, "format") === "checkboxes-inline",
      info: this.getInfo()
    });
  }
  refreshOptions() {
    const values = this.getEnumSourceValues();
    const schemaItems = this.instance.schema.items || {};
    const titles = getSchemaXOption(schemaItems, "enumTitles") || values;
    const id = this.getIdFromPath(this.instance.path);
    const messagesId = id + "-messages";
    const descriptionId = id + "-description";
    const describedBy = messagesId + " " + descriptionId;
    this.control.checkboxControls.forEach((cc) => {
      if (cc.parentNode) cc.parentNode.removeChild(cc);
    });
    this.control.checkboxes = [];
    this.control.labels = [];
    this.control.checkboxControls = [];
    this.control.labelTexts = [];
    values.forEach((value, index2) => {
      const checkboxId = id + "-" + index2;
      const checkboxControl = document.createElement("div");
      const checkbox = document.createElement("input");
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("id", checkboxId);
      checkbox.setAttribute("name", id);
      checkbox.setAttribute("value", value);
      checkbox.setAttribute("aria-describedby", describedBy);
      label.setAttribute("for", checkboxId);
      labelText.textContent = titles && titles[index2] !== void 0 ? titles[index2] : value;
      checkboxControl.appendChild(checkbox);
      checkboxControl.appendChild(label);
      label.appendChild(labelText);
      this.control.checkboxes.push(checkbox);
      this.control.labels.push(label);
      this.control.labelTexts.push(labelText);
      this.control.checkboxControls.push(checkboxControl);
      this.control.fieldset.insertBefore(checkboxControl, this.control.description);
    });
    this.addEventListeners();
    this.refreshUI();
  }
  adaptForTable(td) {
    this.theme.adaptForTableCheckboxesControl(this.control, td);
  }
  addEventListeners() {
    this.control.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        let value = this.instance.getValue();
        if (!isArray(value)) {
          value = [];
        }
        if (checkbox.checked) {
          value.push(checkbox.value);
        } else {
          const index2 = value.indexOf(checkbox.value);
          if (index2 > -1) {
            value.splice(index2, 1);
          }
        }
        this.instance.setValue(value, true, "user");
      });
    });
  }
  refreshUI() {
    this.refreshDisabledState();
    const value = this.instance.getValue();
    if (!isArray(value)) {
      return;
    }
    this.control.checkboxes.forEach((checkbox) => {
      checkbox.checked = value.includes(checkbox.value);
    });
  }
  setAriaInvalid(invalid) {
    this.control.checkboxes.forEach((checkbox) => {
      if (invalid) {
        checkbox.setAttribute("aria-invalid", "true");
      } else {
        checkbox.removeAttribute("aria-invalid");
      }
    });
  }
}
class EditorNumberRange extends EditorNumber {
  static resolves(schema) {
    const schemaType = getSchemaType(schema);
    const isNumericType = schemaType === "number" || schemaType === "integer";
    if (!isNumericType) {
      return false;
    }
    const hasFormatRange = getSchemaXOption(schema, "format") === "range";
    return isNumericType && hasFormatRange;
  }
  build() {
    let optionMin = 0;
    let optionMax = 100;
    if (isSet(this.instance.schema.minimum)) {
      optionMin = this.instance.schema.minimum;
    } else if (isSet(this.instance.schema.exclusiveMinimum)) {
      optionMin = this.instance.schema.exclusiveMinimum + 0.01;
    }
    if (isSet(this.instance.schema.maximum)) {
      optionMax = this.instance.schema.maximum;
    } else if (isSet(this.instance.schema.exclusiveMaximum)) {
      optionMax = this.instance.schema.exclusiveMaximum - 0.01;
    }
    let optionStep;
    const schemaType = getSchemaType(this.instance.schema);
    const multipleOf2 = this.instance.schema.multipleOf;
    if (isSet(multipleOf2)) {
      optionStep = multipleOf2;
    } else if (schemaType === "integer") {
      optionStep = 1;
    } else {
      optionStep = 0.01;
    }
    this.control = this.theme.getInputRangeControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "range",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    const useConstraintAttributes = getSchemaXOption(this.instance.schema, "useConstraintAttributes") ?? this.instance.jedison.getOption("useConstraintAttributes");
    if (useConstraintAttributes === true) {
      this.control.input.setAttribute("min", optionMin);
      this.control.input.setAttribute("max", optionMax);
    }
    this.control.input.setAttribute("step", optionStep);
    const inputAttributes = getSchemaXOption(this.instance.schema, "inputAttributes");
    if (inputAttributes && typeof inputAttributes === "object") {
      Object.keys(inputAttributes).forEach((attr) => {
        this.control.input.setAttribute(attr, inputAttributes[attr]);
      });
    }
    const currentValue = this.instance.getValue();
    this.control.output.textContent = currentValue !== void 0 ? currentValue : optionMin;
  }
  adaptForTable() {
    this.theme.adaptForTableInputControl(this.control);
  }
  addEventListeners() {
    this.control.input.addEventListener("input", () => {
      this.control.output.textContent = parseFloat(this.control.input.value);
    });
    const eventType = this.getValidationEventType();
    this.control.input.addEventListener(eventType, () => {
      const value = parseFloat(this.control.input.value);
      this.control.output.textContent = value;
      this.instance.setValue(value, true, "user");
    });
  }
  sanitize(value) {
    const schemaType = getSchemaType(this.instance.schema);
    const numValue = Number(value);
    if (schemaType === "integer") {
      return Math.round(numValue);
    }
    return numValue;
  }
  refreshUI() {
    super.refreshUI();
    const currentValue = this.instance.getValue();
    this.control.input.value = currentValue !== void 0 ? currentValue : 0;
    if (this.control.output) {
      this.control.output.textContent = currentValue !== void 0 ? currentValue : 0;
    }
  }
}
class EditorStringAce extends EditorString {
  static resolves(schema) {
    const format2 = getSchemaXOption(schema, "format");
    return isSet(format2) && format2 === "ace" && window.ace && getSchemaType(schema) === "string";
  }
  build() {
    this.control = this.theme.getTextareaControl({
      title: this.getTitle(),
      description: this.getDescription(),
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: getSchemaXOption(this.instance.schema, "titleIconClass"),
      titleHidden: getSchemaXOption(this.instance.schema, "titleHidden"),
      info: this.getInfo()
    });
    try {
      const aceOptions = getSchemaXOption(this.instance.schema, "ace") ?? {};
      const mode = aceOptions.mode || "text";
      this.aceContainer = document.createElement("div");
      const height = aceOptions.height || "300px";
      const width = aceOptions.width || "100%";
      const minHeight = aceOptions.minHeight;
      const maxHeight = aceOptions.maxHeight;
      const minWidth = aceOptions.minWidth;
      const maxWidth = aceOptions.maxWidth;
      this.aceContainer.style.height = height;
      this.aceContainer.style.width = width;
      if (minHeight) this.aceContainer.style.minHeight = minHeight;
      if (maxHeight) this.aceContainer.style.maxHeight = maxHeight;
      if (minWidth) this.aceContainer.style.minWidth = minWidth;
      if (maxWidth) this.aceContainer.style.maxWidth = maxWidth;
      this.control.input.style.display = "none";
      this.control.input.parentNode.insertBefore(this.aceContainer, this.control.input);
      this.aceEditor = window.ace.edit(this.aceContainer);
      this.aceEditor.setTheme(aceOptions.theme || "ace/theme/chrome");
      try {
        this.aceEditor.session.setMode(`ace/mode/${mode}`);
      } catch {
        console.warn(`Ace mode "${mode}" not loaded`);
      }
      const initialValue = this.instance.getValue();
      this.aceEditor.setValue(typeof initialValue === "string" ? initialValue : "");
      this.aceEditor.clearSelection();
    } catch (e) {
      console.error("Ace editor is not available or not loaded correctly.", e);
    }
  }
  addEventListeners() {
    if (!this.aceEditor) return;
    this.aceEditor.on("blur", () => {
      const aceText = this.aceEditor.getValue();
      const currentValue = this.instance.getValue();
      if (aceText !== currentValue) {
        this.instance.setValue(aceText, true, "user");
      }
    });
  }
  refreshDisabledState() {
    if (this.disabled || this.readOnly) {
      this.aceEditor.setReadOnly(true);
      this.aceContainer.style.opacity = "0.6";
      this.aceContainer.classList.add("ace-disabled");
    } else {
      this.aceEditor.setReadOnly(false);
      this.aceContainer.style.opacity = "1";
      this.aceContainer.classList.remove("ace-disabled");
    }
  }
  refreshUI() {
    super.refreshUI();
    const value = this.instance.getValue();
    const stringValue = typeof value === "string" ? value : String(value || "");
    if (this.aceEditor.getValue() !== stringValue) {
      this.aceEditor.setValue(stringValue);
      this.aceEditor.clearSelection();
    }
  }
}
class UiResolver {
  constructor(options) {
    this.customEditors = options.customEditors ?? [];
    this.refParser = options.refParser ?? null;
    this.editors = [
      EditorNumberInputNullable,
      EditorMultiple,
      EditorIfThenElse,
      EditorAnyJson,
      EditorRadios,
      EditorBooleanCheckbox,
      EditorBooleanSelect,
      EditorStringRadios,
      EditorStringSelect,
      EditorStringTextarea,
      EditorStringAwesomplete,
      EditorStringEmojiButton,
      EditorStringSimpleMDE,
      EditorStringQuill,
      EditorStringJodit,
      EditorStringPickr,
      EditorStringFlatpickr,
      EditorStringIMask,
      EditorStringAce,
      EditorStringInput,
      EditorNumberIMask,
      EditorNumberRaty,
      EditorNumberRange,
      EditorNumberRadios,
      EditorNumberSelect,
      EditorNumberInput,
      EditorObjectGrid,
      EditorObjectCategories,
      EditorObjectNav,
      EditorObject,
      EditorArrayChoices,
      EditorArrayCheckboxes,
      EditorArrayTuple,
      EditorArrayTableObject,
      EditorArrayTable,
      EditorArrayNav,
      EditorArray,
      EditorNull
    ];
  }
  getClass(schema) {
    for (const editor of this.customEditors) {
      if (editor.resolves(schema, this.refParser)) {
        return editor;
      }
    }
    for (const editor of this.editors) {
      if (editor.resolves(schema, this.refParser)) {
        return editor;
      }
    }
    return null;
  }
}
const defaultTranslations = {
  errorAdditionalProperties: 'Has additional property "{{ property }}" but no additional properties are allowed.',
  errorAnyOf: "Must validate against at least one of the provided schemas.",
  errorConst: "Must have value of: {{ const }}.",
  errorContains: "Must contain at least one item matching the provided schema.",
  errorDependentRequired: "Must have the required properties: {{ dependentRequired }}.",
  errorEnum: "Must be one of the enumerated values: {{ enum }}.",
  errorExclusiveMaximum: "Must be less than {{ exclusiveMaximum }}.",
  errorExclusiveMinimum: "Must be greater than {{ exclusiveMinimum }}.",
  errorFormat: "Must be a valid {{ format }}.",
  errorItems: "Must have items that validate against the provided schema.",
  errorMaximum: "Must be at most {{ maximum }}.",
  errorMaxItems: "Must have at most {{ maxItems }} items.",
  errorMaxLength: "Must be at most {{ maxLength }} characters long.",
  errorMaxProperties: "Must have at most {{ maxProperties }} properties.",
  errorMaxContains: "Must contain at most {{ maxContains }} items matching the provided schema. It currently contains {{ counter }}.",
  errorMinContains: "Must contain at least {{ minContains }} items matching the provided schema. It currently contains {{ counter }}.",
  errorMinimum: "Must be at least {{ minimum }}.",
  errorMinItems: "Must have at least {{ minItems }} items.",
  errorMinLength: "Must be at least {{ minLength }} characters long.",
  errorMinProperties: "Must have at least {{ minProperties }} properties.",
  errorMultipleOf: "Must be multiple of {{ multipleOf }}.",
  errorNot: "Must not validate against the provided schema.",
  errorOneOf: "Must validate against exactly one of the provided schemas. It currently validates against {{ counter }} of the schemas.",
  errorPattern: 'Must match the pattern: "{{ pattern }}".',
  errorPrefixItems: "Item {{ index }} fails validation.",
  errorPropertyNames: 'Property name "{{ propertyName }}" fails validation.',
  errorProperties: "The following properties do not comply with their schemas: {{ properties }}",
  errorRequired: "Must have the required properties: {{ required }}.",
  errorType: "Must be of type {{ type }}.",
  errorUnevaluatedProperties: 'Has invalid unevaluated property "{{ property }}"',
  errorUniqueItems: "Must have unique items.",
  arrayDelete: "Delete item",
  arrayMoveUp: "Move up",
  arrayMoveDown: "Move down",
  arrayDrag: "Drag",
  arrayAdd: "Add item",
  arrayAddAfter: "Add after",
  arrayConfirmDelete: "Are you sure you want to delete this item?",
  arrayDeleteAll: "Delete all items",
  arrayConfirmDeleteAll: "Are you sure you want to delete all items?",
  objectAddProperty: "Add property",
  objectPropertyAdded: "field was added to the form",
  objectPropertyRemoved: "field was removed from the form",
  propertiesToggle: "Properties",
  collapseToggle: "Collapse"
};
const translations = {
  en: {
    errorAdditionalProperties: 'Has additional property "{{ property }}" but no additional properties are allowed.',
    errorAnyOf: "Must validate against at least one of the provided schemas.",
    errorConst: "Must have value of: {{ const }}.",
    errorContains: "Must contain at least one item matching the provided schema.",
    errorDependentRequired: "Must have the required properties: {{ dependentRequired }}.",
    errorEnum: "Must be one of the enumerated values: {{ enum }}.",
    errorExclusiveMaximum: "Must be less than {{ exclusiveMaximum }}.",
    errorExclusiveMinimum: "Must be greater than {{ exclusiveMinimum }}.",
    errorFormat: "Invalid format: {{ format }}.",
    errorItems: "Must have items that validate against the provided schema.",
    errorMaximum: "Must be at most {{ maximum }}.",
    errorMaxItems: "Must have at most {{ maxItems }} items.",
    errorMaxLength: "Must be at most {{ maxLength }} characters long.",
    errorMaxProperties: "Must have at most {{ maxProperties }} properties.",
    errorMaxContains: "Must contain at most {{ maxContains }} items matching the provided schema. It currently contains {{ counter }}.",
    errorMinContains: "Must contain at least {{ minContains }} items matching the provided schema. It currently contains {{ counter }}.",
    errorMinimum: "Must be at least {{ minimum }}.",
    errorMinItems: "Must have at least {{ minItems }} items.",
    errorMinLength: "Must be at least {{ minLength }} characters long.",
    errorMinProperties: "Must have at least {{ minProperties }} properties.",
    errorMultipleOf: "Must be multiple of {{ multipleOf }}.",
    errorNot: "Must not validate against the provided schema.",
    errorOneOf: "Must validate against exactly one of the provided schemas. It currently validates against {{ counter }} of the schemas.",
    errorPattern: 'Must match the pattern: "{{ pattern }}".',
    errorPrefixItems: "Item {{ index }} fails validation.",
    errorPropertyNames: 'Property name "{{ propertyName }}" fails validation.',
    errorProperties: "The following properties do not comply with their schemas: {{ properties }}",
    errorRequired: "Must have the required properties: {{ required }}.",
    errorType: "Must be of type {{ type }}.",
    errorUnevaluatedProperties: 'Has invalid unevaluated property "{{ property }}"',
    errorUniqueItems: "Must have unique items.",
    arrayDelete: "Delete item",
    arrayMoveUp: "Move up",
    arrayMoveDown: "Move down",
    arrayDrag: "Drag",
    arrayAdd: "Add item",
    arrayConfirmDelete: "Are you sure you want to delete this item?",
    arrayDeleteAll: "Delete all items",
    arrayConfirmDeleteAll: "Are you sure you want to delete all items?",
    objectAddProperty: "Add property",
    objectPropertyAdded: "field was added to the form",
    objectPropertyRemoved: "field was removed from the form",
    propertiesToggle: "Properties",
    collapseToggle: "Collapse"
  },
  de: {
    errorAdditionalProperties: 'Hat die zusätzliche Eigenschaft "{{ property }}", aber keine zusätzlichen Eigenschaften sind erlaubt.',
    errorAnyOf: "Muss mindestens einem der bereitgestellten Schemata entsprechen.",
    errorConst: "Muss den Wert {{ const }} haben.",
    errorContains: "Muss mindestens ein Element enthalten, das dem bereitgestellten Schema entspricht.",
    errorDependentRequired: "Muss die erforderlichen Eigenschaften haben: {{ dependentRequired }}.",
    errorEnum: "Muss einer der aufgeführten Werte sein: {{ enum }}.",
    errorExclusiveMaximum: "Muss kleiner als {{ exclusiveMaximum }} sein.",
    errorExclusiveMinimum: "Muss größer als {{ exclusiveMinimum }} sein.",
    errorFormat: "Ungültiges Format: {{ format }}.",
    errorItems: "Muss Elemente enthalten, die dem bereitgestellten Schema entsprechen.",
    errorMaximum: "Darf höchstens {{ maximum }} sein.",
    errorMaxItems: "Darf höchstens {{ maxItems }} Elemente enthalten.",
    errorMaxLength: "Darf höchstens {{ maxLength }} Zeichen lang sein.",
    errorMaxProperties: "Darf höchstens {{ maxProperties }} Eigenschaften haben.",
    errorMaxContains: "Darf höchstens {{ maxContains }} Elemente enthalten, die dem bereitgestellten Schema entsprechen. Aktuell enthält es {{ counter }}.",
    errorMinContains: "Muss mindestens {{ minContains }} Elemente enthalten, die dem bereitgestellten Schema entsprechen. Aktuell enthält es {{ counter }}.",
    errorMinimum: "Muss mindestens {{ minimum }} sein.",
    errorMinItems: "Muss mindestens {{ minItems }} Elemente enthalten.",
    errorMinLength: "Muss mindestens {{ minLength }} Zeichen lang sein.",
    errorMinProperties: "Muss mindestens {{ minProperties }} Eigenschaften haben.",
    errorMultipleOf: "Muss ein Vielfaches von {{ multipleOf }} sein.",
    errorNot: "Darf nicht dem bereitgestellten Schema entsprechen.",
    errorOneOf: "Muss genau einem der bereitgestellten Schemata entsprechen. Derzeit entspricht es {{ counter }} der Schemata.",
    errorPattern: 'Muss dem Muster "{{ pattern }}" entsprechen.',
    errorPrefixItems: "Element {{ index }} entspricht nicht der Validierung.",
    errorPropertyNames: 'Der Eigenschaftsname "{{ propertyName }}" entspricht nicht der Validierung.',
    errorProperties: "Die folgenden Eigenschaften entsprechen nicht ihren Schemata: {{ properties }}",
    errorRequired: "Muss die erforderlichen Eigenschaften haben: {{ required }}.",
    errorType: "Muss vom Typ {{ type }} sein.",
    errorUnevaluatedProperties: 'Hat eine ungültige nicht bewertete Eigenschaft "{{ property }}"',
    errorUniqueItems: "Muss eindeutige Elemente haben.",
    arrayDelete: "Element löschen",
    arrayMoveUp: "Nach oben verschieben",
    arrayMoveDown: "Nach unten verschieben",
    arrayDrag: "Ziehen",
    arrayAdd: "Element hinzufügen",
    arrayConfirmDelete: "Möchten Sie dieses Element wirklich löschen?",
    arrayDeleteAll: "Alle Elemente löschen",
    arrayConfirmDeleteAll: "Möchten Sie wirklich alle Elemente löschen?",
    objectAddProperty: "Eigenschaft hinzufügen",
    objectPropertyAdded: "Feld wurde dem Formular hinzugefügt",
    objectPropertyRemoved: "Feld wurde aus dem Formular entfernt",
    propertiesToggle: "Eigenschaften",
    collapseToggle: "Einklappen"
  },
  it: {
    errorAdditionalProperties: 'Ha la proprietà aggiuntiva "{{ property }}" ma non sono consentite proprietà aggiuntive.',
    errorAnyOf: "Deve rispettare almeno uno degli schemi forniti.",
    errorConst: "Deve avere il valore: {{ const }}.",
    errorContains: "Deve contenere almeno un elemento che rispetti lo schema fornito.",
    errorDependentRequired: "Deve avere le proprietà richieste: {{ dependentRequired }}.",
    errorEnum: "Deve essere uno dei valori elencati: {{ enum }}.",
    errorExclusiveMaximum: "Deve essere inferiore a {{ exclusiveMaximum }}.",
    errorExclusiveMinimum: "Deve essere maggiore di {{ exclusiveMinimum }}.",
    errorFormat: "Formato non valido: {{ format }}.",
    errorItems: "Deve avere elementi che rispettano lo schema fornito.",
    errorMaximum: "Deve essere al massimo {{ maximum }}.",
    errorMaxItems: "Deve avere al massimo {{ maxItems }} elementi.",
    errorMaxLength: "Deve avere al massimo {{ maxLength }} caratteri.",
    errorMaxProperties: "Deve avere al massimo {{ maxProperties }} proprietà.",
    errorMaxContains: "Deve contenere al massimo {{ maxContains }} elementi che rispettano lo schema fornito. Attualmente ne contiene {{ counter }}.",
    errorMinContains: "Deve contenere almeno {{ minContains }} elementi che rispettano lo schema fornito. Attualmente ne contiene {{ counter }}.",
    errorMinimum: "Deve essere almeno {{ minimum }}.",
    errorMinItems: "Deve avere almeno {{ minItems }} elementi.",
    errorMinLength: "Deve avere almeno {{ minLength }} caratteri.",
    errorMinProperties: "Deve avere almeno {{ minProperties }} proprietà.",
    errorMultipleOf: "Deve essere un multiplo di {{ multipleOf }}.",
    errorNot: "Non deve rispettare lo schema fornito.",
    errorOneOf: "Deve rispettare esattamente uno degli schemi forniti. Attualmente rispetta {{ counter }} degli schemi.",
    errorPattern: 'Deve rispettare il modello: "{{ pattern }}".',
    errorPrefixItems: "L'elemento {{ index }} non è valido.",
    errorPropertyNames: 'Il nome della proprietà "{{ propertyName }}" non è valido.',
    errorProperties: "Le seguenti proprietà non rispettano i loro schemi: {{ properties }}",
    errorRequired: "Deve avere le proprietà richieste: {{ required }}.",
    errorType: "Deve essere di tipo {{ type }}.",
    errorUnevaluatedProperties: 'Ha una proprietà non valutata non valida "{{ property }}"',
    errorUniqueItems: "Deve avere elementi univoci.",
    arrayDelete: "Elimina elemento",
    arrayMoveUp: "Sposta su",
    arrayMoveDown: "Sposta giù",
    arrayDrag: "Trascina",
    arrayAdd: "Aggiungi elemento",
    arrayConfirmDelete: "Sei sicuro di voler eliminare questo elemento?",
    arrayDeleteAll: "Elimina tutti gli elementi",
    arrayConfirmDeleteAll: "Sei sicuro di voler eliminare tutti gli elementi?",
    objectAddProperty: "Aggiungi proprietà",
    objectPropertyAdded: "Campo aggiunto al modulo",
    objectPropertyRemoved: "Campo rimosso dal modulo",
    propertiesToggle: "Proprietà",
    collapseToggle: "Comprimi"
  },
  es: {
    errorAdditionalProperties: 'Tiene la propiedad adicional "{{ property }}" pero no se permiten propiedades adicionales.',
    errorAnyOf: "Debe cumplir con al menos uno de los esquemas proporcionados.",
    errorConst: "Debe tener el valor: {{ const }}.",
    errorContains: "Debe contener al menos un elemento que cumpla con el esquema proporcionado.",
    errorDependentRequired: "Debe tener las propiedades requeridas: {{ dependentRequired }}.",
    errorEnum: "Debe ser uno de los valores enumerados: {{ enum }}.",
    errorExclusiveMaximum: "Debe ser menor que {{ exclusiveMaximum }}.",
    errorExclusiveMinimum: "Debe ser mayor que {{ exclusiveMinimum }}.",
    errorFormat: "Formato no válido: {{ format }}.",
    errorItems: "Debe tener elementos que cumplan con el esquema proporcionado.",
    errorMaximum: "Debe ser como máximo {{ maximum }}.",
    errorMaxItems: "Debe tener como máximo {{ maxItems }} elementos.",
    errorMaxLength: "Debe tener como máximo {{ maxLength }} caracteres.",
    errorMaxProperties: "Debe tener como máximo {{ maxProperties }} propiedades.",
    errorMaxContains: "Debe contener como máximo {{ maxContains }} elementos que cumplan con el esquema proporcionado. Actualmente contiene {{ counter }}.",
    errorMinContains: "Debe contener al menos {{ minContains }} elementos que cumplan con el esquema proporcionado. Actualmente contiene {{ counter }}.",
    errorMinimum: "Debe ser al menos {{ minimum }}.",
    errorMinItems: "Debe tener al menos {{ minItems }} elementos.",
    errorMinLength: "Debe tener al menos {{ minLength }} caracteres.",
    errorMinProperties: "Debe tener al menos {{ minProperties }} propiedades.",
    errorMultipleOf: "Debe ser múltiplo de {{ multipleOf }}.",
    errorNot: "No debe cumplir con el esquema proporcionado.",
    errorOneOf: "Debe cumplir con exactamente uno de los esquemas proporcionados. Actualmente cumple con {{ counter }} de los esquemas.",
    errorPattern: 'Debe coincidir con el patrón: "{{ pattern }}".',
    errorPrefixItems: "El elemento {{ index }} no es válido.",
    errorPropertyNames: 'El nombre de la propiedad "{{ propertyName }}" no es válido.',
    errorProperties: "Las siguientes propiedades no cumplen con sus esquemas: {{ properties }}",
    errorRequired: "Debe tener las propiedades requeridas: {{ required }}.",
    errorType: "Debe ser del tipo {{ type }}.",
    errorUnevaluatedProperties: 'Tiene una propiedad no evaluada no válida "{{ property }}"',
    errorUniqueItems: "Debe tener elementos únicos.",
    arrayDelete: "Eliminar elemento",
    arrayMoveUp: "Mover hacia arriba",
    arrayMoveDown: "Mover hacia abajo",
    arrayDrag: "Arrastrar",
    arrayAdd: "Agregar elemento",
    arrayConfirmDelete: "¿Estás seguro de que deseas eliminar este elemento?",
    arrayDeleteAll: "Eliminar todos los elementos",
    arrayConfirmDeleteAll: "¿Está seguro de que desea eliminar todos los elementos?",
    objectAddProperty: "Agregar propiedad",
    objectPropertyAdded: "campo fue añadido al formulario",
    objectPropertyRemoved: "campo fue eliminado del formulario",
    propertiesToggle: "Propiedades",
    collapseToggle: "Colapsar"
  }
};
class Translator {
  constructor(config) {
    this.language = config.language || "en";
    this.translations = mergeDeep({}, translations, config.translations);
    this.defaultTranslations = defaultTranslations;
  }
  translate(message) {
    let translation = this.translations[this.language][message];
    if (notSet(translation)) {
      translation = this.defaultTranslations[message];
    }
    return translation;
  }
  /**
   * Deletes all properties of the class
   */
  destroy() {
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
}
class JsonWalker {
  constructor(maxDepth = 200) {
    this.maxDepth = maxDepth;
  }
  traverse(data, callback, node = data, path = "#", depth = 0, parent = null, key = null, customData = {}) {
    if (!node || typeof node !== "object" || depth > this.maxDepth) {
      return;
    }
    const newNode = callback(node, path, parent, key, depth, customData);
    if (newNode !== void 0) {
      if (parent && key !== null) {
        parent[key] = newNode;
      } else if (path === "#") {
        Object.keys(data).forEach((k) => delete data[k]);
        Object.assign(data, newNode);
      }
      node = newNode;
    }
    if (typeof node === "object" && node !== null) {
      Object.entries(node).forEach(
        ([k, v]) => this.traverse(data, callback, v, `${path}/${k}`, depth + 1, node, k, customData)
      );
    }
  }
}
class Jedison extends EventEmitter {
  /**
   * Creates a Jedison instance.
   * @param {object} options - Options object
   * @param {object|boolean} options.schema - A JSON schema
   * @param {boolean} options.container - Where the UI controls will be rendered
   */
  constructor(options) {
    super();
    this.options = Object.assign({
      container: null,
      iconLib: null,
      theme: null,
      refParser: null,
      editJsonData: false,
      enablePropertiesToggle: false,
      enableCollapseToggle: false,
      btnContents: true,
      btnIcons: true,
      arrayDelete: true,
      arrayDeleteConfirm: true,
      arrayMove: true,
      arrayAdd: true,
      arrayAddAfter: false,
      arrayFooterAdd: false,
      arrayFooterButtonsPosition: "right",
      arrayDeleteAll: false,
      arrayFooterDeleteAll: false,
      objectAdd: true,
      arrayButtonsPosition: "left",
      startCollapsed: false,
      deactivateNonRequired: false,
      schema: {},
      showErrors: "change",
      switcherInput: "select",
      embedSwitcher: false,
      data: void 0,
      assertFormat: false,
      customEditors: [],
      constraints: [],
      hiddenInputAttributes: {},
      id: "",
      radiosInline: false,
      language: "en",
      translations: {},
      settings: {},
      useConstraintAttributes: true,
      parseMarkdown: false,
      purifyHtml: true,
      purifyData: true,
      domPurifyOptions: {},
      mergeAllOf: false,
      enforceConst: false,
      enforceRequired: true,
      enforceAdditionalProperties: true,
      enforceMinItems: true,
      enforceMaxItems: true,
      enforceEnum: true,
      subErrors: false,
      debug: false,
      audacity: true
    }, options);
    this.rootName = "#";
    this.pathSeparator = "/";
    this.instances = /* @__PURE__ */ new Map();
    this.root = null;
    this.translator = new Translator({
      language: this.options.language,
      translations: this.options.translations
    });
    this.validator = null;
    this.schema = {};
    this.watched = {};
    this.theme = null;
    this.uiResolver = null;
    this.refParser = this.options.refParser ? this.options.refParser : null;
    this.walker = new JsonWalker();
    this.lastFocusedId = null;
    this.isEditor = false;
    this.debug = false;
    this.init();
    this.bindEventListeners();
    this.updateInstancesWatchedData();
  }
  /**
   * Initializes instance properties
   */
  init() {
    if (this.options.container) {
      this.isEditor = true;
    }
    this.uiResolver = new UiResolver({
      customEditors: this.options.customEditors,
      refParser: this.refParser
    });
    this.theme = this.options.theme;
    if (this.theme) {
      this.theme.btnContents = this.options.btnContents;
      this.theme.btnIcons = this.options.btnIcons;
    }
    if (isSet(this.options.iconLib)) {
      switch (this.options.iconLib) {
        case "glyphicons":
          this.theme.icons = glyphicons;
          break;
        case "bootstrap-icons":
          this.theme.icons = bootstrapIcons;
          break;
        case "fontawesome3":
          this.theme.icons = fontAwesome3;
          break;
        case "fontawesome4":
          this.theme.icons = fontAwesome4;
          break;
        case "fontawesome5":
          this.theme.icons = fontAwesome5;
          break;
        case "fontawesome6":
          this.theme.icons = fontAwesome6;
          break;
      }
    }
    this.schema = this.options.schema;
    this.validator = new Validator({
      refParser: this.refParser,
      assertFormat: this.options.assertFormat,
      translator: this.translator,
      constraints: this.options.constraints,
      subErrors: this.options.subErrors
    });
    this.root = this.createInstance({
      jedison: this,
      schema: this.options.schema,
      path: this.rootName
    });
    if (isSet(this.options.data)) {
      this.root.setValue(this.options.data, false);
    }
    if (this.options.container) {
      this.isEditor = true;
      this.container = this.options.container;
      this.appendHiddenInput();
      this.container.appendChild(this.root.ui.control.container);
      this.container.classList.add("jedi-ready");
    }
  }
  bindEventListeners() {
    if (this.root) {
      this.root.on("change", (initiator) => {
        this.emit("change", initiator);
      });
    }
    this.on("instance-change", (instance) => {
      const callbacks = this.watched[instance.path];
      if (callbacks) {
        callbacks.forEach((callback) => {
          callback();
        });
      }
    });
    if (this.hiddenInput) {
      this.on("change", (initiator) => {
        this.hiddenInput.value = JSON.stringify(this.getValue());
        if (initiator === "user") {
          setTimeout(() => {
            this.refreshFocus();
          }, 0);
        }
      });
      this._onFocus = (event) => {
        this.lastKeyEvent = null;
        this.lastFocusedId = event.target.id;
      };
      this._onKeydown = (event) => {
        this.lastKeyEvent = event;
      };
      document.addEventListener("focus", this._onFocus, true);
      document.addEventListener("keydown", this._onKeydown);
    }
  }
  updateInstancesWatchedData() {
    Object.values(this.watched).forEach((callbacks) => {
      callbacks.forEach((callback) => {
        callback();
      });
    });
  }
  /**
   * Reapplies focus to the element that was removed and re-appended to the DOM
   * @type String
   */
  refreshFocus() {
    if (!this.lastFocusedId) {
      return;
    }
    const el = document.getElementById(this.lastFocusedId);
    if (el) {
      el.focus();
      if (this.lastKeyEvent && this.lastKeyEvent.key === "Tab") {
        this.simulateTab(el, this.lastKeyEvent.shiftKey);
      }
    }
  }
  simulateTab(currentElement, shift) {
    const focusableElements = document.querySelectorAll('input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    const index2 = Array.prototype.indexOf.call(focusableElements, currentElement);
    if (index2 !== -1) {
      if (shift) {
        if (index2 > 0) {
          focusableElements[index2 - 1].focus();
        }
      } else {
        if (index2 + 1 < focusableElements.length) {
          focusableElements[index2 + 1].focus();
        }
      }
    }
  }
  /**
   * Appends a hidden input to the root container whose value will be the value
   * of the root instance.
   */
  appendHiddenInput() {
    const hiddenControl = this.theme.getInputControl({
      type: "hidden",
      id: "jedi-hidden-input"
    });
    this.hiddenInput = hiddenControl.input;
    this.hiddenInput.setAttribute("name", "json");
    this.hiddenInput.removeAttribute("aria-describedby");
    this.hiddenInput.removeAttribute("aria-hidden", "true");
    if (this.options.hiddenInputAttributes && isObject(this.options.hiddenInputAttributes)) {
      Object.keys(this.options.hiddenInputAttributes).forEach((attr) => {
        this.hiddenInput.setAttribute(attr, this.options.hiddenInputAttributes[attr]);
      });
    }
    this.container.appendChild(this.hiddenInput);
    this.hiddenInput.value = JSON.stringify(this.getValue());
  }
  /**
   * Adds a child instance pointer to the instances list
   */
  register(instance) {
    this.instances.set(instance.path, instance);
  }
  /**
   * Deletes a child instance pointer from the instances list
   */
  unregister(instance) {
    this.instances.delete(instance.path);
  }
  /**
   * Creates a json instance and dereference schema on the fly if needed.
   */
  createInstance(config) {
    if (this.refParser) {
      config.schema = this.refParser.expand(config.schema);
      this.walker.traverse(config.schema, (node) => {
        if (node.allOf && Array.isArray(node.allOf)) {
          node.allOf.forEach((subschema, index2) => {
            node.allOf[index2] = this.refParser.expand(subschema);
          });
        }
        if (node.oneOf && Array.isArray(node.oneOf)) {
          node.oneOf.forEach((subschema, index2) => {
            node.oneOf[index2] = this.refParser.expand(subschema);
          });
        }
        if (node.oneOf && Array.isArray(node.oneOf)) {
          node.oneOf.forEach((subschema, index2) => {
            node.oneOf[index2] = this.refParser.expand(subschema);
          });
        }
      });
    }
    if (this.isEditor) {
      this.walker.traverse(config.schema, (node) => {
        if (node.allOf && Array.isArray(node.allOf)) {
          if (isSet(node["x-allOf-merged"])) {
            return;
          }
          const mergeAllOf = getSchemaXOption(node, "mergeAllOf") ?? this.options.mergeAllOf;
          const conditionals = [];
          let nodeFinal = clone(node);
          node.allOf.forEach((subschema) => {
            if (subschema.if && subschema.then) {
              conditionals.push({
                if: subschema.if,
                then: subschema.then,
                else: subschema.else || null
              });
            } else {
              nodeFinal = mergeAllOf ? combineDeep({}, nodeFinal, subschema) : nodeFinal;
            }
          });
          nodeFinal["x-allOf-merged"] = true;
          let sequentialIfThenElse = null;
          for (let i = conditionals.length - 1; i >= 0; i--) {
            if (sequentialIfThenElse === null) {
              sequentialIfThenElse = conditionals[i];
            } else {
              const inner = sequentialIfThenElse;
              sequentialIfThenElse = {
                if: conditionals[i].if,
                then: combineDeep({}, conditionals[i].then || {}, inner),
                else: combineDeep({}, conditionals[i].else || {}, inner)
              };
            }
          }
          if (sequentialIfThenElse) {
            Object.assign(nodeFinal, sequentialIfThenElse);
          }
          return nodeFinal;
        }
      });
      this.walker.traverse(config.schema, (node) => {
        if (node.oneOf && Array.isArray(node.oneOf)) {
          const nodeClone = clone(node);
          delete nodeClone.oneOf;
          node.oneOf = node.oneOf.map((subschema) => {
            return combineDeep({}, nodeClone, subschema);
          });
        }
      });
      this.walker.traverse(config.schema, (node) => {
        if (node.anyOf && Array.isArray(node.anyOf)) {
          const nodeClone = clone(node);
          delete nodeClone.anyOf;
          node.anyOf = node.anyOf.map((subschema) => {
            return combineDeep({}, nodeClone, subschema);
          });
        }
      });
      this.walker.traverse(config.schema, (node) => {
        if (node.not && isObject(node.not)) {
          const nodeClone = clone(node);
          delete nodeClone.not;
          node.not = combineDeep({}, nodeClone, node.not);
        }
      });
    }
    const schemaOneOf = getSchemaOneOf(config.schema);
    const schemaAnyOf = getSchemaAnyOf(config.schema);
    const schemaIf = getSchemaIf(config.schema);
    const schemaType = getSchemaType(config.schema);
    if (this.debug && notSet(schemaType) && !isSet(schemaOneOf) && !isSet(schemaAnyOf) && !isSet(schemaIf)) {
      console.warn("TYPE NOT SET", config.schema, config.path);
    }
    if (isSet(schemaAnyOf) || isSet(schemaOneOf) || schemaType === "any" || isArray(schemaType) || notSet(schemaType)) {
      return new InstanceMultiple(config);
    }
    if (isSet(schemaIf)) {
      return new InstanceIfThenElse(config);
    }
    if (schemaType === "object") {
      return new InstanceObject(config);
    }
    if (schemaType === "array") {
      return new InstanceArray(config);
    }
    if (schemaType === "string") {
      return new InstanceString(config);
    }
    if (schemaType === "number" || schemaType === "integer") {
      return new InstanceNumber(config);
    }
    if (schemaType === "boolean") {
      return new InstanceBoolean(config);
    }
    if (schemaType === "null") {
      return new InstanceNull(config);
    }
  }
  /**
   * Returns the value of the root instance
   * @return {*}
   */
  getValue() {
    return this.root.getValue();
  }
  /**
   * Sets the value of the root instance
   */
  setValue() {
    this.root.setValue(...arguments);
    this.updateInstancesWatchedData();
  }
  /**
   * Returns an instance by path
   * @return {*}
   */
  getInstance(path) {
    return this.instances.get(path);
  }
  /**
   * Returns the value of a jedison option
   * @param {string} option
   * @return {*}
   */
  getOption(option) {
    const canonical = resolveAlias(option);
    if (canonical !== option) {
      console.warn(`Jedison: option "${option}" is deprecated. Use "${canonical}" instead.`);
    }
    return this.options[canonical];
  }
  /**
   * Navigates to a specific instance by path, activating any ancestor nav/categories tabs as needed.
   * @param {string} path - The instance path (e.g. '#/address/street')
   */
  navigateTo(path) {
    if (!this.isEditor) return;
    this.root.ui.navigateTo(path);
  }
  /**
   * Disables the root instance and it's children user interfaces
   */
  disable() {
    this.root.ui.disable();
  }
  /**
   * Enables the root instance and it's children user interfaces
   */
  enable() {
    this.root.ui.enable();
  }
  /**
   * Get an array of validation errors
   * @param {string[]} filters - Types to include, e.g., ['errors', 'warnings']
   * @returns {*[]}
   */
  getErrors(filters = ["error"]) {
    let results = [];
    for (const instance of this.instances.values()) {
      results = [...results, ...instance.getErrors()];
    }
    return results.filter((error) => {
      return filters.includes(error.type.toLowerCase());
    });
  }
  export() {
    const results = [];
    for (const instance of this.instances.values()) {
      results.push({
        path: instance.path ?? "-",
        type: instance.schema.type ?? "-",
        title: instance.ui.getTitle() ?? "-",
        value: instance.getValue() ?? "-"
      });
    }
    return results;
  }
  /**
   * Displays validation errors in the respective editors.
   * If an errors list is passed, it will display these errors;
   * otherwise, it will retrieve existing errors from the instance.
   *
   * @param {Array|null} errorsList - An optional array containing error messages.
   * @returns {boolean} Returns `true` if the container exists and errors are displayed,
   * or `false` if there is no container and thus no errors are displayed.
   */
  showValidationErrors(errorsList = null) {
    if (!this.options.container) {
      return false;
    }
    const errors = errorsList ?? this.getErrors();
    for (const instance of this.instances.values()) {
      instance.ui.showValidationErrors(errors, true);
    }
  }
  watch(path, callback) {
    if (!this.watched[path]) {
      this.watched[path] = [];
    }
    this.watched[path].push(callback);
  }
  unwatch(path, callback) {
    if (!this.watched[path]) {
      return;
    }
    this.watched[path] = this.watched[path].filter((cb) => cb !== callback);
    if (this.watched[path].length === 0) {
      delete this.watched[path];
    }
  }
  /**
   * Destroy the root instance and it's children
   */
  destroy() {
    if (this._onFocus) {
      document.removeEventListener("focus", this._onFocus, true);
      document.removeEventListener("keydown", this._onKeydown);
    }
    this.root.destroy();
    if (this.options.container) {
      this.container.innerHTML = "";
    }
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
}
class RefParser {
  constructor(options = {}) {
    this.options = Object.assign({
      detectRecursion: true
    }, options);
    this.refs = {};
    this.data = {};
    this.iterations = 0;
    this.maxIterations = 1e3;
    this.cycles = [];
    this.walker = new JsonWalker();
  }
  async dereference(schema) {
    await this.collectRefs(schema);
    while (this.iterations < this.maxIterations) {
      if (this.refsResolved()) {
        break;
      }
      this.iterations++;
      await this.collectRefs(schema);
    }
    const missingRefs = Object.entries(this.refs).filter(([key, value]) => value === null).map(([key]) => key);
    if (missingRefs.length) {
      console.warn("Missing refs:", JSON.stringify(missingRefs));
    }
    if (this.options.detectRecursion) {
      this.cycles = this.findRecursiveRefs(this.refs);
      this.markRecursiveSchemas();
    }
  }
  refsResolved() {
    return Object.values(this.refs).every((value) => {
      return value !== null;
    });
  }
  /**
   * Traverses the given schema recursively and for each schema with $ref
   * add a new property in the this.refs object with key being the json path to that schema.
   * If the ref has no value in data will be given a value of null. This value will be later
   * replaced in a future iteration. At that time the data will be available
   * @param schema
   * @param path
   */
  async collectRefs(schema, path = "#") {
    if (typeof schema !== "object" || schema === null) {
      return;
    }
    for (const [key, value] of Object.entries(schema)) {
      const nextPath = path ? `${path}/${key}` : `/${key}`;
      if (this.hasRef(schema)) {
        const ref = schema["$ref"];
        if (this.isExternalRef(ref)) {
          const resolvedSchema = await this.load(ref);
          this.refs[ref] = resolvedSchema;
          await this.collectRefs(resolvedSchema, nextPath);
        } else {
          this.refs[ref] = this.data[ref] ?? null;
        }
      }
      this.data[path] = schema;
      await this.collectRefs(value, nextPath);
    }
  }
  hasRef(schema) {
    return typeof schema["$ref"] !== "undefined" && typeof schema["$ref"] === "string";
  }
  isExternalRef(ref) {
    if (typeof ref !== "string") {
      return false;
    }
    return ref.startsWith("http") || ref.startsWith("https");
  }
  isObject(value) {
    return value !== null && typeof value === "object";
  }
  findRecursiveRefs(defs) {
    const cycles = /* @__PURE__ */ new Set();
    function checkRef(path, visited, stack) {
      if (visited.has(path)) {
        const cycleStartIndex = stack.indexOf(path);
        if (cycleStartIndex !== -1) {
          const cyclePath = stack.slice(cycleStartIndex).concat(path);
          const minIndex = cyclePath.reduce((minIdx, ref, idx) => ref < cyclePath[minIdx] ? idx : minIdx, 0);
          const normalizedCycle = [...cyclePath.slice(minIndex), ...cyclePath.slice(0, minIndex)];
          const cycleSignature = normalizedCycle.join(" → ");
          cycles.add(cycleSignature);
        }
        return;
      }
      if (!defs[path]) return;
      visited.add(path);
      stack.push(path);
      function traverse(value) {
        if (typeof value === "object" && value !== null) {
          if (value.$ref) checkRef(value.$ref, visited, stack);
          for (const key in value) traverse(value[key]);
        }
      }
      traverse(defs[path]);
      visited.delete(path);
      stack.pop();
    }
    for (const key in defs) {
      checkRef(key, /* @__PURE__ */ new Set(), []);
    }
    return [...cycles];
  }
  hasRefCycles() {
    return this.options.detectRecursion && this.cycles.length > 0;
  }
  markRecursiveSchemas() {
    const cycleRefs = /* @__PURE__ */ new Set();
    this.cycles.forEach((cycle) => {
      cycle.split(" → ").forEach((ref) => cycleRefs.add(ref));
    });
    for (const schema of Object.values(this.data)) {
      if (schema && schema.$ref && cycleRefs.has(schema.$ref)) {
        schema["x-recursive"] = true;
      }
    }
  }
  expand(schema) {
    const cloneSchema = JSON.parse(JSON.stringify(schema));
    if (this.isObject(cloneSchema) && this.hasRef(cloneSchema)) {
      const ref = cloneSchema.$ref;
      delete cloneSchema["$ref"];
      return this.expand(mergeDeep({}, this.refs[ref], cloneSchema));
    }
    return cloneSchema;
  }
  expandRecursive(schema) {
    let mustContinue = true;
    while (mustContinue) {
      mustContinue = false;
      this.walker.traverse(schema, (node, path, parent, key) => {
        if (node.$ref && typeof node.$ref === "string" && parent && key !== null) {
          parent[key] = this.expand(node);
          mustContinue = true;
        }
      });
    }
  }
  /**
   * Loads a schema with a synchronous http request
   * @param uri
   * @returns {any}
   */
  async load(uri) {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading", uri, error);
      throw error;
    }
  }
}
class Theme {
  constructor(icons = null) {
    this.icons = icons;
    this.useToggleEvents = true;
    this.btnContents = true;
    this.btnIcons = true;
    this.init();
  }
  /**
   * Inits some instance properties
   */
  init() {
    this.useToggleEvents = true;
  }
  /**
   * Used to wrap the editor UI elements
   */
  getEditorContainer() {
    const html = document.createElement("div");
    html.classList.add("jedi-editor-container");
    return html;
  }
  /**
   * Used to group several controls
   */
  getFieldset() {
    const html = document.createElement("fieldset");
    html.classList.add("jedi-editor-fieldset");
    html.setAttribute("role", "group");
    return html;
  }
  /**
   * Represents a caption for the content of its parent fieldset
   */
  getLegend(config) {
    const left = document.createElement("div");
    const right = document.createElement("div");
    const legend = document.createElement("legend");
    const legendText = document.createElement("label");
    const infoContainer = document.createElement("span");
    const dummyInput = document.createElement("input");
    const legendLabelId = "legend-label-" + config.id;
    const dummyInputId = "legend-dummy-input-" + config.id;
    left.classList.add("jedi-editor-legend-left");
    right.classList.add("jedi-editor-legend-right");
    right.style.display = "flex";
    right.style.alignItems = "center";
    legend.classList.add("jedi-editor-legend");
    legend.style.fontSize = "inherit";
    legend.setAttribute("aria-labelledby", legendLabelId);
    legendText.classList.add("jedi-title");
    legendText.classList.add("jedi-legend");
    legendText.setAttribute("id", legendLabelId);
    legendText.innerHTML = config.content;
    infoContainer.classList.add("jedi-editor-info-container");
    infoContainer.setAttribute("for", dummyInputId);
    dummyInput.setAttribute("aria-hidden", "true");
    dummyInput.setAttribute("type", "hidden");
    dummyInput.setAttribute("id", dummyInputId);
    this.visuallyHidden(dummyInput);
    if (config.titleHidden) {
      this.visuallyHidden(legendText);
    }
    legend.appendChild(left);
    legend.appendChild(right);
    left.appendChild(legendText);
    left.appendChild(infoContainer);
    legendText.appendChild(dummyInput);
    return { left, right, legend, legendText, infoContainer };
  }
  /**
   * Used to group several controls
   */
  getRadioFieldset() {
    const fieldset = document.createElement("fieldset");
    fieldset.classList.add("jedi-editor-radio-fieldset");
    fieldset.setAttribute("role", "group");
    fieldset.style.marginBottom = "15px";
    fieldset.style.fontSize = "inherit";
    return fieldset;
  }
  /**
   * Represents a caption for the content of its parent fieldset
   */
  getRadioLegend(config) {
    const legendLabelId = "legend-label-" + config.id;
    const legend = document.createElement("legend");
    const legendText = document.createElement("label");
    const dummyInput = document.createElement("input");
    legend.classList.add("jedi-editor-legend");
    legend.style.fontSize = "inherit";
    legend.setAttribute("aria-labelledby", legendLabelId);
    legendText.classList.add("jedi-title");
    legendText.classList.add("jedi-label");
    legendText.innerHTML = config.content;
    legendText.setAttribute("id", legendLabelId);
    dummyInput.setAttribute("aria-hidden", "true");
    dummyInput.setAttribute("type", "hidden");
    dummyInput.setAttribute("disabled", "");
    this.visuallyHidden(dummyInput);
    legend.appendChild(legendText);
    legendText.appendChild(dummyInput);
    return { legend, legendText };
  }
  /**
   * Represents a caption for the content of its parent fieldset
   */
  getLabel(config) {
    const label = document.createElement("label");
    const labelText = document.createElement("span");
    const icon = document.createElement("i");
    label.setAttribute("for", config.for);
    label.classList.add("jedi-title");
    label.classList.add("jedi-label");
    labelText.innerHTML = config.text;
    if (config.visuallyHidden) {
      this.visuallyHidden(label);
    }
    if (config.titleIconClass) {
      this.addIconClass(icon, config.titleIconClass);
    }
    if (config.titleIconClass) {
      label.appendChild(icon);
    }
    label.appendChild(labelText);
    return { label, labelText, icon };
  }
  getFakeLabel(config) {
    const label = document.createElement("label");
    const labelText = document.createElement("span");
    const icon = document.createElement("i");
    const dummyInput = document.createElement("input");
    label.setAttribute("for", config.for);
    label.classList.add("jedi-title");
    label.classList.add("jedi-label");
    if (config.visuallyHidden) {
      this.visuallyHidden(label);
    }
    labelText.innerHTML = config.content;
    if (config.titleIconClass) {
      this.addIconClass(icon, config.titleIconClass);
    }
    dummyInput.setAttribute("aria-hidden", "true");
    dummyInput.setAttribute("type", "hidden");
    dummyInput.setAttribute("disabled", "");
    dummyInput.setAttribute("id", config.for);
    this.visuallyHidden(dummyInput);
    label.appendChild(icon);
    label.appendChild(labelText);
    label.appendChild(dummyInput);
    return { label, labelText, icon, dummyInput };
  }
  /**
   * Returns a icon element
   */
  addIconClass(element, classes = "") {
    let iconClasses = classes.split(" ");
    iconClasses = iconClasses.filter((className) => className.length > 0);
    if (iconClasses) {
      iconClasses.forEach((className) => {
        element.classList.add(className);
      });
    }
  }
  getOptInWrapper() {
    const optInWrapper = document.createElement("span");
    const optInContainer = document.createElement("span");
    const otherContainer = document.createElement("span");
    optInWrapper.classList.add("jedi-opt-in-wrapper");
    optInWrapper.style.display = "flex";
    optInWrapper.style.alignItems = "center";
    optInContainer.classList.add("jedi-opt-in-container");
    otherContainer.classList.add("jedi-title-container");
    otherContainer.style.flexGrow = "1";
    optInWrapper.appendChild(otherContainer);
    optInWrapper.appendChild(optInContainer);
    return { optInWrapper, optInContainer, otherContainer };
  }
  /**
   * Container for complex editors like arrays and objects
   */
  getCard() {
    const html = document.createElement("div");
    html.classList.add("jedi-editor-card");
    return html;
  }
  /**
   * Header for cards
   */
  getCardHeader() {
    const html = document.createElement("div");
    html.classList.add("jedi-editor-card-header");
    return html;
  }
  /**
   * A body for the cards
   */
  getCardBody() {
    const html = document.createElement("div");
    html.classList.add("jedi-editor-card-body");
    return html;
  }
  /**
   * A footer for array cards
   */
  getArrayFooter() {
    const html = document.createElement("div");
    html.classList.add("jedi-array-footer");
    html.style.display = "flex";
    html.style.alignItems = "center";
    return html;
  }
  /**
   * Wrapper for editor actions buttons
   */
  getActionsSlot() {
    const html = document.createElement("div");
    html.classList.add("jedi-actions-slot");
    return html;
  }
  /**
   * Wrapper for editor array specific actions buttons
   */
  getArrayActionsSlot() {
    const html = document.createElement("span");
    html.classList.add("jedi-array-actions-slot");
    return html;
  }
  /**
   * Wrapper for child editors
   */
  getChildrenSlot() {
    const html = document.createElement("div");
    html.classList.add("jedi-children-slot");
    return html;
  }
  /**
   * Wrapper for error messages
   */
  getMessagesSlot(config = {}) {
    const html = document.createElement("div");
    html.classList.add("jedi-messages-slot");
    html.setAttribute("aria-atomic", "false");
    html.setAttribute("aria-live", "polite");
    if (config.id) {
      html.setAttribute("id", config.id);
    }
    return html;
  }
  /**
   * Wrapper for editor controls
   */
  getControlSlot() {
    const html = document.createElement("div");
    html.classList.add("jedi-control-slot");
    return html;
  }
  /**
   * Toggles the ObjectEditor properties wrapper visibility
   */
  getPropertiesToggle(config) {
    const toggle = this.getButton(config);
    toggle.classList.add("jedi-properties-toggle");
    toggle.addEventListener("click", () => {
      if (config.propertiesContainer.open) {
        config.propertiesContainer.close();
      } else {
        config.propertiesContainer.showModal();
      }
    });
    return toggle;
  }
  getQuickAddPropertyToggle(config) {
    const toggle = this.getButton(config);
    toggle.classList.add("jedi-quick-add-property-toggle");
    toggle.addEventListener("click", () => {
      if (config.propertiesContainer.open) {
        config.propertiesContainer.close();
      } else {
        config.propertiesContainer.showModal();
      }
    });
    return toggle;
  }
  /**
   * Container that will collapse and expand to show and hide it contents
   */
  getCollapse(config) {
    const collapse = document.createElement("div");
    collapse.classList.add("jedi-collapse");
    collapse.setAttribute("id", config.id);
    if (this.useToggleEvents && config.startCollapsed) {
      collapse.style.display = "none";
    }
    return collapse;
  }
  /**
   * Toggle button for collapse
   */
  getCollapseToggle(config) {
    const toggle = this.getButton(config);
    toggle.classList.add("jedi-collapse-toggle");
    toggle.setAttribute("always-enabled", "");
    if (this.useToggleEvents) {
      toggle.addEventListener("click", () => {
        if (config.collapse.style.display === "none") {
          config.collapse.style.display = "block";
        } else {
          config.collapse.style.display = "none";
        }
      });
    }
    let collapsed = config.startCollapsed;
    if (collapsed) {
      toggle.setAttribute("aria-expanded", "false");
    } else {
      toggle.setAttribute("aria-expanded", "true");
    }
    toggle.style.transition = "transform 0.1s ease";
    if (collapsed) {
      toggle.style.transform = "rotate(90deg)";
    }
    toggle.addEventListener("click", () => {
      if (collapsed) {
        toggle.style.transform = "rotate(0deg)";
      } else {
        toggle.style.transform = "rotate(90deg)";
      }
      collapsed = !collapsed;
    });
    return toggle;
  }
  /**
   * Container for properties editing elements like property activators
   */
  getPropertiesSlot(config) {
    const html = document.createElement("dialog");
    html.classList.add("jedi-properties-slot");
    html.setAttribute("id", config.id);
    html.addEventListener("click", (event) => {
      if (event.target === html) {
        html.close();
      }
    });
    return html;
  }
  getQuickAddPropertySlot(config) {
    const html = document.createElement("dialog");
    html.classList.add("jedi-quick-add-property-slot");
    html.setAttribute("id", config.id);
    html.addEventListener("click", (event) => {
      if (event.target === html) {
        html.close();
      }
    });
    return html;
  }
  /**
   * Container for properties editing elements like property activators
   */
  getJsonData(config) {
    const dialog = document.createElement("dialog");
    dialog.classList.add("jedi-json-data");
    dialog.setAttribute("id", config.id);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
    const toggle = this.getButton({
      // content: config.propertiesToggleContent, // todo: use text config or something
      id: "jedi-json-data-toggle-" + config.id,
      icon: "edit"
    });
    toggle.classList.add("jedi-json-data-toggle");
    toggle.addEventListener("click", () => {
      if (dialog.open) {
        dialog.close();
      } else {
        dialog.showModal();
      }
    });
    const control = document.createElement("div");
    const { label } = this.getLabel({
      for: "json-data-input-" + config.id,
      text: "JSON Data"
    });
    const input = document.createElement("textarea");
    input.setAttribute("id", "json-data-input-" + config.id);
    input.cols = 60;
    input.style.whiteSpace = "pre";
    input.style.overflowX = "auto";
    input.style.resize = "both";
    input.style.maxHeight = "60vh";
    const copyBtn = this.getButton({
      id: "jedi-json-data-copy-" + config.id,
      icon: "copy"
    });
    copyBtn.classList.add("jedi-json-data-copy");
    const saveBtn = this.getButton({
      // content: config.propertiesToggleContent, // todo: use text config or something
      id: "jedi-json-data-save-" + config.id,
      icon: "save"
    });
    dialog.appendChild(control);
    control.appendChild(label);
    control.appendChild(input);
    dialog.appendChild(copyBtn);
    dialog.appendChild(saveBtn);
    return {
      dialog,
      toggle,
      control,
      input,
      copyBtn,
      saveBtn
    };
  }
  /**
   * Container for screen reader announced messages
   */
  getPropertiesAriaLive() {
    const html = document.createElement("div");
    html.classList.add("jedi-properties-aria-live");
    html.setAttribute("role", "status");
    html.setAttribute("aria-live", "polite");
    return html;
  }
  /**
   * A message that will be announced by screen reader
   */
  getAriaLiveMessage(message) {
    const html = document.createElement("p");
    html.classList.add("jedi-aria-live-message");
    html.textContent = message;
    this.visuallyHidden(html);
    return html;
  }
  /**
   * Wrapper for property activators
   */
  getPropertiesActivators() {
    const html = document.createElement("div");
    html.classList.add("jedi-properties-activators");
    return html;
  }
  /**
   * Group for property activators
   */
  getPropertiesGroup(config = {}) {
    const container = document.createElement("div");
    container.classList.add("jedi-properties-group-container");
    const group = document.createElement("div");
    group.classList.add("jedi-properties-group");
    const name = document.createElement("p");
    name.classList.add("jedi-properties-group-name");
    name.textContent = config.name ?? "";
    container.appendChild(name);
    container.appendChild(group);
    return { container, group, name };
  }
  /**
   * Wrapper buttons
   */
  getBtnGroup() {
    const html = document.createElement("span");
    html.classList.add("jedi-btn-group");
    return html;
  }
  /**
   * A button
   */
  getButton(config = {}) {
    const button = document.createElement("button");
    const text = document.createElement("span");
    const icon = document.createElement("i");
    button.classList.add("jedi-btn");
    button.setAttribute("type", "button");
    if (config.value) {
      button.value = config.value;
    }
    if (config.id) {
      button.setAttribute("id", config.id);
    }
    text.textContent = " " + config.content;
    if (this.btnIcons && this.icons && config.icon) {
      this.addIconClass(icon, this.icons[config.icon]);
      icon.setAttribute("title", config.content);
    }
    if (!this.btnContents) {
      this.visuallyHidden(text);
    }
    if (this.icons && config.icon) {
      button.appendChild(icon);
    }
    button.appendChild(text);
    return button;
  }
  getAddPropertyButton(config) {
    const html = this.getButton(config);
    html.classList.add("jedi-add-property-btn");
    return html;
  }
  /**
   * Array "add" item button
   */
  getArrayBtnAdd(config) {
    const html = this.getButton({
      content: config.content,
      icon: "add"
    });
    html.classList.add("jedi-array-add");
    return html;
  }
  /**
   * Array "delete all" button
   */
  getArrayBtnDeleteAll(config) {
    const html = this.getButton({
      content: config.content,
      icon: "delete"
    });
    html.classList.add("jedi-array-delete-all");
    return html;
  }
  /**
   * Array "add after" item button
   */
  getAddAfterItemBtn(config) {
    const addAfterItemBtn = this.getButton({
      content: config.content,
      icon: "add"
    });
    addAfterItemBtn.classList.add("jedi-array-add-after");
    return addAfterItemBtn;
  }
  /**
   * Array "delete" item button
   */
  getDeleteItemBtn(config) {
    const deleteItemBtn = this.getButton({
      content: config.content,
      icon: "delete"
    });
    deleteItemBtn.classList.add("jedi-array-delete");
    return deleteItemBtn;
  }
  /**
   * Array "move up" item button
   */
  getMoveUpItemBtn(config) {
    const moveUpItemBtn = this.getButton({
      content: config.content,
      icon: "moveUp"
    });
    moveUpItemBtn.classList.add("jedi-array-move-up");
    return moveUpItemBtn;
  }
  /**
   * Array "move down" item button
   */
  getMoveDownItemBtn(config) {
    const moveDownItemBtn = this.getButton({
      content: config.content,
      icon: "moveDown"
    });
    moveDownItemBtn.classList.add("jedi-array-move-down");
    return moveDownItemBtn;
  }
  getDragItemBtn(config) {
    const dragItemBtn = this.getButton({
      content: config.content,
      icon: "drag"
    });
    dragItemBtn.classList.add("jedi-array-drag");
    return dragItemBtn;
  }
  /**
   * Wrapper for the editor description
   */
  getDescription(config = {}) {
    const description = document.createElement("small");
    description.style.display = "block";
    description.classList.add("jedi-description");
    if (config.content) {
      description.innerHTML = config.content;
    }
    if (config.id) {
      description.setAttribute("id", config.id);
    }
    return description;
  }
  /**
   * Info button to display extra information
   */
  getInfo(config = {}) {
    const container = document.createElement("span");
    const info = document.createElement("a");
    const infoText = document.createElement("span");
    const icon = document.createElement("i");
    container.classList.add("jedi-info-button-container");
    container.style.display = "inline-block";
    info.setAttribute("href", "#");
    info.classList.add("jedi-info-button");
    info.style.marginLeft = "4px";
    if (isObject(config.attributes)) {
      for (const [key, value] of Object.entries(config.attributes)) {
        info.setAttribute(key, value);
      }
    }
    infoText.textContent = "Info";
    if (!this.btnContents && this.btnIcons) {
      this.visuallyHidden(infoText);
    }
    icon.setAttribute("title", "More information");
    if (this.icons) {
      this.addIconClass(icon, this.icons["info"]);
    }
    info.appendChild(icon);
    info.appendChild(infoText);
    container.appendChild(info);
    return { container, info };
  }
  /**
   * Dialog or modal that contains extra information about the control
   */
  infoAsModal(info, id, config = {}) {
    const dialog = document.createElement("dialog");
    const title = document.createElement("div");
    const content = document.createElement("div");
    const closeBtn = this.getButton({
      content: "Close",
      icon: "close"
    });
    dialog.classList.add("jedi-modal-dialog");
    dialog.setAttribute("id", id + "-modal");
    title.classList.add("jedi-modal-title");
    if (isString(config.title)) {
      title.innerHTML = config.title;
    }
    content.classList.add("jedi-modal-content");
    if (isString(config.content)) {
      content.innerHTML = config.content;
    }
    closeBtn.classList.add("jedi-modal-close");
    closeBtn.setAttribute("always-enabled", "");
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
    closeBtn.addEventListener("click", () => {
      dialog.close();
    });
    info.info.addEventListener("click", () => {
      dialog.showModal();
    });
    info.container.appendChild(dialog);
    dialog.appendChild(title);
    dialog.appendChild(content);
    dialog.appendChild(closeBtn);
  }
  getPlaceholderControl(config) {
    var _a;
    const descriptionId = config.id + "-description";
    const messagesId = config.id + "-messages";
    const container = document.createElement("div");
    const placeholder = document.createElement("div");
    const actions = this.getActionsSlot();
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getLabel({
      for: config.id,
      text: config.title,
      visuallyHidden: config.titleHidden,
      titleIconClass: config.titleIconClass
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(placeholder);
    container.appendChild(description);
    container.appendChild(messages);
    container.appendChild(actions);
    return { container, placeholder, label, labelText, description, messages, actions };
  }
  /**
   * Object control is a card containing multiple editors.
   * Each editor is mapped to an object instance property.
   * Properties can be added, activated and deactivated depending on configuration
   */
  getObjectControl(config) {
    var _a;
    const collapseId = "collapse-" + config.id;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const body = this.getCardBody();
    const ariaLive = this.getPropertiesAriaLive();
    const messages = this.getMessagesSlot();
    const childrenSlot = this.getChildrenSlot();
    const propertiesActivators = this.getPropertiesActivators();
    const info = this.getInfo(config.info);
    const description = this.getDescription({
      content: config.description
    });
    const jsonData = this.getJsonData({
      id: "json-data-" + config.id
    });
    const propertiesContainer = this.getPropertiesSlot({
      id: "properties-slot-" + config.id
    });
    const propertiesToggle = this.getPropertiesToggle({
      content: config.propertiesToggleContent,
      id: "properties-slot-toggle-" + config.id,
      icon: "properties",
      propertiesContainer
    });
    const collapse = this.getCollapse({
      id: collapseId,
      startCollapsed: config.startCollapsed
    });
    const collapseToggle = this.getCollapseToggle({
      content: config.collapseToggleContent,
      id: "collapse-toggle-" + config.id,
      icon: "collapse",
      collapseId,
      collapse,
      startCollapsed: config.startCollapsed
    });
    const quickAddPropertyContainer = this.getQuickAddPropertySlot({
      id: "quick-add-property-slot-" + config.id
    });
    const quickAddPropertyControl = this.getInputControl({
      type: "text",
      id: "jedi-quick-add-property-input-" + config.id,
      title: config.addPropertyContent
    });
    const quickAddPropertyBtn = this.getAddPropertyButton({
      content: config.addPropertyContent,
      icon: "add"
    });
    const quickAddPropertyToggle = this.getQuickAddPropertyToggle({
      content: config.addPropertyContent,
      icon: "add",
      propertiesContainer: quickAddPropertyContainer
    });
    const fieldset = this.getFieldset();
    const { legend, infoContainer, legendText, right } = this.getLegend({
      content: config.title,
      id: config.id,
      titleHidden: config.titleHidden
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(fieldset);
    container.appendChild(propertiesContainer);
    container.appendChild(quickAddPropertyContainer);
    if (config.addProperty) {
      quickAddPropertyContainer.appendChild(quickAddPropertyControl.container);
      quickAddPropertyContainer.appendChild(quickAddPropertyBtn);
    }
    if (config.editJsonData) {
      container.appendChild(jsonData.dialog);
    }
    fieldset.appendChild(legend);
    if (isObject(config.info)) {
      infoContainer.appendChild(info.container);
    }
    fieldset.appendChild(collapse);
    collapse.appendChild(body);
    if (config.description) {
      body.appendChild(description);
    }
    body.appendChild(messages);
    const switcherSlot = document.createElement("div");
    switcherSlot.classList.add("jedi-switcher-slot");
    if (config.readOnly === false) {
      right.appendChild(switcherSlot);
      right.appendChild(actions);
    }
    body.appendChild(childrenSlot);
    if (config.editJsonData) {
      actions.appendChild(jsonData.toggle);
    }
    if (config.addProperty) {
      actions.appendChild(quickAddPropertyToggle);
    }
    if (config.enablePropertiesToggle) {
      actions.appendChild(propertiesToggle);
      propertiesContainer.appendChild(ariaLive);
      propertiesContainer.appendChild(propertiesActivators);
    }
    if (config.enableCollapseToggle) {
      actions.appendChild(collapseToggle);
    }
    return {
      container,
      collapse,
      collapseToggle,
      description,
      body,
      actions,
      messages,
      childrenSlot,
      propertiesToggle,
      jsonData,
      propertiesContainer,
      quickAddPropertyContainer,
      quickAddPropertyControl,
      quickAddPropertyBtn,
      quickAddPropertyToggle,
      ariaLive,
      propertiesActivators,
      legend,
      legendText,
      infoContainer,
      right,
      switcherSlot
    };
  }
  /**
   * Array control is a card containing multiple editors.
   * Items can bve added, deleted or moved up or down.
   */
  getArrayControl(config) {
    var _a;
    const collapseId = "collapse-" + config.id;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const body = this.getCardBody();
    const messages = this.getMessagesSlot();
    const childrenSlot = this.getChildrenSlot();
    const btnGroup = this.getBtnGroup();
    const addBtn = this.getArrayBtnAdd({
      content: config.arrayAddContent
    });
    const footerAddBtn = this.getArrayBtnAdd({
      content: config.arrayFooterAddContent
    });
    const deleteAllBtn = config.arrayDeleteAll === true ? this.getArrayBtnDeleteAll({ content: config.arrayDeleteAllContent }) : null;
    const footerDeleteAllBtn = config.arrayFooterDeleteAll === true ? this.getArrayBtnDeleteAll({ content: config.arrayFooterDeleteAllContent }) : null;
    const footerBtnGroup = this.getBtnGroup();
    const footer = this.getArrayFooter();
    const fieldset = this.getFieldset();
    const info = this.getInfo(config.info);
    const { legend, legendText, infoContainer, right } = this.getLegend({
      content: config.title,
      id: config.id,
      titleHidden: config.titleHidden
    });
    const description = this.getDescription({
      content: config.description
    });
    const jsonData = this.getJsonData({
      id: "json-data-" + config.id
    });
    const collapse = this.getCollapse({
      id: collapseId,
      startCollapsed: config.startCollapsed
    });
    const collapseToggle = this.getCollapseToggle({
      content: config.collapseToggleContent,
      id: "collapse-toggle-" + config.id,
      icon: "collapse",
      collapseId,
      collapse,
      startCollapsed: config.startCollapsed
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(fieldset);
    if (config.editJsonData) {
      container.appendChild(jsonData.dialog);
    }
    fieldset.appendChild(legend);
    if (isObject(config.info)) {
      infoContainer.appendChild(info.container);
    }
    fieldset.appendChild(collapse);
    collapse.appendChild(body);
    if (config.description) {
      body.appendChild(description);
    }
    body.appendChild(messages);
    const switcherSlot = document.createElement("div");
    switcherSlot.classList.add("jedi-switcher-slot");
    if (config.readOnly === false) {
      right.appendChild(switcherSlot);
      right.appendChild(actions);
    }
    actions.appendChild(btnGroup);
    if (config.editJsonData) {
      btnGroup.appendChild(jsonData.toggle);
    }
    if (deleteAllBtn) {
      btnGroup.appendChild(deleteAllBtn);
    }
    if (isSet(config.arrayAdd) && config.arrayAdd === true) {
      btnGroup.appendChild(addBtn);
    }
    body.appendChild(childrenSlot);
    if (config.enableCollapseToggle) {
      actions.appendChild(collapseToggle);
    }
    const showFooter = (config.arrayFooterAdd === true || config.arrayFooterDeleteAll === true) && config.readOnly === false;
    if (showFooter) {
      if (footerDeleteAllBtn) {
        footerBtnGroup.appendChild(footerDeleteAllBtn);
      }
      if (config.arrayFooterAdd === true) {
        footerBtnGroup.appendChild(footerAddBtn);
      }
      if (config.arrayFooterButtonsPosition === "right") {
        footerBtnGroup.style.marginLeft = "auto";
      }
      footer.appendChild(footerBtnGroup);
      collapse.appendChild(footer);
    }
    return {
      container,
      collapseToggle,
      collapse,
      body,
      actions,
      messages,
      childrenSlot,
      btnGroup,
      addBtn,
      jsonData,
      legend,
      legendText,
      switcherSlot,
      footerAddBtn,
      deleteAllBtn,
      footerDeleteAllBtn
    };
  }
  getArrayItem(config = {}) {
    const container = document.createElement("div");
    const body = document.createElement("div");
    const actions = this.getActionsSlot();
    const arrayActions = this.getArrayActionsSlot();
    actions.style.textAlign = "right";
    container.classList.add("jedi-array-item");
    body.classList.add("jedi-array-item-body");
    if (isSet(config.index)) {
      container.setAttribute("jedi-array-item-index", config.index);
    }
    actions.appendChild(arrayActions);
    container.appendChild(actions);
    container.appendChild(body);
    return {
      container,
      actions,
      arrayActions,
      body
    };
  }
  /**
   * Multiple control is a card containing multiple editors options that can be
   * selected with a switcher control. Only one editor can be active/visible
   * at a time
   */
  getMultipleControl(config = {}) {
    const container = document.createElement("div");
    const header = document.createElement("div");
    const body = document.createElement("div");
    const messages = this.getMessagesSlot();
    const childrenSlot = this.getChildrenSlot();
    const randomId = generateRandomID(5);
    const knownSwitchers = ["select", "radios", "radios-inline"];
    const switcherType = knownSwitchers.includes(config.switcher) ? config.switcher : "select";
    let switcher;
    if (switcherType === "select") {
      switcher = this.getSwitcherSelect({
        values: config.switcherOptionValues,
        titles: config.switcherOptionsLabels,
        title: config.id + "-switcher",
        id: config.id + "-switcher-" + randomId,
        label: config.id + "-switcher-" + randomId,
        titleHidden: true,
        readOnly: config.readOnly,
        noSpacing: true
      });
    }
    if (switcherType === "radios" || switcherType === "radios-inline") {
      switcher = this.getSwitcherRadios({
        values: config.switcherOptionValues,
        titles: config.switcherOptionsLabels,
        title: config.id + "-switcher",
        id: config.id + "-switcher-" + randomId,
        label: config.id + "-switcher-" + randomId,
        titleHidden: true,
        readOnly: config.readOnly,
        inline: switcherType === "radios-inline",
        noSpacing: true
      });
    }
    switcher.container.classList.add("jedi-switcher");
    container.appendChild(header);
    container.appendChild(body);
    header.appendChild(switcher.container);
    body.appendChild(messages);
    body.appendChild(childrenSlot);
    return {
      container,
      header,
      body,
      messages,
      childrenSlot,
      switcher
    };
  }
  adaptForTableMultipleControl(control, td) {
  }
  getIfThenElseControl(config) {
    const container = document.createElement("div");
    const card = this.getCard();
    const actions = this.getActionsSlot();
    const body = this.getCardBody();
    const messages = this.getMessagesSlot();
    const childrenSlot = this.getChildrenSlot();
    const header = this.getCardHeader({
      content: config.title,
      titleHidden: config.titleHidden
    });
    const description = this.getDescription({
      content: config.description
    });
    body.appendChild(description);
    container.appendChild(messages);
    container.appendChild(childrenSlot);
    return {
      container,
      card,
      header,
      body,
      actions,
      messages,
      childrenSlot
    };
  }
  /**
   * Control for NullEditor
   */
  getNullControl(config) {
    var _a;
    const descriptionId = config.id + "-description";
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const messages = this.getMessagesSlot();
    const br = document.createElement("br");
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getFakeLabel({
      for: config.id,
      content: config.title,
      visuallyHidden: config.titleHidden,
      titleIconClass: config.titleIconClass
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(br);
    container.appendChild(description);
    container.appendChild(messages);
    container.appendChild(actions);
    return { container, label, labelText, description, messages, actions };
  }
  /**
   * A Textarea
   */
  getTextareaControl(config) {
    var _a;
    const descriptionId = config.id + "-description";
    const messagesId = config.id + "-messages";
    const describedBy = messagesId + " " + descriptionId;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const input = document.createElement("textarea");
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getLabel({
      for: config.id,
      text: config.title,
      visuallyHidden: config.titleHidden
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    input.setAttribute("aria-describedby", describedBy);
    input.setAttribute("id", config.id);
    input.setAttribute("name", config.id);
    input.style.width = "100%";
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(input);
    container.appendChild(description);
    container.appendChild(messages);
    container.appendChild(actions);
    return { container, input, label, labelText, description, messages, actions };
  }
  adaptForTableTextareaControl(control) {
    this.visuallyHidden(control.label);
    this.visuallyHidden(control.description);
    control.input.setAttribute("rows", "1");
  }
  /**
   * An Input control
   */
  getInputControl(config) {
    var _a;
    const messagesId = config.id + "-messages";
    const descriptionId = config.id + "-description";
    const describedBy = messagesId + " " + descriptionId;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const input = document.createElement("input");
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getLabel({
      for: config.id,
      text: config.title,
      visuallyHidden: config.titleHidden,
      titleIconClass: config.titleIconClass
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    input.setAttribute("aria-describedby", describedBy);
    input.setAttribute("type", config.type);
    input.setAttribute("id", config.id);
    input.setAttribute("name", config.id);
    input.style.width = "100%";
    container.appendChild(label);
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(input);
    container.appendChild(description);
    container.appendChild(messages);
    container.appendChild(actions);
    return { container, input, label, info, labelText, description, messages, actions };
  }
  getInputRangeControl(config) {
    const control = this.getInputControl(config);
    const output = document.createElement("output");
    output.className = "range-output";
    output.style.marginLeft = "10px";
    output.style.fontWeight = "bold";
    control.input.parentNode.insertBefore(output, control.input.nextSibling);
    return { ...control, output };
  }
  adaptForTableInputControl(control) {
    this.visuallyHidden(control.label);
    this.visuallyHidden(control.description);
  }
  /**
   * A radio group control
   */
  getRadiosControl(config) {
    var _a;
    const messagesId = config.id + "-messages";
    const descriptionId = config.id + "-description";
    const container = document.createElement("div");
    const fieldset = this.getRadioFieldset();
    const info = this.getInfo(config.info);
    const { legend, legendText } = this.getRadioLegend({
      content: config.title,
      id: config.id,
      for: config.id
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    if (config.titleHidden) {
      this.visuallyHidden(legend);
    }
    const radioControls = [];
    const radios = [];
    const labels = [];
    const labelTexts = [];
    config.values.forEach((value, index2) => {
      const describedBy = messagesId + " " + descriptionId;
      const radioControl = document.createElement("div");
      const radio = document.createElement("input");
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      radio.setAttribute("type", "radio");
      radio.setAttribute("id", config.id + "-" + index2);
      radio.setAttribute("name", config.id);
      radio.setAttribute("value", value);
      radio.setAttribute("aria-describedby", describedBy);
      label.setAttribute("for", config.id + "-" + index2);
      label.classList.add("jedi-title");
      label.classList.add("jedi-label");
      labelTexts.push(labelText);
      if (isSet(config.titles) && isSet(config.titles[index2])) {
        labelText.textContent = config.titles[index2] ?? value;
      }
      radioControls.push(radioControl);
      radios.push(radio);
      labels.push(label);
    });
    container.appendChild(fieldset);
    fieldset.appendChild(legend);
    if (isObject(config.info)) {
      legendText.appendChild(info.container);
    }
    radioControls.forEach((radioControl, index2) => {
      fieldset.appendChild(radioControls[index2]);
      radioControl.appendChild(radios[index2]);
      radioControl.appendChild(labels[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    fieldset.appendChild(description);
    fieldset.appendChild(messages);
    return {
      container,
      fieldset,
      legend,
      legendText,
      info,
      radios,
      labels,
      labelTexts,
      radioControls,
      description,
      messages
    };
  }
  adaptForTableRadiosControl(control) {
    this.visuallyHidden(control.legend);
    this.visuallyHidden(control.description);
  }
  /**
   * A checkbox control
   */
  getCheckboxControl(config) {
    var _a;
    const descriptionId = config.id + "-description";
    const messagesId = config.id + "-messages";
    const describedBy = messagesId + " " + descriptionId;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const formGroup = document.createElement("span");
    const input = document.createElement("input");
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getLabel({
      for: config.id,
      text: config.title,
      visuallyHidden: config.titleHidden
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    input.setAttribute("type", "checkbox");
    input.setAttribute("id", config.id);
    input.setAttribute("name", config.id);
    input.setAttribute("aria-describedby", describedBy);
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(formGroup);
    container.appendChild(actions);
    formGroup.appendChild(input);
    formGroup.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    formGroup.appendChild(description);
    formGroup.appendChild(messages);
    return { container, formGroup, input, label, info, labelText, description, messages, actions };
  }
  adaptForTableCheckboxControl(control, td) {
    this.visuallyHidden(control.label);
    this.visuallyHidden(control.description);
  }
  getCheckboxesControl(config) {
    var _a;
    const messagesId = config.id + "-messages";
    const descriptionId = config.id + "-description";
    const container = document.createElement("div");
    const fieldset = this.getRadioFieldset();
    const info = this.getInfo(config.info);
    const { legend, legendText } = this.getRadioLegend({
      content: config.title,
      id: config.id,
      for: config.id
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    if (config.titleHidden) {
      this.visuallyHidden(legend);
    }
    const checkboxControls = [];
    const checkboxes = [];
    const labels = [];
    const labelTexts = [];
    config.values.forEach((value, index2) => {
      const describedBy = messagesId + " " + descriptionId;
      const checkboxId = config.id + "-" + index2;
      const checkboxControl = document.createElement("div");
      const checkbox = document.createElement("input");
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("id", checkboxId);
      checkbox.setAttribute("name", config.id);
      checkbox.setAttribute("value", value);
      checkbox.setAttribute("aria-describedby", describedBy);
      label.setAttribute("for", checkboxId);
      if (config.titles && config.titles[index2]) {
        labelText.textContent = config.titles[index2];
      }
      checkboxControls.push(checkboxControl);
      checkboxes.push(checkbox);
      labelTexts.push(labelText);
      labels.push(label);
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(fieldset);
    fieldset.appendChild(legend);
    if (isObject(config.info)) {
      legendText.appendChild(info.container);
    }
    checkboxControls.forEach((checkboxControl, index2) => {
      fieldset.appendChild(checkboxControls[index2]);
      checkboxControl.appendChild(checkboxes[index2]);
      checkboxControl.appendChild(labels[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    fieldset.appendChild(description);
    fieldset.appendChild(messages);
    return {
      container,
      fieldset,
      legend,
      legendText,
      checkboxes,
      labels,
      labelTexts,
      checkboxControls,
      description,
      messages
    };
  }
  adaptForTableCheckboxesControl(control, td) {
    this.visuallyHidden(control.legend);
    this.visuallyHidden(control.description);
  }
  /**
   * A select control
   */
  getSelectControl(config) {
    var _a;
    const descriptionId = config.id + "-description";
    const messagesId = config.id + "-messages";
    const describedBy = messagesId + " " + descriptionId;
    const container = document.createElement("div");
    const actions = this.getActionsSlot();
    const input = document.createElement("select");
    const info = this.getInfo(config.info);
    const { label, labelText } = this.getLabel({
      for: config.id,
      text: config.title,
      visuallyHidden: config.titleHidden
    });
    const messages = this.getMessagesSlot({
      id: messagesId
    });
    const description = this.getDescription({
      content: config.description,
      id: descriptionId
    });
    input.setAttribute("id", config.id);
    input.setAttribute("name", config.id);
    input.setAttribute("aria-describedby", describedBy);
    config.values.forEach((value, index2) => {
      const option = document.createElement("option");
      option.setAttribute("value", value);
      if (config.titles && config.titles[index2]) {
        option.textContent = config.titles[index2];
      }
      input.appendChild(option);
    });
    if (((_a = config == null ? void 0 : config.info) == null ? void 0 : _a.variant) === "modal") {
      this.infoAsModal(info, config.id, config.info);
    }
    container.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(input);
    container.appendChild(description);
    container.appendChild(messages);
    container.appendChild(actions);
    return { container, input, label, info, labelText, description, messages, actions };
  }
  adaptForTableSelectControl(control) {
    this.visuallyHidden(control.label);
    this.visuallyHidden(control.description);
  }
  /**
   * Control to switch between multiple editors options
   */
  getSwitcherSelect(config) {
    return this.getSelectControl(config);
  }
  /**
   * Control to switch between multiple editors options
   */
  getSwitcherRadios(config) {
    return this.getRadiosControl(config);
  }
  /**
   * Another type of error message container used for more complex editors like
   * object, array and multiple editors
   */
  getAlert(config) {
    return this.getErrorFeedback(config);
  }
  /**
   * Error messages
   * @public
   */
  getErrorFeedback(config) {
    const html = document.createElement("div");
    const invalidFeedbackText = document.createElement("small");
    const invalidFeedbackIcon = document.createElement("span");
    invalidFeedbackText.textContent = config.message;
    invalidFeedbackIcon.textContent = "⚠ ";
    invalidFeedbackIcon.setAttribute("aria-hidden", "true");
    html.classList.add("jedi-error-message");
    html.appendChild(invalidFeedbackIcon);
    html.appendChild(invalidFeedbackText);
    return html;
  }
  /**
   * Error messages
   * @public
   */
  getWarningFeedback(config) {
    const html = document.createElement("div");
    const invalidFeedbackText = document.createElement("small");
    const invalidFeedbackIcon = document.createElement("span");
    invalidFeedbackText.textContent = config.message;
    invalidFeedbackIcon.textContent = "⚠ ";
    invalidFeedbackIcon.classList.add("jedi-warning-message");
    invalidFeedbackIcon.setAttribute("aria-hidden", "true");
    html.classList.add("jedi-warning-message");
    html.appendChild(invalidFeedbackIcon);
    html.appendChild(invalidFeedbackText);
    return html;
  }
  /**
   * Container for columns
   */
  getRow() {
    const row = document.createElement("div");
    row.classList.add("jedi-row");
    return row;
  }
  /**
   * A column to contain content to a specific width
   */
  getCol(xs, sm, md, lg, offsetMd) {
    const col = document.createElement("div");
    col.classList.add("jedi-col");
    col.classList.add("jedi-col-xs-" + xs);
    col.classList.add("jedi-col-sm-" + sm);
    col.classList.add("jedi-col-md-" + md);
    col.classList.add("jedi-col-lg-" + lg);
    if (offsetMd) {
      col.classList.add("jedi-col-md-offset-" + offsetMd);
    }
    return col;
  }
  /**
   * Clearfix fixes layout issues in some libraries like bootstrap 3
   */
  getClearfix() {
    const clearfix = document.createElement("div");
    clearfix.classList.add("clearfix");
    return clearfix;
  }
  /**
   * Tab list is a list of links that triggers tabs visibility ne at the time
   */
  getTabList() {
    const tabList = document.createElement("ul");
    tabList.classList.add("jedi-nav-list");
    return tabList;
  }
  styleLegendWarning(span) {
  }
  /**
   * A Tab is a wrapper for content
   */
  getTab(config) {
    const list = document.createElement("li");
    const link = document.createElement("a");
    const arrayActions = document.createElement("span");
    const text = document.createElement("span");
    link.classList.add("jedi-nav-link");
    link.setAttribute("href", "#tab-pane-" + config.id);
    text.classList.add("jedi-nav-text");
    text.textContent = config.title;
    if (config.hasErrors) {
      const warning = document.createElement("span");
      warning.classList.add("jedi-nav-warning");
      warning.textContent = "⚠ ";
      text.insertBefore(warning, text.firstChild);
      if (config.navWarningMessage) {
        list.setAttribute("title", config.navWarningMessage);
      }
    }
    link.appendChild(arrayActions);
    link.appendChild(text);
    list.appendChild(link);
    return { list, link, arrayActions, text };
  }
  /**
   * Wrapper for tabs
   */
  getTabContent() {
    const tabContent = document.createElement("div");
    tabContent.classList.add("tab-content");
    return tabContent;
  }
  /**
   * A simple table layout
   */
  getTable() {
    const container = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    return { container, table, thead, tbody };
  }
  /**
   * Returns a <td> element
   */
  getTableDefinition(config = {}) {
    const td = document.createElement("td");
    if (config.isButtonColumn) {
      td.style.width = "1%";
    }
    td.style.whiteSpace = "nowrap";
    return td;
  }
  /**
   * Returns a <th> element
   */
  getTableHeader(config = {}) {
    const th = document.createElement("th");
    th.style.paddingLeft = "12px";
    th.style.paddingRight = "12px";
    th.style.textWrap = "nowrap";
    th.style.verticalAlign = "bottom";
    if (config.minWidth) {
      th.style.minWidth = config.minWidth;
    }
    return th;
  }
  /**
   * Set tab attributes to make it toggleable
   */
  setTabPaneAttributes(element, active, id) {
    element.setAttribute("id", "tab-pane-" + id);
    element.classList.add("jedi-tab-pane");
  }
  /**
   * Makes an element visually hidden
   */
  visuallyHidden(element) {
    element.style.position = "absolute";
    element.style.width = "1px";
    element.style.height = "1px";
    element.style.padding = "0";
    element.style.margin = "-1px";
    element.style.overflow = "hidden";
    element.style.clip = "rect(0,0,0,0)";
    element.style.border = "0";
  }
  /**
   * Reveals a visually hidden element
   */
  visuallyVisible(element) {
    element.removeAttribute("style");
  }
  /**
   * Makes an element physically hidden
   */
  physicallyHidden(element) {
    element.style.display = "none";
  }
}
class ThemeBootstrap3 extends Theme {
  init() {
    this.useToggleEvents = false;
  }
  getAddPropertyButton(config) {
    const btn = super.getAddPropertyButton(config);
    btn.classList.add("btn-primary");
    btn.classList.add("btn-block");
    return btn;
  }
  getCollapseToggle(config) {
    const toggle = super.getCollapseToggle(config);
    toggle.setAttribute("href", "#" + config.collapseId);
    toggle.setAttribute("data-toggle", "collapse");
    toggle.setAttribute("always-enabled", "");
    return toggle;
  }
  getCollapse(config) {
    const collapse = super.getCollapse(config);
    collapse.classList.add("collapse");
    if (!config.startCollapsed) {
      collapse.classList.add("in");
    }
    return collapse;
  }
  getJsonData(config) {
    const jsonData = super.getJsonData(config);
    jsonData.control.classList.add("form-group");
    jsonData.input.classList.add("form-control");
    jsonData.copyBtn.classList.add("btn-default");
    jsonData.copyBtn.classList.add("btn-block");
    jsonData.saveBtn.classList.add("btn-primary");
    jsonData.saveBtn.classList.add("btn-block");
    return jsonData;
  }
  getFieldset() {
    const fieldset = super.getFieldset();
    fieldset.classList.add("panel");
    fieldset.classList.add("panel-default");
    fieldset.style.marginBottom = "15px";
    return fieldset;
  }
  getLegend(config) {
    const superLegend = super.getLegend(config);
    const { legend } = superLegend;
    legend.classList.add("panel-heading");
    legend.classList.add("pull-left");
    legend.style.margin = "0";
    legend.style.display = "flex";
    legend.style.justifyContent = "space-between";
    legend.style.alignItems = "center";
    return superLegend;
  }
  getRadioLegend(config) {
    const superRadioLegend = super.getRadioLegend(config);
    const { legend } = superRadioLegend;
    legend.style.fontWeight = "inherit";
    legend.style.border = "none";
    legend.style.marginBottom = "0";
    return superRadioLegend;
  }
  getLabel(config) {
    const labelObj = super.getLabel(config);
    if (labelObj.icon.classList) {
      labelObj.icon.style.marginRight = "5px";
    }
    return labelObj;
  }
  getCard() {
    const card = super.getCard();
    card.classList.add("panel");
    card.classList.add("panel-default");
    return card;
  }
  getCardHeader(config) {
    const header = super.getCardHeader(config);
    header.classList.add("panel-heading");
    header.classList.add("text-right");
    return header;
  }
  getCardBody() {
    const html = super.getCardBody();
    html.classList.add("panel-body");
    html.style.clear = "both";
    html.style.paddingBottom = "0";
    return html;
  }
  getArrayFooter() {
    const footer = super.getArrayFooter();
    footer.classList.add("panel-footer");
    return footer;
  }
  getBtnGroup() {
    const html = super.getBtnGroup();
    html.classList.add("btn-group");
    html.style.display = "inline-flex";
    return html;
  }
  getButton(config) {
    const html = super.getButton(config);
    html.classList.add("btn");
    html.classList.add("btn-xs");
    html.classList.add("btn-default");
    return html;
  }
  getDescription(config) {
    const description = super.getDescription(config);
    description.classList.add("text-muted");
    description.style.marginBottom = "5px";
    return description;
  }
  getPropertiesGroup(config = {}) {
    const propertiesGroup = super.getPropertiesGroup(config);
    const br = document.createElement("br");
    propertiesGroup.container.appendChild(br);
    propertiesGroup.group.classList.add("pl-3");
    return propertiesGroup;
  }
  getTextareaControl(config) {
    const control = super.getTextareaControl(config);
    const { container, input, label } = control;
    container.classList.add("form-group");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableTextareaControl(control) {
    super.adaptForTableTextareaControl(control);
    control.container.classList.remove("form-group");
  }
  getInputControl(config) {
    const control = super.getInputControl(config);
    const { container, input, label } = control;
    container.classList.add("form-group");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  getInputRangeControl(config) {
    return super.getInputRangeControl(config);
  }
  adaptForTableInputControl(control, td) {
    super.adaptForTableInputControl(control, td);
    control.container.classList.remove("form-group");
  }
  getRadiosControl(config) {
    const control = super.getRadiosControl(config);
    const { fieldset, radios, labels, labelTexts, radioControls, description, messages } = control;
    radioControls.forEach((radioControl, index2) => {
      radioControl.classList.add("radio");
      if (config.inline) {
        radioControl.style.display = "inline-flex";
        radioControl.style.alignItems = "center";
        radioControl.style.paddingLeft = "0";
        radioControl.style.marginRight = "15px";
      }
      fieldset.appendChild(radioControls[index2]);
      radioControl.appendChild(labels[index2]);
      labels[index2].appendChild(radios[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    fieldset.appendChild(description);
    fieldset.appendChild(messages);
    return control;
  }
  adaptForTableRadiosControl(control, td) {
    super.adaptForTableRadiosControl(control, td);
    control.fieldset.classList.remove("panel");
    control.fieldset.classList.remove("panel-default");
    control.fieldset.style.marginBottom = "0";
  }
  getCheckboxesControl(config) {
    const control = super.getCheckboxesControl(config);
    const { fieldset, checkboxes, labels, labelTexts, checkboxControls } = control;
    checkboxControls.forEach((checkboxControl, index2) => {
      checkboxControl.classList.add("checkbox");
      if (config.inline) {
        checkboxControl.style.display = "inline-flex";
        checkboxControl.style.alignItems = "center";
        checkboxControl.style.paddingLeft = "0";
        checkboxControl.style.marginRight = "30px";
      }
      fieldset.appendChild(checkboxControls[index2]);
      checkboxControl.appendChild(labels[index2]);
      labels[index2].appendChild(checkboxes[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    return control;
  }
  adaptForTableCheckboxesControl(control, td) {
    super.adaptForTableCheckboxesControl(control, td);
    control.fieldset.classList.remove("panel");
    control.fieldset.classList.remove("panel-default");
    control.body.classList.remove("panel-body");
  }
  getCheckboxControl(config) {
    const control = super.getCheckboxControl(config);
    const { container, formGroup, description, messages } = control;
    container.appendChild(formGroup);
    container.appendChild(description);
    container.appendChild(messages);
    return control;
  }
  adaptForTableCheckboxControl(control, td) {
    super.adaptForTableCheckboxControl(control, td);
  }
  getSelectControl(config) {
    const control = super.getSelectControl(config);
    const { container, input, label } = control;
    if (!config.noSpacing) {
      container.classList.add("form-group");
    }
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableSelectControl(control, td) {
    super.adaptForTableSelectControl(control, td);
    control.container.classList.remove("form-group");
  }
  adaptForTableMultipleControl(control, td) {
    super.adaptForTableMultipleControl(control, td);
  }
  getAlert(config) {
    const html = super.getAlert(config);
    html.classList.add("alert");
    html.classList.add("alert-danger");
    return html;
  }
  getErrorFeedback(config) {
    const html = super.getErrorFeedback(config);
    html.classList.add("text-danger");
    return html;
  }
  getWarningFeedback(config) {
    const html = super.getWarningFeedback(config);
    html.classList.add("text-warning");
    return html;
  }
  getRow() {
    const row = super.getRow();
    row.classList.add("row");
    return row;
  }
  getCol(xs, sm, md, lg, offsetMd) {
    const col = super.getCol();
    col.classList.add("col-xs-" + xs);
    col.classList.add("col-sm-" + sm);
    col.classList.add("col-md-" + md);
    col.classList.add("col-lg-" + lg);
    if (offsetMd) {
      col.classList.add("col-md-offset-" + offsetMd);
    }
    return col;
  }
  getTabList(config) {
    const tabList = super.getTabList(config);
    tabList.classList.add("nav");
    tabList.style.marginBottom = "1rem";
    if (config.variant === "horizontal") {
      tabList.classList.add("nav-tabs");
    } else {
      tabList.classList.add("nav-pills");
      tabList.classList.add("nav-stacked");
    }
    return tabList;
  }
  getTab(config) {
    const tab = super.getTab(config);
    tab.link.style.display = "flex";
    tab.link.style.alignItems = "center";
    tab.arrayActions.style.flexShrink = "0";
    tab.arrayActions.style.whiteSpace = "nowrap";
    tab.text.style.flex = "1";
    tab.text.style.marginLeft = "5px";
    tab.text.style.marginRight = "5px";
    if (config.hasErrors) {
      const warning = tab.text.querySelector(".jedi-nav-warning");
      if (warning) {
        tab.text.removeChild(warning);
        warning.style.flexShrink = "0";
        warning.style.whiteSpace = "nowrap";
        tab.link.appendChild(warning);
      }
    }
    if (config.active) {
      tab.list.classList.add("active");
    }
    tab.link.setAttribute("data-toggle", "tab");
    return tab;
  }
  /**
   * A simple table layout
   */
  getTable() {
    const container = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    container.classList.add("table-responsive");
    table.classList.add("table");
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    return { container, table, thead, tbody };
  }
  setTabPaneAttributes(element, active, id) {
    super.setTabPaneAttributes(element, active, id);
    element.classList.add("tab-pane");
    element.classList.toggle("in", active);
    element.classList.toggle("active", active);
  }
  infoAsModal(info, id, config = {}) {
    const modal = document.createElement("div");
    const modalDialog = document.createElement("div");
    const modalContent = document.createElement("div");
    const modalHeader = document.createElement("div");
    const modalTitle = document.createElement("div");
    const modalBody = document.createElement("div");
    const closeBtn = this.getButton({
      content: "Close",
      icon: "close"
    });
    const modalId = id + "-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("id", modalId);
    closeBtn.setAttribute("data-dismiss", "modal");
    closeBtn.setAttribute("always-enabled", "");
    info.info.setAttribute("data-toggle", "modal");
    info.info.setAttribute("data-target", "#" + modalId);
    modal.classList.add("modal");
    modal.classList.add("fade");
    modalDialog.classList.add("modal-dialog");
    modalContent.classList.add("modal-content");
    modalHeader.classList.add("modal-header");
    modalTitle.classList.add("modal-title");
    modalBody.classList.add("modal-body");
    closeBtn.classList.add("jedi-modal-close");
    closeBtn.classList.add("close");
    if (isString(config.title)) {
      modalTitle.innerHTML = config.title;
    }
    if (isString(config.content)) {
      modalBody.innerHTML = config.content;
    }
    info.container.appendChild(modal);
    modal.appendChild(modalDialog);
    modalDialog.appendChild(modalContent);
    modalContent.appendChild(modalHeader);
    modalHeader.appendChild(closeBtn);
    modalHeader.appendChild(modalTitle);
    modalContent.appendChild(modalBody);
  }
  visuallyHidden(element) {
    element.classList.add("sr-only");
  }
  visuallyVisible(element) {
    element.classList.remove("sr-only");
  }
}
class ThemeBootstrap4 extends Theme {
  init() {
    this.useToggleEvents = false;
  }
  getAddPropertyButton(config) {
    const btn = super.getAddPropertyButton(config);
    btn.classList.add("btn-primary");
    btn.classList.add("btn-block");
    return btn;
  }
  getCollapseToggle(config) {
    const toggle = super.getCollapseToggle(config);
    toggle.setAttribute("href", "#" + config.collapseId);
    toggle.setAttribute("data-toggle", "collapse");
    toggle.setAttribute("always-enabled", "");
    return toggle;
  }
  getCollapse(config) {
    const collapse = super.getCollapse(config);
    collapse.classList.add("collapse");
    if (!config.startCollapsed) {
      collapse.classList.add("show");
    }
    return collapse;
  }
  getJsonData(config) {
    const jsonData = super.getJsonData(config);
    jsonData.control.classList.add("form-group");
    jsonData.input.classList.add("form-control");
    jsonData.copyBtn.classList.add("btn-secondary");
    jsonData.copyBtn.classList.add("btn-block");
    jsonData.saveBtn.classList.add("btn-primary");
    jsonData.saveBtn.classList.add("btn-block");
    return jsonData;
  }
  getFieldset() {
    const fieldset = document.createElement("fieldset");
    fieldset.setAttribute("role", "group");
    fieldset.classList.add("card");
    fieldset.classList.add("mb-3");
    return fieldset;
  }
  getLegend(config) {
    const superLegend = super.getLegend(config);
    const { legend } = superLegend;
    legend.classList.add("card-header");
    legend.classList.add("d-flex");
    legend.classList.add("justify-content-between");
    legend.classList.add("align-items-center");
    legend.classList.add("float-left");
    legend.classList.add("py-2");
    return superLegend;
  }
  getLabel(config) {
    const labelObj = super.getLabel(config);
    if (labelObj.icon.classList) {
      labelObj.icon.classList.add("mr-1");
    }
    return labelObj;
  }
  getCard() {
    const card = super.getCard();
    card.classList.add("card");
    card.classList.add("mb-3");
    return card;
  }
  getCardHeader(config) {
    const html = super.getCardHeader(config);
    html.classList.add("card-header");
    html.classList.add("d-flex");
    html.classList.add("justify-content-end");
    html.classList.add("align-items-center");
    html.classList.add("py-1");
    return html;
  }
  getCardBody() {
    const html = super.getCardBody();
    html.classList.add("card-body");
    html.classList.add("pb-0");
    return html;
  }
  getArrayFooter() {
    const footer = super.getArrayFooter();
    footer.classList.add("card-footer");
    return footer;
  }
  getBtnGroup() {
    const html = super.getBtnGroup();
    html.classList.add("btn-group");
    return html;
  }
  getButton(config) {
    const html = super.getButton(config);
    html.classList.add("btn");
    html.classList.add("btn-sm");
    return html;
  }
  getDescription(config) {
    const description = super.getDescription(config);
    description.classList.add("text-muted");
    description.classList.add("fs-sm");
    description.classList.add("mb-1");
    return description;
  }
  getPropertiesGroup(config = {}) {
    const propertiesGroup = super.getPropertiesGroup(config);
    propertiesGroup.group.classList.add("pl-3");
    propertiesGroup.name.classList.add("mb-3");
    propertiesGroup.container.classList.add("mb-4");
    return propertiesGroup;
  }
  getTextareaControl(config) {
    const control = super.getTextareaControl(config);
    const { container, input, label } = control;
    container.classList.add("form-group");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableTextareaControl(control) {
    super.adaptForTableTextareaControl(control);
    control.container.classList.remove("form-group");
  }
  getInputControl(config) {
    const control = super.getInputControl(config);
    const { container, input, label } = control;
    container.classList.add("form-group");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  getInputRangeControl(config) {
    const control = super.getInputRangeControl(config);
    const { container, input, label } = control;
    container.classList.add("form-group");
    input.classList.add("custom-range");
    input.classList.remove("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableInputControl(control, td) {
    super.adaptForTableInputControl(control, td);
    control.container.classList.remove("form-group");
  }
  getRadiosControl(config) {
    const control = super.getRadiosControl(config);
    const { container, fieldset, radios, labels, labelTexts, radioControls, description, messages } = control;
    if (!config.noSpacing) {
      container.classList.add("form-group");
    }
    radioControls.forEach((radioControl, index2) => {
      radioControl.classList.add("form-check");
      radios[index2].classList.add("form-check-input");
      labels[index2].classList.add("form-check-label");
      if (config.inline) {
        radioControl.classList.add("form-check-inline");
      }
      fieldset.appendChild(radioControls[index2]);
      radioControl.appendChild(radios[index2]);
      radioControl.appendChild(labels[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    fieldset.appendChild(description);
    fieldset.appendChild(messages);
    return control;
  }
  adaptForTableRadiosControl(control, td) {
    super.adaptForTableRadiosControl(control, td);
    control.container.classList.remove("form-group");
    control.fieldset.classList.remove("card");
    control.fieldset.style.marginBottom = "0";
  }
  getCheckboxesControl(config) {
    const control = super.getCheckboxesControl(config);
    const { checkboxes, labels, checkboxControls } = control;
    checkboxControls.forEach((checkboxControl, index2) => {
      checkboxControl.classList.add("form-group");
      checkboxControl.classList.add("form-check");
      checkboxes[index2].classList.add("form-check-input");
      labels[index2].classList.add("form-check-label");
      if (config.inline) {
        checkboxControl.classList.add("form-check-inline");
      }
    });
    return control;
  }
  adaptForTableCheckboxesControl(control, td) {
    super.adaptForTableCheckboxesControl(control, td);
    control.container.classList.remove("form-group");
    control.fieldset.classList.remove("card");
    control.fieldset.classList.remove("mb-3");
    control.body.classList.remove("card-body");
    control.body.classList.remove("card-body");
  }
  getCheckboxControl(config) {
    const control = super.getCheckboxControl(config);
    const { container, formGroup, input, label, info, description, messages } = control;
    container.classList.add("form-group");
    formGroup.classList.add("form-check");
    input.classList.add("form-check-input");
    label.classList.add("form-check-label");
    container.appendChild(formGroup);
    formGroup.appendChild(input);
    formGroup.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(description);
    container.appendChild(messages);
    return control;
  }
  adaptForTableCheckboxControl(control, td) {
    super.adaptForTableCheckboxControl(control, td);
    control.container.classList.remove("form-group");
    control.formGroup.classList.remove("form-check");
    control.input.classList.remove("form-check-input");
    control.label.classList.remove("form-check-label");
  }
  getSelectControl(config) {
    const control = super.getSelectControl(config);
    const { container, input } = control;
    if (!config.noSpacing) {
      container.classList.add("form-group");
    }
    input.classList.add("form-control");
    return control;
  }
  adaptForTableSelectControl(control, td) {
    super.adaptForTableSelectControl(control, td);
    control.container.classList.remove("form-group");
  }
  adaptForTableMultipleControl(control, td) {
    super.adaptForTableMultipleControl(control, td);
    control.container.classList.remove("mb-3");
  }
  getAlert(config) {
    const html = super.getAlert(config);
    html.classList.add("alert");
    html.classList.add("alert-danger");
    return html;
  }
  getErrorFeedback(config) {
    const html = super.getErrorFeedback(config);
    html.classList.add("text-danger");
    html.classList.add("form-text");
    html.classList.add("d-block");
    return html;
  }
  getWarningFeedback(config) {
    const html = super.getWarningFeedback(config);
    html.classList.add("text-warning");
    html.classList.add("form-text");
    html.classList.add("d-block");
    return html;
  }
  getColumnClass(size, cols) {
    return "col-" + size + "-" + cols;
  }
  getRow() {
    const row = super.getRow();
    row.classList.add("row");
    return row;
  }
  getCol(xs, sm, md, lg, offsetMd) {
    const col = super.getCol(xs, md, offsetMd);
    col.classList.add("col-" + xs);
    col.classList.add("col-sm" + sm);
    col.classList.add("col-md-" + md);
    col.classList.add("col-lg-" + lg);
    if (offsetMd) {
      col.classList.add("offset-md-" + offsetMd);
    }
    return col;
  }
  getTabList(config) {
    const tabList = super.getTabList();
    tabList.classList.add("nav");
    tabList.classList.add("mb-3");
    if (config.variant === "horizontal") {
      tabList.classList.add("nav-tabs");
    } else {
      tabList.classList.add("nav-pills");
      tabList.classList.add("flex-column");
    }
    return tabList;
  }
  getTab(config) {
    const tab = super.getTab(config);
    tab.list.classList.add("nav-item");
    tab.link.classList.add("nav-link");
    tab.link.classList.add("d-flex", "align-items-center");
    tab.arrayActions.classList.add("flex-shrink-0", "text-nowrap");
    tab.text.classList.add("flex-grow-1", "mx-2");
    if (config.hasErrors) {
      const warning = tab.text.querySelector(".jedi-nav-warning");
      if (warning) {
        tab.text.removeChild(warning);
        warning.classList.add("flex-shrink-0", "text-nowrap");
        tab.link.appendChild(warning);
      }
    }
    tab.link.setAttribute("data-toggle", "tab");
    if (config.active) {
      tab.link.classList.add("active");
    }
    return tab;
  }
  /**
   * A simple table layout
   */
  getTable() {
    const container = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    container.classList.add("table-responsive");
    table.classList.add("table");
    table.classList.add("table-borderless");
    table.classList.add("table-sm");
    table.classList.add("align-middle");
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    return { container, table, thead, tbody };
  }
  setTabPaneAttributes(element, active, id) {
    super.setTabPaneAttributes(element, active, id);
    element.classList.add("tab-pane");
    element.classList.toggle("active", active);
  }
  infoAsModal(info, id, config = {}) {
    const modal = document.createElement("div");
    const modalDialog = document.createElement("div");
    const modalContent = document.createElement("div");
    const modalHeader = document.createElement("div");
    const modalTitle = document.createElement("div");
    const modalBody = document.createElement("div");
    const closeBtn = this.getButton({
      content: "Close",
      icon: "close"
    });
    const modalId = id + "-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("id", modalId);
    closeBtn.setAttribute("data-dismiss", "modal");
    closeBtn.setAttribute("always-enabled", "");
    info.info.setAttribute("data-toggle", "modal");
    info.info.setAttribute("data-target", "#" + modalId);
    info.container.classList.add("ml-1");
    modal.classList.add("modal");
    modal.classList.add("fade");
    modalDialog.classList.add("modal-dialog");
    modalContent.classList.add("modal-content");
    modalHeader.classList.add("modal-header");
    modalTitle.classList.add("modal-title");
    modalBody.classList.add("modal-body");
    closeBtn.classList.add("jedi-modal-close");
    closeBtn.classList.add("close");
    if (isString(config.title)) {
      modalTitle.innerHTML = config.title;
    }
    if (isString(config.content)) {
      modalBody.innerHTML = config.content;
    }
    info.container.appendChild(modal);
    modal.appendChild(modalDialog);
    modalDialog.appendChild(modalContent);
    modalContent.appendChild(modalHeader);
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    modalContent.appendChild(modalBody);
  }
  visuallyHidden(element) {
    element.classList.add("sr-only");
  }
  visuallyVisible(element) {
    element.classList.remove("sr-only");
  }
}
class ThemeBootstrap5 extends Theme {
  init() {
    this.useToggleEvents = false;
  }
  getAddPropertyButton(config) {
    const btn = super.getAddPropertyButton(config);
    btn.classList.add("btn-primary");
    btn.classList.add("w-100");
    return btn;
  }
  getCollapseToggle(config) {
    const toggle = super.getCollapseToggle(config);
    toggle.setAttribute("href", "#" + config.collapseId);
    toggle.setAttribute("data-bs-toggle", "collapse");
    toggle.setAttribute("always-enabled", "");
    return toggle;
  }
  getCollapse(config) {
    const collapse = super.getCollapse(config);
    collapse.classList.add("collapse");
    if (!config.startCollapsed) {
      collapse.classList.add("show");
    }
    return collapse;
  }
  getJsonData(config) {
    const jsonData = super.getJsonData(config);
    jsonData.control.classList.add("mb-3");
    jsonData.input.classList.add("form-control");
    jsonData.copyBtn.classList.add("btn-secondary");
    jsonData.copyBtn.classList.add("w-100");
    jsonData.saveBtn.classList.add("btn-primary");
    jsonData.saveBtn.classList.add("w-100");
    return jsonData;
  }
  getFieldset() {
    const fieldset = document.createElement("fieldset");
    fieldset.setAttribute("role", "group");
    fieldset.classList.add("card");
    fieldset.classList.add("mb-3");
    return fieldset;
  }
  getLegend(config) {
    const superLegend = super.getLegend(config);
    const { legend } = superLegend;
    legend.classList.add("card-header");
    legend.classList.add("d-flex");
    legend.classList.add("justify-content-between");
    legend.classList.add("align-items-center");
    legend.classList.add("py-2");
    return superLegend;
  }
  styleLegendWarning(span) {
    span.classList.add("ms-1");
  }
  getLabel(config) {
    const labelObj = super.getLabel(config);
    if (labelObj.icon.classList) {
      labelObj.icon.classList.add("me-1");
    }
    return labelObj;
  }
  getCard() {
    const card = super.getCard();
    card.classList.add("card");
    card.classList.add("mb-3");
    return card;
  }
  getCardHeader(config) {
    const html = super.getCardHeader(config);
    html.classList.add("card-header");
    html.classList.add("d-flex");
    html.classList.add("justify-content-end");
    html.classList.add("align-items-center");
    html.classList.add("py-1");
    return html;
  }
  getCardBody() {
    const html = super.getCardBody();
    html.classList.add("card-body");
    html.classList.add("pb-0");
    return html;
  }
  getArrayFooter() {
    const footer = super.getArrayFooter();
    footer.classList.add("card-footer");
    return footer;
  }
  getControlSlot() {
    const controlSlot = super.getControlSlot();
    controlSlot.classList.add("mb-3");
    return controlSlot;
  }
  getBtnGroup() {
    const html = super.getBtnGroup();
    html.classList.add("btn-group");
    return html;
  }
  getButton(config) {
    const html = super.getButton(config);
    html.classList.add("btn");
    html.classList.add("btn-sm");
    return html;
  }
  getDescription(config) {
    const description = super.getDescription(config);
    description.classList.add("text-muted");
    description.classList.add("mb-1");
    return description;
  }
  getPropertiesGroup(config = {}) {
    const propertiesGroup = super.getPropertiesGroup(config);
    propertiesGroup.group.classList.add("ps-3");
    propertiesGroup.container.classList.add("mb-4");
    return propertiesGroup;
  }
  getTextareaControl(config) {
    const control = super.getTextareaControl(config);
    const { container, input, label } = control;
    container.classList.add("mb-3");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableTextareaControl(control) {
    super.adaptForTableTextareaControl(control);
    control.container.classList.remove("mb-3");
  }
  getInputControl(config) {
    const control = super.getInputControl(config);
    const { container, input, label } = control;
    container.classList.add("mb-3");
    input.classList.add("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  getInputRangeControl(config) {
    const control = super.getInputRangeControl(config);
    const { container, input, label } = control;
    container.classList.add("mb-3");
    input.classList.add("form-range");
    input.classList.remove("form-control");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    return control;
  }
  adaptForTableInputControl(control, td) {
    super.adaptForTableInputControl(control, td);
    control.container.classList.remove("mb-3");
  }
  getRadiosControl(config) {
    const control = super.getRadiosControl(config);
    const { container, fieldset, radios, labels, labelTexts, radioControls, description, messages } = control;
    if (!config.noSpacing) {
      container.classList.add("mb-3");
    }
    radioControls.forEach((radioControl, index2) => {
      radioControl.classList.add("form-check");
      radios[index2].classList.add("form-check-input");
      labels[index2].classList.add("form-check-label");
      if (config.inline) {
        radioControl.classList.add("form-check-inline");
      }
      fieldset.appendChild(radioControls[index2]);
      radioControl.appendChild(radios[index2]);
      radioControl.appendChild(labels[index2]);
      labels[index2].appendChild(labelTexts[index2]);
    });
    fieldset.appendChild(description);
    fieldset.appendChild(messages);
    return control;
  }
  adaptForTableRadiosControl(control, td) {
    super.adaptForTableRadiosControl(control, td);
    control.container.classList.remove("mb-3");
    control.fieldset.classList.remove("card");
    control.fieldset.style.marginBottom = "0";
  }
  getCheckboxesControl(config) {
    const control = super.getCheckboxesControl(config);
    const { checkboxes, labels, checkboxControls } = control;
    checkboxControls.forEach((checkboxControl, index2) => {
      checkboxControl.classList.add("mb-3");
      checkboxControl.classList.add("form-check");
      checkboxes[index2].classList.add("form-check-input");
      labels[index2].classList.add("form-check-label");
      if (config.inline) {
        checkboxControl.classList.add("form-check-inline");
      }
    });
    return control;
  }
  getCheckboxControl(config) {
    const control = super.getCheckboxControl(config);
    const { container, formGroup, input, label, info, description, messages } = control;
    container.classList.add("mb-3");
    formGroup.classList.add("form-check");
    input.classList.add("form-check-input");
    label.classList.add("form-check-label");
    if (config.titleHidden) {
      this.visuallyHidden(label);
    }
    container.appendChild(formGroup);
    formGroup.appendChild(input);
    formGroup.appendChild(label);
    if (isObject(config.info)) {
      label.appendChild(info.container);
    }
    container.appendChild(description);
    container.appendChild(messages);
    return control;
  }
  adaptForTableCheckboxControl(control, td) {
    super.adaptForTableCheckboxControl(control, td);
    control.container.classList.remove("mb-3");
    control.formGroup.classList.remove("form-check");
  }
  getSelectControl(config) {
    const control = super.getSelectControl(config);
    const { container, input } = control;
    if (!config.noSpacing) {
      container.classList.add("mb-3");
    }
    input.classList.add("form-select");
    return control;
  }
  adaptForTableSelectControl(control, td) {
    super.adaptForTableSelectControl(control, td);
    control.container.classList.remove("mb-3");
  }
  adaptForTableMultipleControl(control, td) {
    super.adaptForTableMultipleControl(control, td);
    control.container.classList.remove("mb-3");
  }
  getAlert(config) {
    const html = super.getAlert(config);
    html.classList.add("alert");
    html.classList.add("alert-danger");
    return html;
  }
  getErrorFeedback(config) {
    const html = super.getErrorFeedback(config);
    html.classList.add("text-danger");
    html.classList.add("d-block");
    html.classList.add("form-text");
    return html;
  }
  getWarningFeedback(config) {
    const html = super.getWarningFeedback(config);
    html.classList.add("text-warning");
    html.classList.add("d-block");
    html.classList.add("form-text");
    return html;
  }
  getRow() {
    const row = super.getRow();
    row.classList.add("row");
    return row;
  }
  getCol(xs, sm, md, lg, offsetMd) {
    const col = super.getCol(xs, md, offsetMd);
    col.classList.add("col-" + xs);
    col.classList.add("col-sm" + sm);
    col.classList.add("col-md-" + md);
    col.classList.add("col-lg-" + lg);
    if (offsetMd) {
      col.classList.add("offset-md-" + offsetMd);
    }
    return col;
  }
  getTabList(config) {
    const tabList = super.getTabList(config);
    tabList.classList.add("nav");
    tabList.classList.add("mb-3");
    if (config.variant === "horizontal") {
      tabList.classList.add("nav-tabs");
    } else {
      tabList.classList.add("nav-pills");
      tabList.classList.add("flex-column");
    }
    return tabList;
  }
  getTab(config) {
    const tab = super.getTab(config);
    tab.list.classList.add("nav-item");
    tab.link.classList.add("nav-link");
    tab.link.classList.add("d-flex", "align-items-center");
    tab.arrayActions.classList.add("flex-shrink-0", "text-nowrap");
    tab.text.classList.add("flex-grow-1", "mx-2");
    if (config.hasErrors) {
      const warning = tab.text.querySelector(".jedi-nav-warning");
      if (warning) {
        tab.text.removeChild(warning);
        warning.classList.add("flex-shrink-0", "text-nowrap");
        tab.link.appendChild(warning);
      }
    }
    tab.link.setAttribute("data-bs-toggle", "tab");
    if (config.active) {
      tab.link.classList.add("active");
    }
    return tab;
  }
  /**
   * A simple table layout
   */
  getTable() {
    const container = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    container.classList.add("table-responsive");
    table.classList.add("table");
    table.classList.add("table-borderless");
    table.classList.add("table-sm");
    table.classList.add("align-middle");
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    return { container, table, thead, tbody };
  }
  setTabPaneAttributes(element, active, id) {
    super.setTabPaneAttributes(element, active, id);
    element.classList.add("tab-pane");
    element.classList.toggle("active", active);
  }
  infoAsModal(info, id, config = {}) {
    const modal = document.createElement("div");
    const modalDialog = document.createElement("div");
    const modalContent = document.createElement("div");
    const modalHeader = document.createElement("div");
    const modalTitle = document.createElement("div");
    const modalBody = document.createElement("div");
    const closeBtn = this.getButton({
      content: "Close",
      icon: "close"
    });
    const modalId = id + "-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("id", modalId);
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.setAttribute("always-enabled", "");
    info.info.setAttribute("data-bs-toggle", "modal");
    info.info.setAttribute("data-bs-target", "#" + modalId);
    info.container.classList.add("ms-1");
    modal.classList.add("modal");
    modal.classList.add("fade");
    modalDialog.classList.add("modal-dialog");
    modalContent.classList.add("modal-content");
    modalHeader.classList.add("modal-header");
    modalTitle.classList.add("modal-title");
    modalBody.classList.add("modal-body");
    closeBtn.classList.add("jedi-modal-close");
    if (isString(config.title)) {
      modalTitle.innerHTML = config.title;
    }
    if (isString(config.content)) {
      modalBody.innerHTML = config.content;
    }
    info.container.appendChild(modal);
    modal.appendChild(modalDialog);
    modalDialog.appendChild(modalContent);
    modalContent.appendChild(modalHeader);
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    modalContent.appendChild(modalBody);
  }
  visuallyHidden(element) {
    element.classList.add("visually-hidden");
  }
  visuallyVisible(element) {
    element.classList.remove("visually-hidden");
  }
}
const index = {
  Schema,
  Utils,
  Editor,
  EditorBoolean,
  EditorBooleanRadios: EditorRadios,
  EditorBooleanSelect,
  EditorBooleanCheckbox,
  EditorString,
  EditorStringRadios,
  EditorStringSelect,
  EditorStringTextarea,
  EditorStringAwesomplete,
  EditorStringPickr,
  EditorStringInput,
  EditorNumberRange,
  EditorNumber,
  EditorNumberRadios,
  EditorNumberSelect,
  EditorNumberInput,
  EditorObjectGrid,
  EditorObjectCategories,
  EditorObjectNav,
  EditorObject,
  EditorArrayChoices,
  EditorArrayNav,
  EditorArray,
  EditorMultiple,
  EditorIfThenElse,
  EditorNull,
  Theme,
  ThemeBootstrap3,
  ThemeBootstrap4,
  ThemeBootstrap5,
  RefParser,
  Create: Jedison,
  SchemaGenerator
};
export {
  index as default
};
//# sourceMappingURL=jedison.js.map

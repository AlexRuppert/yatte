// Defines the default escape function for HTML strings.
// Currently the build-in escaping of the textarea element is used.
// For non-browser environments no escape function is defined yet.
// You can define your own escape function by setting
// yatte.settings.function.escapeHTMLFunc to a function with the
// signature function(string: string): string
const escape = document ? document.createElement('textarea') : null; // eslint-disable-line
// The main object of this library (the only one that is exported)
const yatte = {
  // Various settings
  settings: {
    // Defined internally used functions
    // You can overwrite them, if required
    functions: {
      // A function that sanitizes HTML strings.
      // Currently the build-in escaping of the textarea element is used.
      // For non-browser environments no escape function is defined yet.
      escapeHTMLFunc: html => {
        escape.textContent = html;
        return escape.innerHTML
          // Additionally replace ' and ", otherwise there are problems,
          // when using the strings as attribute values
          .replace(/"/g, '&#34;')
          .replace(/'/g, '&#39;');
      },
    },
    // Settings regarding the formatting
    format: {
      // If false, indentation information in template literals is not preserved
      // This will improve performance, if proper indentation is not required
      indentation: true,
      // Here you can define custom transformation functions
      // that are applied to values in template literals.
      // You define the triggering symbols as the key and a function
      // of the signature function(value: *): string as the value.
      // See readme for usage examples and explicitTransformation for implementation.
      transform: {
        $: _ =>
          yatte.settings.functions.escapeHTMLFunc(_),
        U: _ =>
          _.toUpperCase(),
        L: _ =>
          _.toLowerCase(),
        T: _ =>
          _.trim(),
      },
    },
  },
};

// This function manages the indentation level.
// It is used on the strings and values of a template literal.
const dedent = (strings, values) => {
  // The first string needs to start with a linebreak (to get the base indentation).
  if (strings[0].startsWith('\n')) {
    // The base indentation level is the first appearance of a letter.
    const indent = strings[0].search(/[^\n \t]|$/) - 1;
    const result = { strings: [], values: [] };

    strings.forEach((text, i) => {
      // Each string is split into individual lines to work on.
      const split = text.split('\n').map((s, k) =>
        // With exception of the first line, the identation level is reduced to the base level.
        (k === 0 ? s : s.substr(indent)));
      // Check if the string has a value associated with item
      // (see template literal documentation on MDN).
      if (typeof values[i] !== 'undefined') {
        // If the value is a string starting with a line break,
        // we need also to consider the indentation.
        if (values[i][0] === '\n') {
          // To get the inner indentation level, we check the length
          // of the last line of the already normalized string
          let innerIndentation = split[split.length - 1];
          // We need the whitespaces before the first letter.
          innerIndentation = innerIndentation
            .substr(0, innerIndentation.search(/\S|$/));
          // Based on the inner indentation, we normalize each line of the value string.
          const value = values[i].split('\n').map(str =>
            innerIndentation + str
          // After joining, we also need to remove the indentaion of the first line.
          ).join('\n').substr((innerIndentation.length * 2) + 1);
          result.values.push(value);
        } else {
          result.values.push(values[i]);
        }
      }
      result.strings.push(split.join('\n'));
    });
    return result;
  }
  return { strings, values };
};

// Provides transformations to template literal values, before assembling
// them into a string.
const explicitTransformation = (str, value) => {
  // The allowed suffixes are taken as key value pairs.
  const suffixes = yatte.settings.format.transform;
  // Determine the last token at the and of the string (before the ${...})
  const lastToken = str.substr(str.search(/\s(?=\S+$)/) + 1);
  if (lastToken.length > 0) {
    // \ is used as an escape character, to be able to use the tokens as regular
    // parts of the string
    if (!lastToken.startsWith('\\')) {
      // The token is only applied, if it is defined as such
      if (typeof suffixes[lastToken] === 'function') {
        // Remove token from string
        str = str.substr(0, str.length - lastToken.length);
        // Process the value using the relevant function
        value = suffixes[lastToken](value);
      }
      // If it is just escaped
    } else if (suffixes[lastToken]) {
      // Remove the escape character
      str = str.substr(0, str.length - lastToken.length - 1) + lastToken;
    }
  }
  return str + value;
};

// The main template literal tag used in yatte.
// It takes care of indentation levels and allows explicit transformations
// like escaping HTML strings.
yatte.do = (strings, ...values) => {
  // yatte does not only work with template literals, but also with other types.
  // If the given value is not an array, make it one for further processing.
  if (!Array.isArray(strings)) {
    strings = [strings];
    // Check if indentation should be preserved (default).
    // Disabnling this in the settings improves performance, since the required string operations
    // are ommited.
  } else if (yatte.settings.format.indentation) {
    const result = dedent(strings, values);
    strings = result.strings;
    values = result.values;
  }
  // Combine the given strings and values to a string
  // and perform explicit transformations if transformation tokens are found.
  return (values.length ? values.reduce((old, value, i) =>
    old + explicitTransformation(strings[i], value)
    , '') : '') + strings[strings.length - 1];
};


// Helper for yatte.if
// If the condition is true, no actual checks need to be done and
// the remaining branches can be automatically created, with the
// else branch having the result.
const ifFallThrough = result =>
  () =>
    ({
      elseIf: () => ifFallThrough(result),
      else: () => result,
    });

// yatte.if can be used for if/elseIf/else constructs (see readme).
yatte.if = condition =>
  // We don't care for the success arguments (mostly template literals),
  // as we pass them directly to yatte.do
  (..._) =>
    (condition ? ifFallThrough(yatte.do(..._))()
      : {
        elseIf: yatte.if,
        else: yatte.do,
      });

// yatte.loop provides the ability to generate strings by looping over arrays or objects.
// In the end everything is joined by a new line. This parameter can be overwritten when
// invoking yatte.loop
yatte.loop = (object, joinChar = '\n') =>
  // Works with template literals and other types.
  (strings, ...values) => {
    let collectionLength = 0;
    let collection = [];
    const objType = typeof object;
    // First we need to check, over what we are going to loop.
    switch (objType) {
      // If a function is provided, yatte.loop works like 'while'.
      case 'function':
        collectionLength = object ? 1 : 0;
        break;
      // If a number n is procdeded, yatte.loop just repeats a value n times.
      case 'number':
        collectionLength = Math.abs(object);
        break;
      // Otherwise a collection is created as an array of key-value pairs.
      // For arrays the keys are the indices, for objects the respective keys.
      default:
        collection = Object.keys(object).map((key) =>
          ({ key, value: object[key] }));
        collectionLength = collection.length;
        break;
    }
    let mapped = [];
    // Now we need to check, what the tag was applied to
    // If iterating over an object or array it usually should be a function
    if (typeof strings === 'function') {
      switch (objType) {
        case 'function':
          // Behave like 'while' when the first yatte.loop parameter is also a function
          // Be carefull with infinite loops
          while (object() === true) {
            mapped.push(strings());
          }
          break;
          // If the first yatte.loop parameter is a number,
          // just repeatedly execute the given function.
        case 'number':
          for (let i = 0; i < collectionLength; i++) {
            mapped.push(strings(i, i));
          }
          break;
          // Otherwise apply map on the given collecton
        default:
          mapped = collection.map(item =>
            strings(item.value, item.key));
          break;
      }
      // Remove unnecessary linebreaks
      // (which are otherwise introduced using yatte.do's indentation syntax).
      mapped = mapped.map((str, i) => {
        if (i > 0 && typeof str === 'string' && str[0] === '\n') {
          return str.substr(1);
        }
        return str;
      });
      return mapped.join(joinChar);
    }

    // If no function but an array is provided, apply yatte.do on it
    if (Array.isArray(strings)) {
      strings = yatte.do(strings, ...values);
    }
    // Repeat the given (non-function) value before returning it
    const result = (strings + joinChar).repeat(collectionLength);
    return result.substring(0, result.length - (joinChar.length));
  };

window.yatte = yatte;

# yatte - Yet Another Tiny Templating Engine

yatte is a small lightweight string templating engine (<2KB)
using ES6 [template literals](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals) and template literal tags.
It supports indentation awareness for multiline templates, even for nested template literals.

Various built-in helper functions simplify the workflow, like looping over arrays, or escaping HTML strings.
You can easily extend yatte with your own custom functions and adapt it to you needs.

Here is a brief example for a first impression:
```
const data = [
  { title: 'Monkey', text: 'lorem ipsum a' },
  { title: 'Mouse', text: 'lorem ipsum b' },
  { title: 'Cat', text: 'lorem ipsum c' },
  { title: 'Dog', text: 'lorem ipsum d' },
]
const listTemplate = (elements, clazz = '') => yatte.do`
  <ul class="${clazz}">
    ${yatte.loop(elements) (el => yatte.do`
      <li>          
        ${el.title}: ${el.text}                   
      </li>`)}
  </ul>`;
console.log(listTemplate(data, 'my-class'))
```

This results in the output:
```
<ul class="MyClass">
  <li>          
    Monkey: lorem ipsum a                   
  </li>
  <li>          
    Mouse: lorem ipsum b                   
  </li>
  <li>          
    Cat: lorem ipsum c                   
  </li>
  <li>          
    Dog: lorem ipsum d                   
  </li>
</ul>
```

## Usage
`./dist` contains two files (you need only one):
* yatte.js: This is a ES6 module you can import into your existing code-base.
```
import yatte from 'yatte';
```
* yatte-browser.js This is a browser compatible version (as they cannot load ES6 modules yet).
  It registers globally under the window object as `yatte`. 
```
<script src="yatte-browser.js"></script>
```
You might want to define your own shortcuts to simplify
frequent usage of some of yatte's tags like `yatte.do`, e.g.
```
const yo = yatte.do;
```

## Features

### Indentation Awareness

If you wish to use a multiline string and preserve indentation, you musst use 
`yatte.do` as a template literal tag. Open the template literal with `` ` `` and start a new line.
The template literal must start with a line break, so that yatte can identify the base level of the used indentation in your code,
by counting the whitespaces until the first visible character.
```
yatte.do`
  1
    2`
```
=>
```
1
  2
```
This system works also for nested template literals inside `${}`,
where the indentation level of the enclosing `${}` ist taken:

```
yatte.do`
  1
    ${yatte.do `
      2
        3`
    }`
```
=>
```

1
  2
    3
```

You can disable indentation handling and improve performance by setting `yatte.settings.format.indentation` to `false`.

### Conditional Expressions

You can use the ternary operator `?:` or the `yatte.if` tag for a more block like syntax:

```
yatte.if(condition1)`
  result1`
.elseIf(condition2)`
  result2`
.elseIf(condition2)`
  result3`
.else`
  result4`
```

Inside such an `if` 'block' you can ommit the tag `yatte.do`, as it is used automatically.


### Looping
The `yatte.loop` tag simplifies handling of constructs with repetitions.
It takes two parameters: an 'iterator' and a join character, which is used to join all strings created during all iterations.
The provided template literal can be enclosed in a function, which allows to adress individual elements.

If the iterator is a function, `yatte.loop` behaves similar to 'while':
```
let i = 0;
yatte.loop(_ => i < 4) (_ => 
  `This is ${i++}`)
```
=>
```
This is 0
This is 1
This is 2
This is 3
```

The template literal MUST be enclosed in a function for this to
work correctly (otherwise it is just evaluated once and there are no changes or updates in each iteration).

If the iterator is a number, the template literal (enclosing in a function is optional),
is just repeated the specified amount of times.

```
yatte.loop(5, '-') `Hi!`
```
=>
```
Hi!-Hi!-Hi!-Hi!-Hi!
```
(In this example we also join each generated string with '-' instead of the defaul new line.)

If the iterator is an array or a general object with key value pairs, the keys and values can
be used in the template literal (which must be enclosed in a function):
```
const data = ['Parrot', 'Rabbit', 'Snake'];
yatte.loop(data) (animal => 
  `This is a ${animal}`
)
```
=> 
```
This is a Parrot
This is a Rabbit
This is a Snake
```

```
const data = {name: 'Joe', age: 46, city: 'Atlantis'}
yatte.loop(data) ((value, key) => 
  `${key}: ${value}`
)
```
=>
```
name: Joe
age: 46
city: Atlantis
```

For arrays the second paramter `key` has the value of the current index.

### Transformations
yatte supports custom transformation tokens placed just before `${}` that modify its contents.
Currently supported are:
* $: Escapes HTML strings.
* U: Turns text into upper case.
* L: Turns text into lower case.
* T: Trims text.

This example escapes HTML before outputting it:
```
yatte.do `This is HTML $${`<p>test</p>`}`
```
=>
```
This is HTML &lt;p&gt;test&lt;/p&gt;
```

This example transforms text into upper case:
```
yatte.do `This is U${`lower`}`
```
=>
```
This is LOWER
```

The syntax is basically, that you have a whitespace, followed by the special token, followed by `${`.
Tokens can be escaped by prepending then with an `\`.
You can easily add you own tokens by modifying `yatte.settings.format.transform`:

```
yatte.settings.format.transform['MYTOKEN'] = text => someModification(text)
```

A note to HTML escaping with $:
This is currently implemented only in the browser, by using the textarea element's build-in sanitizer.
Additionally all ' and " are also escaped.
you can define your own escape function by overriding `yatte.settings.function.escapeHTMLFunc` with you own function.
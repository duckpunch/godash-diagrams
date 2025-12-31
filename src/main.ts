import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

// Example sources for each diagram type - easy to tweak!
const EXAMPLES = {
  static: `static

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . O . . . . .
. . . O X X . . .
. . X X O . . . .
. . + . O . + . .
. . . . . . . . .
. . . . . . . . .
`,

  'ignore-rules': `static

. O . .
O X O .
. O . .
. . . .

ignore-rules: true`,

  freeplay: `freeplay

size: 9`,

  problem: `problem

a O X e f X .
b c d O O X .
O O O X X X .
X X X . . . .
. . . . . . .

size: 19
to-play: black

sequences:
  f>d>e>b
  c>b>a
  a>b>f>d
  d>c
  *>d

solutions:
  a>b>d`
}

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!

// Create example buttons
const buttonContainer = document.createElement('div')
buttonContainer.className = 'form-row'

// Add label
const label = document.createElement('span')
label.textContent = 'Load sample: '
label.style.marginRight = '0.5rem'
buttonContainer.appendChild(label)

Object.keys(EXAMPLES).forEach(exampleType => {
  const button = document.createElement('button')
  button.textContent = exampleType.charAt(0).toUpperCase() + exampleType.slice(1)
  button.style.marginRight = '0.5rem'
  button.style.padding = '0.5rem 1rem'
  button.style.cursor = 'pointer'

  button.addEventListener('click', () => {
    textarea.value = EXAMPLES[exampleType as keyof typeof EXAMPLES]
    init('#app', {
      diagramSource: textarea.value
    })
  })

  buttonContainer.appendChild(button)
})

// Insert buttons after the textarea
textarea.parentElement!.insertBefore(buttonContainer, textarea.nextSibling)

// Set initial value to problem example
textarea.value = EXAMPLES.problem

// Initialize diagram with initial source
init('#app', {
  diagramSource: textarea.value
})

// Update diagram on input
textarea.addEventListener('input', () => {
  init('#app', {
    diagramSource: textarea.value
  })
})

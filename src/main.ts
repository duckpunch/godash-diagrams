import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!
const initialSource = `problem

A O X . . X .
B . C O O X .
O O O X X X .
X X X . . . .
. . . . . . .

size: 19
to-play: black

solutions:
  A>B>C
  C>B>C
`

// Set initial value
textarea.value = initialSource

// Initialize diagram with initial source
init('#app', {
  diagramSource: initialSource
})

// Update diagram on input
textarea.addEventListener('input', () => {
  init('#app', {
    diagramSource: textarea.value
  })
})

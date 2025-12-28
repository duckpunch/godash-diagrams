import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!
const initialSource = `problem

A O X E F X .
B C D O O X .
O O O X X X .
X X X . . . .
. . . . . . .

size: 19
to-play: black

paths:
  F>D>E>B
  C>B>A

solutions:
  A>B>D
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

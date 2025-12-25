import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!
const initialSource = `static

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . O . . . . .
. . . O X X . . .
. . X X O . . . .
. . + . O . + . .
. . . . . . . . .
. . . . . . . . .

title: Example Board
description: A simple 9x9 position`

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

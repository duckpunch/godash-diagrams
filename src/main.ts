import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!
const initialSource = `problem

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

solutions:
  a>b>d
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

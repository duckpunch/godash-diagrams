import './style.css'
// Import your library (during dev, this imports from src/lib)
import { init } from './lib/index'

// Dark mode functionality
const DARK_MODE_KEY = 'godash-diagrams-dark-mode'

function initDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle')!
  const root = document.documentElement

  // Check for saved preference or system preference
  const savedMode = localStorage.getItem(DARK_MODE_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = savedMode ? savedMode === 'dark' : prefersDark

  // Apply initial mode
  if (isDark) {
    root.classList.add('dark-mode')
    darkModeToggle.textContent = '☀️ Light Mode'
  }

  // Toggle dark mode
  darkModeToggle.addEventListener('click', () => {
    const isDarkMode = root.classList.toggle('dark-mode')
    localStorage.setItem(DARK_MODE_KEY, isDarkMode ? 'dark' : 'light')
    darkModeToggle.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'
  })
}

// Initialize dark mode
initDarkMode()

// Example sources for each diagram type - easy to tweak!
const EXAMPLES = {
  static: `static

. . . . . . . . . X O O . . . . . . .
. . . X . . . . . X O . O . O O X . .
. . O O . X . . O X X O O . O X . . .
. . . + . . . . . + . X X X . + X . .
. . . . . X . . . . X . . . . X X . .
. . O . . . . . . . . . . . . X O O .
. . . . . . . . . . . . . O O O X X X
. . . . . . . . . . . . . . X O O O X
. . . . . . . . . T . . X O O X X X .
. . . + . . . . . + . . O O X + X O .
. . O . . . . . . . . . . . O X X O .
. . . . . . . . . . . . . . O X O X .
. . . . . . . . . . . . O . O X O O .
. . O . . . . . . X . X O . O X . . .
. . . . . . X . O . . X O . O X O . .
. . X + X . . X . + . X O O X O O . .
. . . . . X O X O . O O X X X X O O .
. . . . . . X O . O O . O X X . X O .
. . . . . . . . O . . O . X . X . X .

---
triangle: T`,

  colorful: `static

.  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
.  .  +  .  .  .  +  .  .
.  D  .  O  .  .  .  .  .
.  .  .  rO rX rX .  .  .
.  .  bX bX rO .  A  .  .
.  .  +  bO bO .  +  .  .
.  .  C  .  .  B  .  .  .
.  .  .  .  .  .  .  .  .

---
black: [A, B]
white: [D]
triangle: [C]
area-colors:
  r: red
  b: blue
`,

  freeplay: `freeplay

---
size: 9
color: alternate
numbered: true
`,

  problem: `problem

a O X e f X .
b c d O O X .
O O O X X X .
X X X . . . .
. . . . . . .

---
size: 9
to-play: black
solutions:
  - a>b>d
sequences:
  - f>d>e>b
  - c>b>a
  - a>b>f>d
  - d>c
  - .>d
`,

  replay: `replay

.  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
.  .  1  .  .  .  3  .  .
.  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
.  . 10  8  6  .  .  .  .
.  .  4  7  5  .  2  .  .
. 11  9  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
`
}

const textarea = document.querySelector<HTMLTextAreaElement>('#source-input')!
const lineNumbers = document.querySelector<HTMLDivElement>('#line-numbers')!

// Function to update line numbers
function updateLineNumbers() {
  const lines = textarea.value.split('\n')
  const lineCount = lines.length
  lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')
}

// Sync scroll position between textarea and line numbers
textarea.addEventListener('scroll', () => {
  lineNumbers.scrollTop = textarea.scrollTop
})

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
    updateLineNumbers()
    init('#app', {
      diagramSource: textarea.value
    })
  })

  buttonContainer.appendChild(button)
})

// Insert buttons after the editor container
const editorContainer = document.querySelector('.editor-container')!
editorContainer.parentElement!.insertBefore(buttonContainer, editorContainer.nextSibling)

// Set initial value to problem example
textarea.value = EXAMPLES.static

// Initialize line numbers
updateLineNumbers()

// Initialize diagram with initial source
init('#app', {
  diagramSource: textarea.value
})

// Update diagram and line numbers on input
textarea.addEventListener('input', () => {
  updateLineNumbers()
  init('#app', {
    diagramSource: textarea.value
  })
})

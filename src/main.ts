import './style.css'
// Import your library (during dev, this imports from src/lib)
import { initDiagram, version } from './lib/index'

console.log(`Godash Diagrams v${version}`)

// Demo: Initialize diagram in the #app element
initDiagram('#app')

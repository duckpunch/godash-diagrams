/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

import { toError } from './render'
import { ValidationError } from './validate'
import type { DiagramType, IDiagram } from './model'
import { DIAGRAM_TYPES, StaticDiagram, FreeplayDiagram, ProblemDiagram, ReplayDiagram } from './model'
import libraryStyles from './ui/library.css?inline'

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'
const STYLE_ID = 'godash-diagrams-styles'

// Store diagram instances for re-rendering on theme change
const diagramRegistry = new Map<Element, IDiagram>()
let themeObserver: MutationObserver | null = null

/**
 * Injects library CSS for UI bar theming (dark/light mode support)
 */
function injectStyles(): void {
  // Check if styles are already injected
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = libraryStyles
  document.head.appendChild(styleEl)
}

/**
 * Sets up theme change observer to re-render diagrams when dark/light mode changes
 */
function setupThemeObserver(): void {
  // Only set up once
  if (themeObserver) {
    return
  }

  themeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // Re-render all diagrams when theme changes
        diagramRegistry.forEach((diagram) => {
          diagram.render()
        })
        break
      }
    }
  })

  // Watch for class changes on root element (where .dark-mode is toggled)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
}

interface DiagramOptions {
  diagramSource?: string
}

function renderDiagram(element: Element, source: string): void {
  const lines = source.split('\n')

  if (lines.length === 0) {
    element.innerHTML = toError('Empty diagram source')
    return
  }

  // Parse first line - must be diagram type
  const diagramType = lines[0].trim()

  // Create and render appropriate diagram
  try {
    let diagram: IDiagram
    switch (diagramType as DiagramType) {
      case 'static':
        diagram = new StaticDiagram(element, lines)
        break
      case 'freeplay':
        diagram = new FreeplayDiagram(element, lines)
        break
      case 'problem':
        diagram = new ProblemDiagram(element, lines)
        break
      case 'replay':
        diagram = new ReplayDiagram(element, lines)
        break
      default:
        element.innerHTML = toError(`Unsupported diagram type "${diagramType}". Supported types: ${Object.keys(DIAGRAM_TYPES).join(', ')}`)
        return
    }

    // Store diagram instance for theme change re-rendering
    diagramRegistry.set(element, diagram)

    diagram.render()
  } catch (error) {
    if (error instanceof ValidationError) {
      element.innerHTML = toError(error.message)
    } else {
      element.innerHTML = toError(error instanceof Error ? error.message : String(error))
    }
  }
}

export function init(selector?: string, options?: DiagramOptions): void {
  // Inject library styles for dark/light mode support
  injectStyles()

  // Set up theme change observer for automatic re-rendering
  setupThemeObserver()

  const query = selector ?? DEFAULT_DIAGRAM_CLASS
  const elements = document.querySelectorAll(query)

  if (elements.length === 0) {
    throw new Error(`No elements found for selector: ${query}`)
  }

  elements.forEach((element) => {
    const source = options?.diagramSource ?? element.textContent ?? ''
    renderDiagram(element, source)
  })
}

// Export any other public functions/classes here

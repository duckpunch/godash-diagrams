/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

import { toError } from './render'
import { ValidationError } from './validate'
import type { DiagramType, IDiagram } from './model'
import { DIAGRAM_TYPES, StaticDiagram, FreeplayDiagram, ProblemDiagram, ReplayDiagram } from './model'

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'

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
export { version } from './version'

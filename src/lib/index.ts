/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'

interface DiagramOptions {
  diagramSource?: string
}

function renderError(element: Element, message: string): void {
  element.innerHTML = `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px;">${message}</div>
  `
}

function renderDiagram(element: Element, source: string): void {
  const trimmedSource = source.trim()
  const firstToken = trimmedSource.split(/\s+/)[0]

  if (firstToken !== 'static') {
    renderError(element, 'Unsupported diagram type')
    return
  }

  element.innerHTML = `
    <div>Provided source</div>
    <pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto;">${source}</pre>
  `
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

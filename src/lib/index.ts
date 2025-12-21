/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'

export function init(selector?: string): void {
  const query = selector ?? DEFAULT_DIAGRAM_CLASS
  const elements = document.querySelectorAll(query)

  if (elements.length === 0) {
    throw new Error(`No elements found for selector: ${query}`)
  }

  elements.forEach((element) => {
    // Your diagram initialization logic here
    element.innerHTML = '<div>Godash Diagram Initialized</div>'
  })
}

// Export any other public functions/classes here
export { version } from './version'

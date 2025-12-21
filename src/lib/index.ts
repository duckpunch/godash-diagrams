/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

export function initDiagram(element: HTMLElement | string): void {
  const target = typeof element === 'string'
    ? document.querySelector(element)
    : element

  if (!target) {
    throw new Error('Target element not found')
  }

  // Your diagram initialization logic here
  target.innerHTML = '<div>Godash Diagram Initialized</div>'
}

// Export any other public functions/classes here
export { version } from './version'

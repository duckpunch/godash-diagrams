/**
 * Test helper utilities for diagram tests
 */

/**
 * Create a mock DOM element for diagram rendering
 */
export function createMockElement(): HTMLDivElement {
  return document.createElement('div')
}

/**
 * Parse a multi-line board definition string into lines array
 * Ensures there's a blank line before --- separator for proper YAML parsing
 */
export function createBoardLines(board: string): string[] {
  const lines = board.trim().split('\n')

  // Find --- separator and ensure blank line before it
  const separatorIndex = lines.findIndex(line => line.trim() === '---')
  if (separatorIndex > 0 && lines[separatorIndex - 1].trim() !== '') {
    lines.splice(separatorIndex, 0, '')
  }

  return lines
}

/**
 * Wait for a specified number of milliseconds (for async tests)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Simulate a click on an SVG board at the specified row and column coordinates
 * JSDOM doesn't fully implement SVG coordinate systems, so we need to mock
 * getScreenCTM and createSVGPoint
 */
export function simulateBoardClick(svg: SVGSVGElement, row: number, col: number): void {
  const cellSize = 30
  const margin = cellSize
  const x = margin + col * cellSize
  const y = margin + row * cellSize

  // Mock getScreenCTM to return identity matrix inverse
  svg.getScreenCTM = () =>
    ({
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix,
    }) as DOMMatrix

  // Mock createSVGPoint to return a point that transforms to the click coordinates
  svg.createSVGPoint = () =>
    ({
      x: 0,
      y: 0,
      matrixTransform: () => ({ x, y }) as DOMPoint,
    }) as DOMPoint

  // Create and dispatch the click event
  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    bubbles: true,
  })

  svg.dispatchEvent(event)
}

/**
 * Click a button by its ID
 */
export function clickButton(buttonId: string): void {
  const button = document.getElementById(buttonId)
  if (!button) {
    throw new Error(`Button with ID ${buttonId} not found`)
  }
  button.click()
}

/**
 * Find a button by ID prefix (useful for randomly generated IDs)
 */
export function findButtonByPrefix(container: Element, prefix: string): HTMLElement | null {
  return container.querySelector(`[id^="${prefix}-"]`)
}

/**
 * Click a button by ID prefix (useful for randomly generated IDs)
 */
export function clickButtonByPrefix(container: Element, prefix: string): void {
  const button = findButtonByPrefix(container, prefix)
  if (!button) {
    throw new Error(`Button with ID prefix ${prefix}- not found`)
  }
  button.click()
}

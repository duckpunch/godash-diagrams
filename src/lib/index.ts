/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

import { Board, Move, Coordinate, BLACK, WHITE, EMPTY, toString as godashToString } from 'godash'

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'

interface DiagramOptions {
  diagramSource?: string
}

function renderError(element: Element, message: string): void {
  element.innerHTML = `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px;">${message}</div>
  `
}

function renderBoardSvg(board: any, dimensions: number): string {
  const cellSize = 30
  const margin = 20
  const stoneRadius = cellSize * 0.4
  const svgSize = (dimensions - 1) * cellSize + margin * 2

  let svg = `<svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">`

  // Background
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="#dcb35c"/>`

  // Grid lines
  const gridEnd = margin + (dimensions - 1) * cellSize
  for (let i = 0; i < dimensions; i++) {
    const pos = margin + i * cellSize
    // Vertical lines
    svg += `<line x1="${pos}" y1="${margin}" x2="${pos}" y2="${gridEnd}" stroke="#000" stroke-width="1"/>`
    // Horizontal lines
    svg += `<line x1="${margin}" y1="${pos}" x2="${gridEnd}" y2="${pos}" stroke="#000" stroke-width="1"/>`
  }

  // Star points (for standard sizes)
  const starPoints: [number, number][] = []
  if (dimensions === 9) {
    starPoints.push([2, 2], [2, 6], [4, 4], [6, 2], [6, 6])
  } else if (dimensions === 13) {
    starPoints.push([3, 3], [3, 9], [6, 6], [9, 3], [9, 9])
  } else if (dimensions === 19) {
    starPoints.push([3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15])
  }

  for (const [row, col] of starPoints) {
    const x = margin + col * cellSize
    const y = margin + row * cellSize
    svg += `<circle cx="${x}" cy="${y}" r="3" fill="#000"/>`
  }

  // Stones
  for (let row = 0; row < dimensions; row++) {
    for (let col = 0; col < dimensions; col++) {
      const color = board.moves.get(Coordinate(row, col), EMPTY)
      if (color !== EMPTY) {
        const x = margin + col * cellSize
        const y = margin + row * cellSize

        if (color === BLACK) {
          // Black stone
          svg += `<circle cx="${x}" cy="${y}" r="${stoneRadius}" fill="#000" stroke="#000" stroke-width="1"/>`
        } else if (color === WHITE) {
          // White stone
          svg += `<circle cx="${x}" cy="${y}" r="${stoneRadius}" fill="#fff" stroke="#000" stroke-width="1"/>`
        }
      }
    }
  }

  svg += '</svg>'
  return svg
}

function renderDiagram(element: Element, source: string): void {
  const lines = source.split('\n')

  if (lines.length === 0) {
    renderError(element, 'Empty diagram source')
    return
  }

  // Parse first line - must be diagram type
  const diagramType = lines[0].trim()
  if (diagramType !== 'static') {
    renderError(element, 'Unsupported diagram type')
    return
  }

  // Find where board definition starts (skip empty lines after type)
  let boardStartIndex = 1
  while (boardStartIndex < lines.length && lines[boardStartIndex].trim() === '') {
    boardStartIndex++
  }

  if (boardStartIndex >= lines.length) {
    renderError(element, 'No board definition found')
    return
  }

  // Collect consecutive non-empty board rows
  const boardRows: string[] = []
  for (let i = boardStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      // Empty line ends board definition
      break
    }
    boardRows.push(line)
  }

  if (boardRows.length === 0) {
    renderError(element, 'Board definition is empty')
    return
  }

  // Validate all rows have same number of non-space characters
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    renderError(element, 'All board rows must have the same number of non-space characters')
    return
  }

  // Validate square board (rows === columns)
  if (boardRows.length !== firstColumnCount) {
    renderError(element, `Board must be square (found ${boardRows.length} rows but ${firstColumnCount} columns)`)
    return
  }

  // Parse board and create godash Board
  const dimensions = boardRows.length
  const moves: any[] = []

  for (let row = 0; row < dimensions; row++) {
    const line = boardRows[row]
    let col = 0
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === ' ') continue

      // Validate character
      if (!/^[.+XOxo]$/.test(char)) {
        renderError(element, `Invalid board character '${char}' at row ${row + 1}, col ${col + 1}. Valid characters: . or + (empty), X or x (black stone), O or o (white stone)`)
        return
      }

      let color = EMPTY
      if (char === 'X' || char === 'x') {
        // X = black stones in our format, BLACK in godash
        color = BLACK
      } else if (char === 'O' || char === 'o') {
        // O = white stones in our format, WHITE in godash
        color = WHITE
      } else if (char === '.' || char === '+') {
        // . or + = empty
        color = EMPTY
      }

      if (color !== EMPTY) {
        moves.push(Move(Coordinate(row, col), color))
      }
      col++
    }
  }

  // Create godash board
  const board = Board(dimensions, ...moves)

  // Generate SVG
  const boardSvg = renderBoardSvg(board, dimensions)

  // Render
  element.innerHTML = `
    <div>Provided source</div>
    <pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto;">${source}</pre>
    <div style="margin-top: 1rem;">Board</div>
    <div style="margin-top: 0.5rem;">${boardSvg}</div>
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

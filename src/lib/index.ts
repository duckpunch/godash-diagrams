/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

import { Board, Move, Coordinate, BLACK, WHITE, EMPTY } from 'godash'
import { boardToSvg, toError } from './render'

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
  if (diagramType !== 'static') {
    element.innerHTML = toError('Unsupported diagram type')
    return
  }

  // Find where board definition starts (skip empty lines after type)
  let boardStartIndex = 1
  while (boardStartIndex < lines.length && lines[boardStartIndex].trim() === '') {
    boardStartIndex++
  }

  if (boardStartIndex >= lines.length) {
    element.innerHTML = toError('No board definition found')
    return
  }

  // Collect consecutive non-empty board rows
  const boardRows: string[] = []
  let boardEndIndex = boardStartIndex
  for (let i = boardStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      // Empty line ends board definition
      boardEndIndex = i
      break
    }
    boardRows.push(line)
    boardEndIndex = i + 1
  }

  if (boardRows.length === 0) {
    element.innerHTML = toError('Board definition is empty')
    return
  }

  // Parse options (YAML-like syntax after board definition)
  const parsedOptions: Record<string, string> = {}
  for (let i = boardEndIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue // Skip empty lines

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsedOptions[key] = value
    }
  }

  // Validate all rows have same number of non-space characters
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    element.innerHTML = toError('All board rows must have the same number of non-space characters')
    return
  }

  // Validate square board (rows === columns)
  if (boardRows.length !== firstColumnCount) {
    element.innerHTML = toError(`Board must be square (found ${boardRows.length} rows but ${firstColumnCount} columns)`)
    return
  }

  // Parse board and create godash Board
  const dimensions = boardRows.length
  const moves: Move[] = []

  for (let row = 0; row < dimensions; row++) {
    const line = boardRows[row]
    let col = 0
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === ' ') continue

      // Validate character
      if (!/^[.+XOxo]$/.test(char)) {
        element.innerHTML = toError(`Invalid board character '${char}' at row ${row + 1}, col ${col + 1}. Valid characters: . or + (empty), X or x (black stone), O or o (white stone)`)
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
  const boardSvg = boardToSvg(board)

  // Render
  let output = boardSvg

  // Display parsed options (for debugging)
  if (Object.keys(parsedOptions).length > 0) {
    output += `<div style="margin-top: 1rem;">Parsed Options:</div>`
    output += `<pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${JSON.stringify(parsedOptions, null, 2)}</pre>`
  }

  element.innerHTML = output
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

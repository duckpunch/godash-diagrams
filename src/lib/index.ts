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

function parseBoardRows(lines: string[], startIndex: number): [number, number] {
  // Collect consecutive non-empty board rows
  const boardRows: string[] = []
  let endIndex = startIndex

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      // Empty line ends board definition
      endIndex = i
      break
    }
    boardRows.push(line)
    endIndex = i + 1
  }

  if (boardRows.length === 0) {
    throw new Error('Board definition is empty')
  }

  // Validate all rows have same number of non-space characters (rectangle)
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    throw new Error('All board rows must have the same number of non-space characters')
  }

  return [startIndex, endIndex]
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

  // Parse board rows
  let boardEndIndex: number
  try {
    [boardStartIndex, boardEndIndex] = parseBoardRows(lines, boardStartIndex)
  } catch (error) {
    element.innerHTML = toError(error instanceof Error ? error.message : String(error))
    return
  }

  // Get board rows for further processing
  const boardRows = lines.slice(boardStartIndex, boardEndIndex)

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

  // Get row and column counts
  const rowCount = boardRows.length
  const columnCount = boardRows[0].replace(/\s/g, '').length
  const isSquare = rowCount === columnCount

  // Validate size option if present
  let boardSize: number | undefined
  if (parsedOptions.size) {
    const sizeValue = parseInt(parsedOptions.size, 10)
    if (isNaN(sizeValue) || sizeValue <= 1 || sizeValue > 19) {
      element.innerHTML = toError('Size must be a positive integer greater than 1 and less than or equal to 19')
      return
    }
    boardSize = sizeValue

    // Validate row/column counts don't exceed size
    if (rowCount > boardSize || columnCount > boardSize) {
      element.innerHTML = toError(`Board dimensions (${rowCount}x${columnCount}) exceed specified size (${boardSize})`)
      return
    }
  }

  // If rectangle (not square), size is required
  if (!isSquare && !boardSize) {
    element.innerHTML = toError(`Rectangle boards require a "size" option (found ${rowCount}x${columnCount} board)`)
    return
  }

  // For square boards without size option, use board dimensions
  if (!boardSize) {
    boardSize = rowCount
  }

  // Parse board and create godash Board
  const dimensions = boardSize
  const moves: Move[] = []

  for (let row = 0; row < rowCount; row++) {
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
  const boardSvg = boardToSvg(board, rowCount, columnCount)

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

import { Board, Move, Coordinate, BLACK, WHITE, EMPTY } from 'godash'
import type { ParsedBoard } from './model'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateBoardRows(lines: string[], startIndex: number): [number, number] {
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
    throw new ValidationError('Board definition is empty')
  }

  // Validate all rows have same number of non-space characters (rectangle)
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    throw new ValidationError('All board rows must have the same number of non-space characters')
  }

  return [startIndex, endIndex]
}

export function validateBoard(lines: string[], allowEmpty: boolean = false): ParsedBoard {
  // Find where board definition starts (skip empty lines after type)
  let boardStartIndex = 1
  while (boardStartIndex < lines.length && lines[boardStartIndex].trim() === '') {
    boardStartIndex++
  }

  if (boardStartIndex >= lines.length) {
    throw new ValidationError('No board definition or options found')
  }

  // Try to collect board rows (don't throw if empty - might be options-only)
  const boardRows: string[] = []
  let boardEndIndex = boardStartIndex

  for (let i = boardStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      // Empty line ends board definition
      boardEndIndex = i
      break
    }

    // Check if this line looks like an option (has colon)
    if (line.indexOf(':') > 0) {
      // This is the start of options, board definition has ended
      boardEndIndex = i
      break
    }

    boardRows.push(line)
    boardEndIndex = i + 1
  }

  // Parse options (YAML-like syntax after board definition)
  const parsedOptions: Record<string, string> = {}
  for (let i = boardEndIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsedOptions[key] = value
    }
  }

  // Validate size option if present
  let boardSize: number | undefined
  if (parsedOptions.size) {
    const sizeValue = parseInt(parsedOptions.size, 10)
    if (isNaN(sizeValue) || sizeValue <= 1 || sizeValue > 19) {
      throw new ValidationError('Size must be a positive integer greater than 1 and less than or equal to 19')
    }
    boardSize = sizeValue
  }

  // Handle empty board case
  if (boardRows.length === 0) {
    if (!allowEmpty) {
      throw new ValidationError('Board definition is required')
    }

    if (!boardSize) {
      throw new ValidationError('Empty board requires a "size" option')
    }

    // Create empty board with specified size
    const board = Board(boardSize)
    return {
      board,
      rowCount: boardSize,
      columnCount: boardSize,
      configStartIndex: boardEndIndex
    }
  }

  // Validate all rows have same number of non-space characters (rectangle)
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    throw new ValidationError('All board rows must have the same number of non-space characters')
  }

  // Get row and column counts
  const rowCount = boardRows.length
  const columnCount = boardRows[0].replace(/\s/g, '').length
  const isSquare = rowCount === columnCount

  // Validate row/column counts don't exceed size if specified
  if (boardSize && (rowCount > boardSize || columnCount > boardSize)) {
    throw new ValidationError(`Board dimensions (${rowCount}x${columnCount}) exceed specified size (${boardSize})`)
  }

  // If rectangle (not square), size is required
  if (!isSquare && !boardSize) {
    throw new ValidationError(`Rectangle boards require a "size" option (found ${rowCount}x${columnCount} board)`)
  }

  // For square boards without size option, use board dimensions
  if (!boardSize) {
    boardSize = rowCount
  }

  // Parse board and create moves
  const moves: Move[] = []
  for (let row = 0; row < boardRows.length; row++) {
    const line = boardRows[row]
    let col = 0
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === ' ') continue

      // Validate character
      if (!/^[.+XOxo]$/.test(char)) {
        throw new ValidationError(`Invalid board character '${char}' at row ${row + 1}, col ${col + 1}. Valid characters: . or + (empty), X or x (black stone), O or o (white stone)`)
      }

      let color = EMPTY
      if (char === 'X' || char === 'x') {
        color = BLACK
      } else if (char === 'O' || char === 'o') {
        color = WHITE
      } else if (char === '.' || char === '+') {
        color = EMPTY
      }

      if (color !== EMPTY) {
        moves.push(Move(Coordinate(row, col), color))
      }
      col++
    }
  }

  // Create godash board
  const board = Board(boardSize, ...moves)

  return {
    board,
    rowCount,
    columnCount,
    configStartIndex: boardEndIndex
  }
}

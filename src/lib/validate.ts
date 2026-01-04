import { Board, Move, Coordinate, BLACK, WHITE, EMPTY, placeStone } from 'godash'
import type { ParsedBoard } from './model'
import { parseYaml, extractYamlSection } from './parseYaml'

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

export interface ValidateBoardOptions {
  allowEmpty?: boolean
  validateCharacters?: boolean
  ignoreRules?: boolean
  validPrefixes?: Set<string>  // Set of valid area prefixes (e.g., 'r', 'b', 'g')
}

export function validateBoard(lines: string[], options: ValidateBoardOptions = {}): ParsedBoard {
  const { allowEmpty = false, validateCharacters = true, ignoreRules = false, validPrefixes } = options
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

    // Check for YAML separator
    if (line.trim() === '---') {
      // This is the start of YAML config, board definition has ended
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

  // Parse YAML configuration
  const yamlContent = extractYamlSection(lines, boardEndIndex)
  const config = yamlContent ? parseYaml(yamlContent) : {}

  // Validate size option if present
  let boardSize: number | undefined
  if (config.size) {
    const sizeOption = config.size
    if (Array.isArray(sizeOption) || typeof sizeOption === 'object') {
      throw new ValidationError('Size option cannot have multiple values')
    }
    if (typeof sizeOption === 'boolean') {
      throw new ValidationError('Size must be a number')
    }
    const sizeValue = parseInt(sizeOption, 10)
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
      configStartIndex: boardEndIndex,
      otherMarks: {},
      areaPrefixes: new Map()
    }
  }

  // Parse board rows by splitting on whitespace
  const boardTokens: string[][] = []
  for (const row of boardRows) {
    const tokens = row.trim().split(/\s+/).filter(t => t.length > 0)
    boardTokens.push(tokens)
  }

  // Validate all rows have same number of tokens (rectangle)
  const columnCounts = boardTokens.map(tokens => tokens.length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    throw new ValidationError('All board rows must have the same number of positions')
  }

  // Get row and column counts
  const rowCount = boardTokens.length
  const columnCount = firstColumnCount
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
  const otherMarks: Record<string, Coordinate[]> = {}
  const areaPrefixes = new Map<string, string>()

  for (let row = 0; row < boardTokens.length; row++) {
    const tokens = boardTokens[row]
    for (let col = 0; col < tokens.length; col++) {
      let token = tokens[col]
      let prefix: string | undefined

      // Check for area prefix if validPrefixes is provided
      // Only extract prefix if token is longer than 1 character and starts with a valid prefix
      if (validPrefixes && token.length > 1) {
        const potentialPrefix = token[0]
        if (validPrefixes.has(potentialPrefix)) {
          prefix = potentialPrefix
          token = token.slice(1)  // Remove prefix, process rest normally
        }
      }

      // Store prefix if present
      if (prefix) {
        const coordKey = `${row},${col}`
        areaPrefixes.set(coordKey, prefix)
      }

      // Check if token is a known board character
      const isKnownToken = /^[.+XOxo]$/.test(token)

      if (validateCharacters && !isKnownToken) {
        throw new ValidationError(`Invalid board token '${token}' at row ${row + 1}, col ${col + 1}. Valid tokens: . or + (empty), X or x (black stone), O or o (white stone)`)
      }

      let color = EMPTY
      if (token === 'X' || token === 'x') {
        color = BLACK
      } else if (token === 'O' || token === 'o') {
        color = WHITE
      } else if (token === '.' || token === '+') {
        color = EMPTY
      } else {
        // Other mark - collect if validation is off
        if (!validateCharacters) {
          if (!otherMarks[token]) {
            otherMarks[token] = []
          }
          otherMarks[token].push(Coordinate(row, col))
        }
      }

      if (color !== EMPTY) {
        moves.push(Move(Coordinate(row, col), color))
      }
    }
  }

  // Create godash board
  let board: Board
  if (ignoreRules) {
    // Use placeStone to ignore Go rules
    board = Board(boardSize)
    for (const move of moves) {
      board = placeStone(board, move.coordinate, move.color)
    }
  } else {
    // Use normal Board constructor which respects rules
    board = Board(boardSize, ...moves)
  }

  return {
    board,
    rowCount,
    columnCount,
    configStartIndex: boardEndIndex,
    otherMarks,
    areaPrefixes
  }
}

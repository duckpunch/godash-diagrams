import type { Color } from 'godash'
import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove } from 'godash'
import { validateBoard, parseOptions } from './validate'
import { boardToSvg } from './render'

export interface ParsedBoard {
  board: Board
  rowCount: number
  columnCount: number
  configStartIndex: number
  otherMarks: Record<string, Coordinate[]>
}

export interface IDiagram {
  render(): void
}

export class StaticDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private lines: string[]
  private element: Element

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.lines = lines
    this.parsedBoard = validateBoard(lines, {})
  }

  render(): void {
    const element = this.element

    const { board, rowCount, columnCount, configStartIndex } = this.parsedBoard

    // Parse options for display (YAML-like syntax after board definition)
    const parsedOptions = parseOptions(this.lines, configStartIndex)

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
}

type HistoryEntry =
  | { type: 'move'; move: Move }
  | { type: 'pass'; color: Color }

export class ProblemDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private lines: string[]
  private element: Element
  public toPlay: Color

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.lines = lines
    // Don't allow empty boards, don't validate characters
    const parsed = validateBoard(lines, { allowEmpty: false, validateCharacters: false })

    // Validate that marks are unique (only one coordinate per mark)
    for (const [mark, coordinates] of Object.entries(parsed.otherMarks)) {
      if (coordinates.length > 1) {
        throw new Error(`Mark '${mark}' appears at multiple coordinates. Each mark must be unique.`)
      }
    }

    // Parse options for black and white marks
    const parsedOptions = parseOptions(lines, parsed.configStartIndex)

    // Parse black and white marks into arrays
    const blackOption = parsedOptions.black
    const whiteOption = parsedOptions.white

    const blackMarks = blackOption
      ? (Array.isArray(blackOption) ? blackOption : blackOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []
    const whiteMarks = whiteOption
      ? (Array.isArray(whiteOption) ? whiteOption : whiteOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []

    // Validate that black and white marks are disjoint sets
    const whiteSet = new Set(whiteMarks)
    const intersection = blackMarks.filter(mark => whiteSet.has(mark))
    if (intersection.length > 0) {
      throw new Error(`Marks cannot appear in both black and white: ${intersection.join(', ')}`)
    }

    // Validate that all marks appear in otherMarks
    const availableMarks = new Set(Object.keys(parsed.otherMarks))
    for (const mark of blackMarks) {
      if (!availableMarks.has(mark)) {
        throw new Error(`Black mark '${mark}' does not appear in the board`)
      }
    }
    for (const mark of whiteMarks) {
      if (!availableMarks.has(mark)) {
        throw new Error(`White mark '${mark}' does not appear in the board`)
      }
    }

    // Parse to-play option (default to black)
    const toPlayOption = parsedOptions['to-play']
    const toPlayValue = toPlayOption
      ? (Array.isArray(toPlayOption) ? toPlayOption[0] : toPlayOption).toLowerCase()
      : ''
    if (toPlayValue && toPlayValue !== 'black' && toPlayValue !== 'white') {
      throw new Error(`Invalid to-play value '${toPlayValue}'. Must be 'black' or 'white'`)
    }
    this.toPlay = toPlayValue === 'white' ? WHITE : BLACK

    // Add black and white marks as stones to the board
    let board = parsed.board
    for (const mark of blackMarks) {
      const coordinates = parsed.otherMarks[mark]
      for (const coord of coordinates) {
        board = addMove(board, Move(coord, BLACK))
      }
    }
    for (const mark of whiteMarks) {
      const coordinates = parsed.otherMarks[mark]
      for (const coord of coordinates) {
        board = addMove(board, Move(coord, WHITE))
      }
    }

    // Update parsed board with the new board state
    this.parsedBoard = { ...parsed, board }
  }

  render(): void {
    const element = this.element
    const { board, rowCount, columnCount, configStartIndex } = this.parsedBoard

    // Parse options for display (YAML-like syntax after board definition)
    const parsedOptions = parseOptions(this.lines, configStartIndex)

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
}

export class FreeplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private lines: string[]
  private element: Element
  private currentBoard: Board
  private initialBoard: Board
  private history: HistoryEntry[]
  private currentMoveIndex: number // -1 means no moves yet
  private isBlackTurn: boolean

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.lines = lines
    this.parsedBoard = validateBoard(lines, { allowEmpty: true })
    this.initialBoard = this.parsedBoard.board
    this.currentBoard = this.parsedBoard.board
    this.history = []
    this.currentMoveIndex = -1
    this.isBlackTurn = true
  }

  private rebuildBoard(): void {
    // Start with initial board
    let board = this.initialBoard

    // Apply moves up to currentMoveIndex
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const entry = this.history[i]
      if (entry.type === 'move') {
        board = addMove(board, entry.move)
      }
      // Pass moves don't change the board
    }

    this.currentBoard = board

    // Update whose turn it is based on history
    if (this.currentMoveIndex === -1) {
      this.isBlackTurn = true
    } else {
      const lastEntry = this.history[this.currentMoveIndex]
      const lastColor = lastEntry.type === 'move' ? lastEntry.move.color : lastEntry.color
      this.isBlackTurn = lastColor === WHITE
    }
  }

  private undo(): void {
    if (this.currentMoveIndex >= 0) {
      this.currentMoveIndex--
      this.rebuildBoard()
      this.render()
    }
  }

  private redo(): void {
    if (this.currentMoveIndex < this.history.length - 1) {
      this.currentMoveIndex++
      this.rebuildBoard()
      this.render()
    }
  }

  private pass(): void {
    // Truncate history if we're not at the end
    this.history = this.history.slice(0, this.currentMoveIndex + 1)

    // Add pass to history
    const color = this.isBlackTurn ? BLACK : WHITE
    this.history.push({ type: 'pass', color })
    this.currentMoveIndex++

    // Toggle turn
    this.isBlackTurn = !this.isBlackTurn

    this.render()
  }

  private reset(): void {
    this.history = []
    this.currentMoveIndex = -1
    this.currentBoard = this.initialBoard
    this.isBlackTurn = true
    this.render()
  }

  render(): void {
    const element = this.element

    const { rowCount, columnCount, configStartIndex } = this.parsedBoard

    // Parse options for display (YAML-like syntax after board definition)
    const parsedOptions = parseOptions(this.lines, configStartIndex)

    // Generate SVG using current board state
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount)

    // Create container with turn indicator, SVG, and buttons
    const turnInfoId = `turn-info-${Math.random().toString(36).substr(2, 9)}`
    const undoButtonId = `undo-${Math.random().toString(36).substr(2, 9)}`
    const redoButtonId = `redo-${Math.random().toString(36).substr(2, 9)}`
    const passButtonId = `pass-${Math.random().toString(36).substr(2, 9)}`
    const resetButtonId = `reset-${Math.random().toString(36).substr(2, 9)}`

    let output = `<div class="freeplay-container">`
    output += `<div id="${turnInfoId}" style="margin-bottom: 1rem; padding: 0.5rem; font-weight: 600; font-size: 1.1rem;">${this.isBlackTurn ? 'Black' : 'White'} to play</div>`
    output += boardSvg

    // Control buttons
    const buttonStyle = 'padding: 0.5rem 1rem; margin: 0.5rem 0.25rem; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.9rem;'
    const disabledStyle = 'padding: 0.5rem 1rem; margin: 0.5rem 0.25rem; border: 1px solid #ccc; border-radius: 4px; background: #f0f0f0; cursor: not-allowed; font-size: 0.9rem; color: #999;'

    output += `<div style="margin-top: 1rem;">`
    output += `<button id="${undoButtonId}" style="${this.currentMoveIndex >= 0 ? buttonStyle : disabledStyle}" ${this.currentMoveIndex < 0 ? 'disabled' : ''}>← Undo</button>`
    output += `<button id="${redoButtonId}" style="${this.currentMoveIndex < this.history.length - 1 ? buttonStyle : disabledStyle}" ${this.currentMoveIndex >= this.history.length - 1 ? 'disabled' : ''}>Redo →</button>`
    output += `<button id="${passButtonId}" style="${buttonStyle}">Pass</button>`
    output += `<button id="${resetButtonId}" style="${buttonStyle}">Reset</button>`
    output += `</div>`

    output += `</div>`

    // Display parsed options (for debugging)
    if (Object.keys(parsedOptions).length > 0) {
      output += `<div style="margin-top: 1rem;">Parsed Options:</div>`
      output += `<pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${JSON.stringify(parsedOptions, null, 2)}</pre>`
    }

    element.innerHTML = output

    // Add click handler to SVG
    const svg = element.querySelector('svg')
    const undoButton = document.getElementById(undoButtonId)
    const redoButton = document.getElementById(redoButtonId)
    const passButton = document.getElementById(passButtonId)
    const resetButton = document.getElementById(resetButtonId)

    if (svg) {
      svg.style.cursor = 'pointer'

      svg.addEventListener('click', (event: Event) => {
        const mouseEvent = event as MouseEvent
        const rect = svg.getBoundingClientRect()
        const x = mouseEvent.clientX - rect.left
        const y = mouseEvent.clientY - rect.top

        // Convert to board coordinates
        const cellSize = 30
        const margin = cellSize
        const col = Math.round((x - margin) / cellSize)
        const row = Math.round((y - margin) / cellSize)

        // Validate coordinates are within board bounds
        if (row >= 0 && row < rowCount && col >= 0 && col < columnCount) {
          const coordinate = Coordinate(row, col)
          const color = this.isBlackTurn ? BLACK : WHITE
          const move = Move(coordinate, color)

          // Check if move is legal
          if (isLegalMove(this.currentBoard, move)) {
            // Truncate history if we're not at the end
            this.history = this.history.slice(0, this.currentMoveIndex + 1)

            // Add move to history
            this.history.push({ type: 'move', move })
            this.currentMoveIndex++

            // Update board and turn
            this.rebuildBoard()

            // Re-render the diagram
            this.render()
          }
          // Silently ignore illegal moves
        }
        // Silently ignore clicks outside bounds
      })
    }

    // Add button event handlers
    if (undoButton) {
      undoButton.addEventListener('click', () => this.undo())
    }

    if (redoButton) {
      redoButton.addEventListener('click', () => this.redo())
    }

    if (passButton) {
      passButton.addEventListener('click', () => this.pass())
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset())
    }
  }
}

export type Diagram = StaticDiagram | FreeplayDiagram | ProblemDiagram

export const DIAGRAM_TYPES = {
  static: StaticDiagram,
  freeplay: FreeplayDiagram,
  problem: ProblemDiagram,
} as const

export type DiagramType = keyof typeof DIAGRAM_TYPES

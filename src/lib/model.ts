import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove } from 'godash'
import { validateBoard } from './validate'
import { boardToSvg } from './render'

export interface ParsedBoard {
  board: Board
  rowCount: number
  columnCount: number
  configStartIndex: number
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
    this.parsedBoard = validateBoard(lines)
  }

  render(): void {
    const element = this.element

    const { board, rowCount, columnCount, configStartIndex } = this.parsedBoard

    // Parse options for display (YAML-like syntax after board definition)
    const parsedOptions: Record<string, string> = {}
    for (let i = configStartIndex; i < this.lines.length; i++) {
      const line = this.lines[i].trim()
      if (line === '') continue

      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()
        parsedOptions[key] = value
      }
    }

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
  private moves: Move[]
  private isBlackTurn: boolean

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.lines = lines
    this.parsedBoard = validateBoard(lines, true)
    this.currentBoard = this.parsedBoard.board
    this.moves = []
    this.isBlackTurn = true
  }

  render(): void {
    const element = this.element

    const { rowCount, columnCount, configStartIndex } = this.parsedBoard

    // Parse options for display (YAML-like syntax after board definition)
    const parsedOptions: Record<string, string> = {}
    for (let i = configStartIndex; i < this.lines.length; i++) {
      const line = this.lines[i].trim()
      if (line === '') continue

      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()
        parsedOptions[key] = value
      }
    }

    // Generate SVG using current board state
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount)

    // Create container with turn indicator, SVG, and click info
    const turnInfoId = `turn-info-${Math.random().toString(36).substr(2, 9)}`
    const clickInfoId = `click-info-${Math.random().toString(36).substr(2, 9)}`
    let output = `<div class="freeplay-container">`
    output += `<div id="${turnInfoId}" style="margin-bottom: 1rem; padding: 0.5rem; font-weight: 600; font-size: 1.1rem;">${this.isBlackTurn ? 'Black' : 'White'} to play</div>`
    output += boardSvg
    output += `<div id="${clickInfoId}" style="margin-top: 1rem; padding: 0.5rem; background: #f9f9f9; border-radius: 4px;">Click on the board to place a stone</div>`
    output += `</div>`

    // Display parsed options (for debugging)
    if (Object.keys(parsedOptions).length > 0) {
      output += `<div style="margin-top: 1rem;">Parsed Options:</div>`
      output += `<pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${JSON.stringify(parsedOptions, null, 2)}</pre>`
    }

    element.innerHTML = output

    // Add click handler to SVG
    const svg = element.querySelector('svg')
    const clickInfo = document.getElementById(clickInfoId)
    const turnInfo = document.getElementById(turnInfoId)

    if (svg && clickInfo && turnInfo) {
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
            // Add move and update board
            this.currentBoard = addMove(this.currentBoard, move)
            this.moves.push(move)

            // Toggle turn
            this.isBlackTurn = !this.isBlackTurn

            // Re-render the diagram
            this.render()
          } else {
            if (clickInfo) {
              clickInfo.innerHTML = `Illegal move at (${row}, ${col})`
              clickInfo.style.background = '#fee2e2'
              clickInfo.style.color = '#991b1b'
            }
          }
        } else {
          if (clickInfo) {
            clickInfo.innerHTML = `Clicked outside board bounds`
          }
        }
      })
    }
  }
}

export type Diagram = StaticDiagram | FreeplayDiagram

export const DIAGRAM_TYPES = {
  static: StaticDiagram,
  freeplay: FreeplayDiagram,
} as const

export type DiagramType = keyof typeof DIAGRAM_TYPES

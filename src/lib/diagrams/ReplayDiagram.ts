import type { Color, Coordinate } from 'godash'
import { Board, Move, BLACK, WHITE, addMove } from 'godash'
import { validateBoard } from '../validate'
import { parseYaml, extractYamlSection } from '../parseYaml'
import { boardToSvg } from '../render'
import { renderCaptureBar, renderMoveCounter } from '../ui/CaptureBar'
import { renderButtonBar } from '../ui/ButtonBar'
import { renderTurnIndicator } from '../ui/TurnIndicator'
import { ICONS } from '../ui/icons'
import type { IDiagram, ParsedBoard, AnnotationInfo, ParsedMove } from './types'
import { countCapturesFromDiff } from './types'
import { StaticDiagram } from './StaticDiagram'
import { FreeplayDiagram } from './FreeplayDiagram'
import { ProblemDiagram } from './ProblemDiagram'

export class ReplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private moveSequence: ParsedMove[]
  private currentMoveIndex: number  // -1 = starting position, 0 = after move 1, etc.
  private currentBoard: Board
  private initialBoard: Board
  private showNumbers: boolean
  private whiteCaptured: number
  private blackCaptured: number

  constructor(element: Element, lines: string[]) {
    this.element = element

    // Parse board - don't allow empty, don't validate characters (need to parse numbers)
    const parsed = validateBoard(lines, { allowEmpty: false, validateCharacters: false })
    this.parsedBoard = parsed
    this.initialBoard = parsed.board
    this.whiteCaptured = 0
    this.blackCaptured = 0

    // Parse YAML configuration
    const yamlContent = extractYamlSection(lines, parsed.configStartIndex)
    const config = yamlContent ? parseYaml(yamlContent) : {}

    // Parse start-color option (default to black)
    const startColorOption = config['start-color']
    const startColorValue = startColorOption
      ? (Array.isArray(startColorOption) ? startColorOption[0] : (typeof startColorOption === 'string' ? startColorOption : 'black')).toLowerCase()
      : 'black'

    if (startColorValue !== 'black' && startColorValue !== 'white') {
      throw new Error(`Invalid start-color value '${startColorValue}'. Must be 'black' or 'white'`)
    }
    const startColor = startColorValue === 'white' ? WHITE : BLACK

    // Parse show-numbers option (default to false)
    const showNumbersOption = config['show-numbers']
    this.showNumbers = showNumbersOption === 'true' || showNumbersOption === true

    // Parse initial-move option (default to 0)
    const initialMoveOption = config['initial-move']
    let initialMove = 0
    if (initialMoveOption) {
      const initialMoveValue = Array.isArray(initialMoveOption) ? initialMoveOption[0] : (typeof initialMoveOption === 'string' ? initialMoveOption : '0')
      initialMove = parseInt(initialMoveValue, 10)
      if (isNaN(initialMove) || initialMove < 0) {
        throw new Error(`Invalid initial-move value '${initialMoveValue}'. Must be a non-negative integer`)
      }
    }

    // Build move sequence from otherMarks
    this.moveSequence = this.buildMoveSequence(parsed.otherMarks, startColor)

    // Validate initial-move is within bounds
    if (initialMove > this.moveSequence.length) {
      throw new Error(`initial-move ${initialMove} exceeds number of moves (${this.moveSequence.length})`)
    }

    // Set current move index (subtract 1 because index 0 = after move 1)
    this.currentMoveIndex = initialMove - 1
    this.currentBoard = this.initialBoard

    // Build initial board state
    this.rebuildBoard()
  }

  private buildMoveSequence(otherMarks: Record<string, Coordinate[]>, startColor: Color): ParsedMove[] {
    // Extract all numbered marks
    const numberedMarks: Array<{ number: number, coordinate: Coordinate }> = []

    for (const [mark, coordinates] of Object.entries(otherMarks)) {
      // Try to parse as number
      const num = parseInt(mark, 10)
      if (!isNaN(num) && num.toString() === mark) {
        // Valid number
        if (num <= 0) {
          throw new Error(`Move numbers must be positive (found ${num})`)
        }
        if (coordinates.length > 1) {
          throw new Error(`Move number ${num} appears at multiple positions`)
        }
        numberedMarks.push({ number: num, coordinate: coordinates[0] })
      }
    }

    // Sort by move number
    numberedMarks.sort((a, b) => a.number - b.number)

    // Validate consecutive sequence (1, 2, 3, ...)
    if (numberedMarks.length === 0) {
      throw new Error('Replay diagram must have at least one numbered move')
    }

    for (let i = 0; i < numberedMarks.length; i++) {
      const expected = i + 1
      const actual = numberedMarks[i].number
      if (actual !== expected) {
        throw new Error(`Move numbers must be consecutive starting from 1 (expected ${expected}, found ${actual})`)
      }
    }

    // Build ParsedMove array with colors
    const moves: ParsedMove[] = []
    for (const { number, coordinate } of numberedMarks) {
      // Odd moves are startColor, even moves are opposite
      const color = (number % 2 === 1) ? startColor : (startColor === BLACK ? WHITE : BLACK)
      moves.push({ moveNumber: number, coordinate, color })
    }

    return moves
  }

  private rebuildBoard(): void {
    let board = this.initialBoard

    // Reset capture counts
    this.whiteCaptured = 0
    this.blackCaptured = 0

    // Apply moves up to currentMoveIndex
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const move = this.moveSequence[i]
      const boardBefore = board
      board = addMove(board, Move(move.coordinate, move.color))

      // Count captures
      const captures = countCapturesFromDiff(boardBefore, board)
      this.whiteCaptured += captures.whiteCaptured
      this.blackCaptured += captures.blackCaptured
    }

    this.currentBoard = board
  }

  private goToMove(index: number): void {
    this.currentMoveIndex = index
    this.rebuildBoard()
    this.render()
  }

  private next(): void {
    if (this.currentMoveIndex < this.moveSequence.length - 1) {
      this.goToMove(this.currentMoveIndex + 1)
    }
  }

  private previous(): void {
    if (this.currentMoveIndex >= 0) {
      this.goToMove(this.currentMoveIndex - 1)
    }
  }

  private first(): void {
    this.goToMove(-1)
  }

  private last(): void {
    this.goToMove(this.moveSequence.length - 1)
  }

  render(): void {
    const element = this.element
    const { rowCount, columnCount } = this.parsedBoard

    // Build annotations map if show-numbers is enabled
    const annotations = new Map<string, AnnotationInfo>()
    if (this.showNumbers) {
      // Add move numbers as text annotations for visible moves
      for (let i = 0; i <= this.currentMoveIndex; i++) {
        const move = this.moveSequence[i]
        const key = `${move.coordinate.x},${move.coordinate.y}`
        annotations.set(key, {
          label: String(move.moveNumber),
          shape: 'text'
        })
      }
    }

    // Get last move for marker
    let lastMove: Coordinate | undefined
    if (this.currentMoveIndex >= 0) {
      lastMove = this.moveSequence[this.currentMoveIndex].coordinate
    }

    // Generate SVG
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount, annotations, lastMove)

    // Create UI with move counter and navigation buttons
    const firstButtonId = `first-${Math.random().toString(36).substr(2, 9)}`
    const prevButtonId = `prev-${Math.random().toString(36).substr(2, 9)}`
    const nextButtonId = `next-${Math.random().toString(36).substr(2, 9)}`
    const lastButtonId = `last-${Math.random().toString(36).substr(2, 9)}`

    // Determine next player's turn
    let nextToPlay: Color
    if (this.currentMoveIndex < this.moveSequence.length - 1) {
      // Next move exists in sequence
      nextToPlay = this.moveSequence[this.currentMoveIndex + 1].color
    } else {
      // At the end, next turn would be opposite of last move
      if (this.currentMoveIndex >= 0) {
        const lastMove = this.moveSequence[this.currentMoveIndex]
        nextToPlay = lastMove.color === BLACK ? WHITE : BLACK
      } else {
        // At start, use first move's color
        nextToPlay = this.moveSequence[0].color
      }
    }

    let output = `<div class="replay-container">`
    output += renderButtonBar({
      leftContent: renderTurnIndicator(nextToPlay === BLACK),
      buttons: [
        { id: firstButtonId, icon: ICONS.first, title: 'First', disabled: this.currentMoveIndex < 0 },
        { id: prevButtonId, icon: ICONS.previous, title: 'Previous', disabled: this.currentMoveIndex < 0 },
        { id: nextButtonId, icon: ICONS.next, title: 'Next', disabled: this.currentMoveIndex >= this.moveSequence.length - 1 },
        { id: lastButtonId, icon: ICONS.last, title: 'Last', disabled: this.currentMoveIndex >= this.moveSequence.length - 1 },
      ],
      marginDirection: 'bottom',
    })
    output += boardSvg

    // Capture count bar (below board) with move counter on right
    const currentMove = this.currentMoveIndex + 1
    const totalMoves = this.moveSequence.length
    output += renderCaptureBar({
      whiteCaptured: this.whiteCaptured,
      blackCaptured: this.blackCaptured,
      rightContent: renderMoveCounter(currentMove, totalMoves),
      marginDirection: 'top',
    })

    output += `</div>`

    element.innerHTML = output

    // Add button event listeners
    const firstButton = document.getElementById(firstButtonId)
    const prevButton = document.getElementById(prevButtonId)
    const nextButton = document.getElementById(nextButtonId)
    const lastButton = document.getElementById(lastButtonId)

    if (firstButton) {
      firstButton.addEventListener('click', () => this.first())
    }
    if (prevButton) {
      prevButton.addEventListener('click', () => this.previous())
    }
    if (nextButton) {
      nextButton.addEventListener('click', () => this.next())
    }
    if (lastButton) {
      lastButton.addEventListener('click', () => this.last())
    }
  }
}

export type Diagram = StaticDiagram | FreeplayDiagram | ProblemDiagram | ReplayDiagram

export const DIAGRAM_TYPES = {
  static: StaticDiagram,
  freeplay: FreeplayDiagram,
  problem: ProblemDiagram,
  replay: ReplayDiagram,
} as const

export type DiagramType = keyof typeof DIAGRAM_TYPES

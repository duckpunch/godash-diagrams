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

    // Parse to-play option (takes precedence over start-color)
    const toPlayOption = config['to-play']
    const startColorOption = config['start-color']

    // Use to-play if specified, otherwise fall back to start-color
    const colorOption = toPlayOption || startColorOption
    const colorValue = colorOption
      ? (Array.isArray(colorOption) ? colorOption[0] : (typeof colorOption === 'string' ? colorOption : 'black')).toLowerCase()
      : 'black'

    if (colorValue !== 'black' && colorValue !== 'white') {
      const optionName = toPlayOption ? 'to-play' : 'start-color'
      throw new Error(`Invalid ${optionName} value '${colorValue}'. Must be 'black' or 'white'`)
    }
    const startColor = colorValue === 'white' ? WHITE : BLACK

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

    // Parse moves option (maps move numbers to reference move numbers)
    const movesOption = config.moves
    const movesMap = new Map<number, number>()
    if (movesOption && typeof movesOption === 'object' && !Array.isArray(movesOption)) {
      for (const [key, value] of Object.entries(movesOption)) {
        const moveNum = parseInt(key, 10)
        const refMoveNum = typeof value === 'number' ? value : parseInt(String(value), 10)

        if (isNaN(moveNum) || moveNum <= 0) {
          throw new Error(`Invalid move number '${key}' in moves config. Must be a positive integer`)
        }
        if (isNaN(refMoveNum) || refMoveNum <= 0) {
          throw new Error(`Invalid reference move number '${value}' for move ${moveNum}. Must be a positive integer`)
        }
        if (moveNum === refMoveNum) {
          throw new Error(`Move ${moveNum} cannot reference itself`)
        }

        movesMap.set(moveNum, refMoveNum)
      }
    }

    // Build move sequence from otherMarks
    this.moveSequence = this.buildMoveSequence(parsed.otherMarks, startColor, movesMap)

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

  private buildMoveSequence(otherMarks: Record<string, Coordinate[]>, startColor: Color, movesMap: Map<number, number>): ParsedMove[] {
    // Extract all numbered marks from the board
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

    // Build coordinate lookup from board marks
    const boardCoordinates = new Map<number, Coordinate>()
    for (const { number, coordinate } of numberedMarks) {
      boardCoordinates.set(number, coordinate)
    }

    // Determine all move numbers (from board + moves config)
    const allMoveNumbers = new Set<number>()
    for (const { number } of numberedMarks) {
      allMoveNumbers.add(number)
    }
    for (const moveNum of movesMap.keys()) {
      allMoveNumbers.add(moveNum)
    }

    // Validate we have at least one move
    if (allMoveNumbers.size === 0) {
      throw new Error('Replay diagram must have at least one numbered move')
    }

    // Sort move numbers
    const sortedMoveNumbers = Array.from(allMoveNumbers).sort((a, b) => a - b)

    // Validate consecutive sequence (1, 2, 3, ...)
    for (let i = 0; i < sortedMoveNumbers.length; i++) {
      const expected = i + 1
      const actual = sortedMoveNumbers[i]
      if (actual !== expected) {
        throw new Error(`Move numbers must be consecutive starting from 1 (expected ${expected}, found ${actual})`)
      }
    }

    // Build coordinate lookup with moves references resolved
    const resolvedCoordinates = new Map<number, Coordinate>()

    // Helper to resolve a move's coordinate (handles chains of references)
    const resolveCoordinate = (moveNum: number, visited: Set<number> = new Set()): Coordinate => {
      // Check for circular references
      if (visited.has(moveNum)) {
        const chain = Array.from(visited).concat(moveNum).join(' -> ')
        throw new Error(`Circular reference detected in moves config: ${chain}`)
      }

      // Check if already resolved
      if (resolvedCoordinates.has(moveNum)) {
        return resolvedCoordinates.get(moveNum)!
      }

      // Check if on board
      if (boardCoordinates.has(moveNum)) {
        const coord = boardCoordinates.get(moveNum)!
        resolvedCoordinates.set(moveNum, coord)
        return coord
      }

      // Check if in moves config
      if (movesMap.has(moveNum)) {
        const refMoveNum = movesMap.get(moveNum)!

        // Reference must point to an earlier move
        if (refMoveNum >= moveNum) {
          throw new Error(`Move ${moveNum} references move ${refMoveNum}, but references must point to earlier moves`)
        }

        visited.add(moveNum)
        const coord = resolveCoordinate(refMoveNum, visited)
        resolvedCoordinates.set(moveNum, coord)
        return coord
      }

      throw new Error(`Move ${moveNum} has no coordinate (not on board and not in moves config)`)
    }

    // Resolve all coordinates
    for (const moveNum of sortedMoveNumbers) {
      resolveCoordinate(moveNum)
    }

    // Build ParsedMove array with colors
    const moves: ParsedMove[] = []
    for (const moveNum of sortedMoveNumbers) {
      const coordinate = resolvedCoordinates.get(moveNum)!
      // Odd moves are startColor, even moves are opposite
      const color = (moveNum % 2 === 1) ? startColor : (startColor === BLACK ? WHITE : BLACK)
      moves.push({ moveNumber: moveNum, coordinate, color })
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
      marginDirection: 'bottom',
    })

    output += `</div>`

    element.innerHTML = output

    // Add button event listeners
    const firstButton = element.querySelector(`#${firstButtonId}`) as HTMLElement | null
    const prevButton = element.querySelector(`#${prevButtonId}`) as HTMLElement | null
    const nextButton = element.querySelector(`#${nextButtonId}`) as HTMLElement | null
    const lastButton = element.querySelector(`#${lastButtonId}`) as HTMLElement | null

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

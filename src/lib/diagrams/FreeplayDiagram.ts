import type { Color } from 'godash'
import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove, followupKo } from 'godash'
import { validateBoard } from '../validate'
import { parseYaml, extractYamlSection } from '../parseYaml'
import { boardToSvg } from '../render'
import { renderCaptureBar, renderMoveCounter } from '../ui/CaptureBar'
import { renderButtonBar } from '../ui/ButtonBar'
import { renderTurnIndicator } from '../ui/TurnIndicator'
import { ICONS } from '../ui/icons'
import type { IDiagram, ParsedBoard, AnnotationInfo, ColorMode, AnnotationShape } from './types'
import { countCapturesFromDiff } from './types'

type HistoryEntry =
  | { type: 'move'; move: Move }
  | { type: 'pass'; color: Color }

export class FreeplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private currentBoard: Board
  private initialBoard: Board
  private history: HistoryEntry[]
  private currentMoveIndex: number // -1 means no moves yet
  private isBlackTurn: boolean
  private colorMode: ColorMode
  private toPlay: Color | null // Override for initial turn (null = use colorMode default)
  private numbered: boolean
  private whiteCaptured: number
  private blackCaptured: number
  private ignoreKo: boolean
  private koPoint: Coordinate | null
  private shapeMap: Map<string, AnnotationShape>

  constructor(element: Element, lines: string[]) {
    this.element = element

    // Parse board
    const parsed = validateBoard(lines, { allowEmpty: true, validateCharacters: false })
    this.parsedBoard = parsed

    // Parse YAML configuration
    const yamlContent = extractYamlSection(lines, parsed.configStartIndex)
    const config = yamlContent ? parseYaml(yamlContent) : {}

    // Parse color option (default to "alternate")
    const colorOption = config.color
    const colorValue = colorOption
      ? (Array.isArray(colorOption) ? colorOption[0] : (typeof colorOption === 'string' ? colorOption : 'alternate')).toLowerCase()
      : 'alternate'

    if (colorValue !== 'black' && colorValue !== 'white' && colorValue !== 'alternate') {
      throw new Error(`Invalid color value '${colorValue}'. Must be 'black', 'white', or 'alternate'`)
    }
    this.colorMode = colorValue as ColorMode

    // Parse numbered option (default to false)
    const numberedOption = config.numbered
    this.numbered = numberedOption === 'true' || numberedOption === true

    // Parse ignore-ko option (default to false)
    const ignoreKoOption = config['ignore-ko']
    this.ignoreKo = ignoreKoOption === 'true' || ignoreKoOption === true

    // Parse to-play option (sets initial turn color)
    const toPlayOption = config['to-play']
    if (toPlayOption) {
      const toPlayValue = (Array.isArray(toPlayOption) ? toPlayOption[0] : (typeof toPlayOption === 'string' ? toPlayOption : '')).toLowerCase()
      if (toPlayValue !== 'black' && toPlayValue !== 'white') {
        throw new Error(`Invalid to-play value '${toPlayValue}'. Must be 'black' or 'white'`)
      }
      this.toPlay = toPlayValue === 'black' ? BLACK : WHITE
    } else {
      this.toPlay = null
    }

    // Parse black and white marks into arrays
    const blackOption = config.black
    const whiteOption = config.white

    const blackMarks = blackOption
      ? (Array.isArray(blackOption) ? blackOption : (typeof blackOption === 'string' ? blackOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []
    const whiteMarks = whiteOption
      ? (Array.isArray(whiteOption) ? whiteOption : (typeof whiteOption === 'string' ? whiteOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []

    // Parse shape options
    const triangleOption = config.triangle
    const squareOption = config.square
    const circleOption = config.circle
    const xOption = config.x

    const triangleMarks = triangleOption
      ? (Array.isArray(triangleOption) ? triangleOption : (typeof triangleOption === 'string' ? triangleOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []
    const squareMarks = squareOption
      ? (Array.isArray(squareOption) ? squareOption : (typeof squareOption === 'string' ? squareOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []
    const circleMarks = circleOption
      ? (Array.isArray(circleOption) ? circleOption : (typeof circleOption === 'string' ? circleOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []
    const xMarks = xOption
      ? (Array.isArray(xOption) ? xOption : (typeof xOption === 'string' ? xOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []

    // Build shape lookup
    this.shapeMap = new Map<string, AnnotationShape>()
    for (const mark of triangleMarks) {
      this.shapeMap.set(mark, 'triangle')
    }
    for (const mark of squareMarks) {
      this.shapeMap.set(mark, 'square')
    }
    for (const mark of circleMarks) {
      this.shapeMap.set(mark, 'circle')
    }
    for (const mark of xMarks) {
      this.shapeMap.set(mark, 'x')
    }

    // Add black and white marks as stones to the board
    let board = parsed.board
    for (const mark of blackMarks) {
      if (parsed.otherMarks[mark]) {
        for (const coord of parsed.otherMarks[mark]) {
          board = addMove(board, Move(coord, BLACK))
        }
      }
    }
    for (const mark of whiteMarks) {
      if (parsed.otherMarks[mark]) {
        for (const coord of parsed.otherMarks[mark]) {
          board = addMove(board, Move(coord, WHITE))
        }
      }
    }

    this.initialBoard = board
    this.currentBoard = board
    this.history = []
    this.currentMoveIndex = -1
    // Set initial turn based on to-play or color mode
    if (this.toPlay !== null) {
      this.isBlackTurn = this.toPlay === BLACK
    } else {
      this.isBlackTurn = this.colorMode !== 'white'
    }
    this.whiteCaptured = 0
    this.blackCaptured = 0
    this.koPoint = null
  }

  private rebuildBoard(): void {
    // Start with initial board
    let board = this.initialBoard

    // Reset capture counts
    this.whiteCaptured = 0
    this.blackCaptured = 0

    // Track board before last move for ko calculation
    let boardBeforeLastMove = this.initialBoard
    let lastMove: Move | null = null

    // Apply moves up to currentMoveIndex
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const entry = this.history[i]
      if (entry.type === 'move') {
        boardBeforeLastMove = board
        lastMove = entry.move
        board = addMove(board, entry.move)

        // Count captures
        const captures = countCapturesFromDiff(boardBeforeLastMove, board)
        this.whiteCaptured += captures.whiteCaptured
        this.blackCaptured += captures.blackCaptured
      } else {
        // Pass move clears ko point
        lastMove = null
      }
    }

    this.currentBoard = board

    // Calculate ko point from last move
    if (!this.ignoreKo && lastMove) {
      this.koPoint = followupKo(boardBeforeLastMove, lastMove)
    } else {
      this.koPoint = null
    }

    // Update whose turn it is based on color mode and history
    if (this.colorMode === 'black') {
      this.isBlackTurn = true // Always black
    } else if (this.colorMode === 'white') {
      this.isBlackTurn = false // Always white
    } else {
      // Alternate mode - toggle based on history
      if (this.currentMoveIndex === -1) {
        this.isBlackTurn = true
      } else {
        const lastEntry = this.history[this.currentMoveIndex]
        const lastColor = lastEntry.type === 'move' ? lastEntry.move.color : lastEntry.color
        this.isBlackTurn = lastColor === WHITE
      }
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

    // Toggle turn (only in alternate mode, rebuildBoard will handle fixed colors)
    if (this.colorMode === 'alternate') {
      this.isBlackTurn = !this.isBlackTurn
    }

    this.render()
  }

  private reset(): void {
    this.history = []
    this.currentMoveIndex = -1
    this.currentBoard = this.initialBoard
    // Set initial turn based on to-play or color mode
    if (this.toPlay !== null) {
      this.isBlackTurn = this.toPlay === BLACK
    } else if (this.colorMode === 'white') {
      this.isBlackTurn = false
    } else {
      this.isBlackTurn = true // For both 'black' and 'alternate'
    }
    this.whiteCaptured = 0
    this.blackCaptured = 0
    this.koPoint = null
    this.render()
  }

  render(): void {
    const element = this.element

    const { rowCount, columnCount } = this.parsedBoard

    // Build annotations for move numbers if numbered is enabled
    const annotations = new Map<string, AnnotationInfo>()

    // Add static annotations from board definition (otherMarks)
    for (const [mark, coordinates] of Object.entries(this.parsedBoard.otherMarks)) {
      // Use specified shape or default to text
      const shape = this.shapeMap.get(mark) || 'text'

      for (const coord of coordinates) {
        const key = `${coord.x},${coord.y}`
        annotations.set(key, { label: mark, shape })
      }
    }

    if (this.numbered) {
      let moveNumber = 1
      for (let i = 0; i <= this.currentMoveIndex; i++) {
        const entry = this.history[i]
        if (entry.type === 'move') {
          const key = `${entry.move.coordinate.x},${entry.move.coordinate.y}`
          annotations.set(key, {
            label: String(moveNumber),
            shape: 'text'
          })
        }
        // Increment for both moves and passes
        moveNumber++
      }
    }

    // Determine last move coordinate (only if not numbered - numbers already show last move)
    let lastMove: Coordinate | undefined
    if (!this.numbered && this.currentMoveIndex >= 0) {
      const lastEntry = this.history[this.currentMoveIndex]
      if (lastEntry.type === 'move') {
        lastMove = lastEntry.move.coordinate
      }
    }

    // Generate SVG using current board state
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount, annotations, lastMove)

    // Create container with SVG and buttons
    const undoButtonId = `undo-${Math.random().toString(36).substr(2, 9)}`
    const redoButtonId = `redo-${Math.random().toString(36).substr(2, 9)}`
    const passButtonId = `pass-${Math.random().toString(36).substr(2, 9)}`
    const resetButtonId = `reset-${Math.random().toString(36).substr(2, 9)}`

    let output = `<div class="freeplay-container">`
    output += renderButtonBar({
      leftContent: renderTurnIndicator(this.isBlackTurn),
      buttons: [
        { id: undoButtonId, icon: ICONS.undo, title: 'Undo', disabled: this.currentMoveIndex < 0 },
        { id: redoButtonId, icon: ICONS.redo, title: 'Redo', disabled: this.currentMoveIndex >= this.history.length - 1 },
        { id: passButtonId, icon: ICONS.pass, title: 'Pass' },
        { id: resetButtonId, icon: ICONS.reset, title: 'Reset' },
      ],
      marginDirection: 'bottom',
    })
    output += boardSvg

    // Capture count bar (below board) with move counter on right
    const moveCount = this.currentMoveIndex + 1
    output += renderCaptureBar({
      whiteCaptured: this.whiteCaptured,
      blackCaptured: this.blackCaptured,
      rightContent: renderMoveCounter(moveCount),
      marginDirection: 'bottom',
    })

    output += `</div>`

    element.innerHTML = output

    // Add click handler to SVG
    const svg = element.querySelector('svg.godash-board') as SVGSVGElement | null
    const undoButton = document.getElementById(undoButtonId)
    const redoButton = document.getElementById(redoButtonId)
    const passButton = document.getElementById(passButtonId)
    const resetButton = document.getElementById(resetButtonId)

    if (svg) {
      svg.style.cursor = 'pointer'

      svg.addEventListener('click', (event: Event) => {
        const mouseEvent = event as MouseEvent

        // Convert screen coordinates to SVG coordinates (accounting for viewBox)
        const pt = svg.createSVGPoint()
        pt.x = mouseEvent.clientX
        pt.y = mouseEvent.clientY
        const ctm = svg.getScreenCTM()
        if (!ctm) return
        const svgPt = pt.matrixTransform(ctm.inverse())

        // Convert to board coordinates
        const cellSize = 30
        const margin = cellSize
        const col = Math.round((svgPt.x - margin) / cellSize)
        const row = Math.round((svgPt.y - margin) / cellSize)

        // Validate coordinates are within board bounds
        if (row >= 0 && row < rowCount && col >= 0 && col < columnCount) {
          const coordinate = Coordinate(row, col)
          const color = this.isBlackTurn ? BLACK : WHITE
          const move = Move(coordinate, color)

          // Check if move violates ko rule
          if (!this.ignoreKo && this.koPoint && coordinate.equals(this.koPoint)) {
            // Silently ignore ko violation
            return
          }

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


import type { Color } from 'godash'
import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove, difference, followupKo } from 'godash'
import { Map as ImmutableMap } from 'immutable'
import { validateBoard, parseOptions } from './validate'
import { boardToSvg } from './render'
import { renderCaptureBar, renderMoveCounter } from './ui/CaptureBar'
import { renderButtonBar } from './ui/ButtonBar'
import { ICONS } from './ui/icons'

export const ProblemResult = {
  Success: 'success',
  Failure: 'failure',
  Incomplete: 'incomplete'
} as const

export type ProblemResult = typeof ProblemResult[keyof typeof ProblemResult]

// Sequence tree node with result and children
export interface SequenceNode {
  result: ProblemResult
  children: SequenceTree
  wildcardChild?: SequenceNode  // For "*" moves - handles any unspecified player move
}

// Recursive type for sequence tree where each level represents a move option
export type SequenceTree = ImmutableMap<Coordinate, SequenceNode>

export interface ParsedBoard {
  board: Board
  rowCount: number
  columnCount: number
  configStartIndex: number
  otherMarks: Record<string, Coordinate[]>
  areaPrefixes: Map<string, string>  // coord key -> prefix (e.g., "0,0" -> "r")
}

export interface IDiagram {
  render(): void
}

export type AnnotationShape = 'text' | 'triangle' | 'square' | 'circle' | 'x'

export interface AnnotationInfo {
  label: string
  shape: AnnotationShape
}

// Helper function to count captures when playing a move
function countCapturesFromDiff(boardBefore: Board, boardAfter: Board): { whiteCaptured: number, blackCaptured: number } {
  const diff = difference(boardBefore, boardAfter)
  let whiteCaptured = 0
  let blackCaptured = 0

  diff.forEach((entry) => {
    const color = entry.get(1) as Color
    if (color === WHITE) whiteCaptured++
    else if (color === BLACK) blackCaptured++
  })

  return { whiteCaptured, blackCaptured }
}

export class StaticDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private annotations: Map<string, AnnotationInfo> // coord key -> annotation info
  private areaColors: Map<string, string> // prefix -> color (e.g., "r" -> "red", "b" -> "blue")

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.annotations = new Map()
    this.areaColors = new Map()

    // Do a preliminary parse to extract options
    // We need to find where the board ends to parse options
    let boardStartIndex = 1
    while (boardStartIndex < lines.length && lines[boardStartIndex].trim() === '') {
      boardStartIndex++
    }

    let configStartIndex = boardStartIndex
    for (let i = boardStartIndex; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '' || line.indexOf(':') > 0) {
        configStartIndex = i
        break
      }
    }

    // Parse options
    const parsedOptions = parseOptions(lines, configStartIndex)

    // Extract ignore-rules option (defaults to false)
    const ignoreRulesOption = parsedOptions['ignore-rules']
    const ignoreRules = ignoreRulesOption === 'true' || ignoreRulesOption === '1'

    // Parse area-colors option to build prefix -> color mapping
    const areaColorsOption = parsedOptions['area-colors']
    if (areaColorsOption) {
      // Can be single line "r=red, b=blue" or multi-line array ["r=red", "b=blue"]
      const colorEntries = Array.isArray(areaColorsOption) ? areaColorsOption : [areaColorsOption]

      for (const entry of colorEntries) {
        // Split on commas to handle "r=red, b=blue" format
        const pairs = entry.split(',').map(s => s.trim()).filter(s => s.length > 0)

        for (const pair of pairs) {
          // Parse "prefix=color" format
          const eqIndex = pair.indexOf('=')
          if (eqIndex > 0) {
            const prefix = pair.substring(0, eqIndex).trim()
            const color = pair.substring(eqIndex + 1).trim()

            if (prefix.length === 1 && /^[a-z]$/.test(prefix)) {
              this.areaColors.set(prefix, color)
            } else {
              throw new Error(`Invalid area prefix '${prefix}'. Must be a single lowercase letter (a-z)`)
            }
          }
        }
      }
    }

    // Build set of valid prefixes for validateBoard
    const validPrefixes = this.areaColors.size > 0 ? new Set(this.areaColors.keys()) : undefined

    // Parse board with prefix knowledge
    const parsed = validateBoard(lines, { ignoreRules, validateCharacters: false, validPrefixes })

    // Parse black and white marks from options
    const blackOption = parsedOptions.black
    const whiteOption = parsedOptions.white

    const blackMarks = blackOption
      ? (Array.isArray(blackOption) ? blackOption : blackOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []
    const whiteMarks = whiteOption
      ? (Array.isArray(whiteOption) ? whiteOption : whiteOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []

    // Parse shape options
    const triangleOption = parsedOptions.triangle
    const squareOption = parsedOptions.square
    const circleOption = parsedOptions.circle
    const xOption = parsedOptions.x

    const triangleMarks = triangleOption
      ? (Array.isArray(triangleOption) ? triangleOption : triangleOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []
    const squareMarks = squareOption
      ? (Array.isArray(squareOption) ? squareOption : squareOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []
    const circleMarks = circleOption
      ? (Array.isArray(circleOption) ? circleOption : circleOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []
    const xMarks = xOption
      ? (Array.isArray(xOption) ? xOption : xOption.split(',').map(m => m.trim()).filter(m => m.length > 0))
      : []

    // Build shape lookup
    const shapeMap = new Map<string, AnnotationShape>()
    for (const mark of triangleMarks) {
      shapeMap.set(mark, 'triangle')
    }
    for (const mark of squareMarks) {
      shapeMap.set(mark, 'square')
    }
    for (const mark of circleMarks) {
      shapeMap.set(mark, 'circle')
    }
    for (const mark of xMarks) {
      shapeMap.set(mark, 'x')
    }

    // Add stones for marked positions
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

    // Build annotations map (all otherMarks become annotations)
    for (const [mark, coordinates] of Object.entries(parsed.otherMarks)) {
      const shape = shapeMap.get(mark) || 'text'
      for (const coord of coordinates) {
        const key = `${coord.x},${coord.y}`
        this.annotations.set(key, { label: mark, shape })
      }
    }

    this.parsedBoard = { ...parsed, board }
  }

  render(): void {
    const element = this.element

    const { board, rowCount, columnCount, areaPrefixes } = this.parsedBoard

    // Generate SVG with annotations and area colors
    const boardSvg = boardToSvg(
      board,
      rowCount,
      columnCount,
      this.annotations,
      undefined,  // lastMove
      areaPrefixes,
      this.areaColors
    )

    // Render
    element.innerHTML = boardSvg
  }
}

type HistoryEntry =
  | { type: 'move'; move: Move }
  | { type: 'pass'; color: Color }

export class ProblemDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  public toPlay: Color
  public sequenceTree: SequenceTree
  public result: ProblemResult
  private currentTree: SequenceTree
  private currentWildcard: SequenceNode | undefined
  private playedMoves: Move[]
  private currentBoard: Board
  private isBlackTurn: boolean
  private whiteCaptured: number
  private blackCaptured: number
  private ignoreKo: boolean
  private koPoint: Coordinate | null

  constructor(element: Element, lines: string[]) {
    this.element = element
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

    // Parse ignore-ko option (default to false)
    const ignoreKoOption = parsedOptions['ignore-ko']
    this.ignoreKo = ignoreKoOption === 'true' || ignoreKoOption === '1'

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

    // Initialize result to incomplete
    this.result = ProblemResult.Incomplete

    // Initialize play state
    this.currentTree = ImmutableMap<Coordinate, SequenceNode>()
    this.currentWildcard = undefined
    this.playedMoves = []
    this.currentBoard = board
    this.isBlackTurn = this.toPlay === BLACK
    this.whiteCaptured = 0
    this.blackCaptured = 0
    this.koPoint = null

    // Helper function to validate a move sequence
    const validateSequence = (sequence: string, label: string) => {
      // Split sequence on ">" to get marks
      const marks = sequence.split('>').map(m => m.trim()).filter(m => m.length > 0)

      // Validate all marks exist in otherMarks (or are "*")
      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i]

        // "*" is allowed only for player moves (alternating based on toPlay)
        if (mark === '*') {
          const isPlayerMove = (i % 2 === 0) // Player moves at even indices (0, 2, 4...)
          if (!isPlayerMove) {
            throw new Error(`${label} '${sequence}': wildcard '*' can only be used for player moves, not computer responses (position ${i + 1})`)
          }
          continue
        }

        if (!parsed.otherMarks[mark]) {
          throw new Error(`${label} '${sequence}': mark '${mark}' does not appear in the board`)
        }
      }

      // Validate the move sequence by applying moves to the board (skip wildcards)
      let testBoard = board
      let currentColor = this.toPlay

      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i]

        // Skip wildcard validation (can't validate "any move")
        if (mark === '*') {
          currentColor = currentColor === BLACK ? WHITE : BLACK
          continue
        }

        const coordinates = parsed.otherMarks[mark]
        const coord = coordinates[0] // We already validated marks are unique
        const move = Move(coord, currentColor)

        // Check if move is legal
        if (!isLegalMove(testBoard, move)) {
          throw new Error(`${label} '${sequence}': move ${i + 1} (${mark}) is illegal`)
        }

        // Apply the move and toggle color
        try {
          testBoard = addMove(testBoard, move)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`${label} '${sequence}': move ${i + 1} (${mark}) failed - ${errorMessage}`)
        }
        currentColor = currentColor === BLACK ? WHITE : BLACK
      }
    }

    // Parse and validate solutions
    const solutionsOption = parsedOptions.solutions
    const allSequences: Array<{ sequence: string, isSolution: boolean }> = []
    if (solutionsOption) {
      const solutions = Array.isArray(solutionsOption) ? solutionsOption : [solutionsOption]
      for (const solution of solutions) {
        validateSequence(solution, 'Solution')
        allSequences.push({ sequence: solution, isSolution: true })
      }
    }

    // Parse and validate sequences
    const sequencesOption = parsedOptions.sequences
    if (sequencesOption) {
      const sequences = Array.isArray(sequencesOption) ? sequencesOption : [sequencesOption]
      for (const sequence of sequences) {
        validateSequence(sequence, 'Sequence')
        allSequences.push({ sequence: sequence, isSolution: false })
      }
    }

    // Build sequence tree from all sequences
    this.sequenceTree = ImmutableMap<Coordinate, SequenceNode>()
    for (const { sequence, isSolution } of allSequences) {
      const marks = sequence.split('>').map(m => m.trim()).filter(m => m.length > 0)

      // Build path of coordinates and track wildcards
      const path: Array<Coordinate | '*'> = []
      for (const mark of marks) {
        if (mark === '*') {
          path.push('*')
        } else {
          path.push(parsed.otherMarks[mark][0])
        }
      }

      // Check if sequence starts with wildcard (root-level wildcard)
      if (path[0] === '*') {
        // Build the continuation tree (everything after the wildcard) using same logic as non-root
        // This supports wildcards in the continuation (e.g., *>D>*>B)
        let tree: SequenceTree = ImmutableMap<Coordinate, SequenceNode>()
        let wildcardTree: SequenceTree = ImmutableMap<Coordinate, SequenceNode>()
        let hasWildcard = false

        for (let i = path.length - 1; i >= 1; i--) {
          const item = path[i]
          const isLastNode = i === path.length - 1

          // Determine result for this node
          let nodeResult: ProblemResult
          if (isLastNode) {
            nodeResult = isSolution ? ProblemResult.Success : ProblemResult.Failure
          } else {
            nodeResult = ProblemResult.Incomplete
          }

          if (item === '*') {
            // Skip wildcards - they're handled as properties of the previous node
            hasWildcard = true
            continue
          }

          const coord = item as Coordinate

          // If we just passed a wildcard, this coord is the computer response to the wildcard
          if (hasWildcard) {
            wildcardTree = tree
            tree = ImmutableMap<Coordinate, SequenceNode>()
            hasWildcard = false
          }

          const node: SequenceNode = {
            result: nodeResult,
            children: tree,
            wildcardChild: wildcardTree.size > 0 ? { result: ProblemResult.Incomplete, children: wildcardTree, wildcardChild: undefined } : undefined
          }
          tree = ImmutableMap<Coordinate, SequenceNode>().set(coord, node)
          wildcardTree = ImmutableMap<Coordinate, SequenceNode>()
        }

        // Apply wildcardChild to all root nodes
        const wildcardNode: SequenceNode = {
          result: ProblemResult.Incomplete,
          children: tree,
          wildcardChild: undefined
        }

        this.sequenceTree = this.applyWildcardToTree(this.sequenceTree, wildcardNode)
      } else {
        // Build from the leaf up, handling wildcards specially
        // A wildcard means the parent node should set wildcardChild to point to the computer's response
        let tree: SequenceTree = ImmutableMap<Coordinate, SequenceNode>()
        let wildcardTree: SequenceTree = ImmutableMap<Coordinate, SequenceNode>()
        let hasWildcard = false

        for (let i = path.length - 1; i >= 0; i--) {
          const item = path[i]
          const isLastNode = i === path.length - 1

          // Determine result for this node
          let nodeResult: ProblemResult
          if (isLastNode) {
            // Last node: success for solutions, failure for non-solutions
            nodeResult = isSolution ? ProblemResult.Success : ProblemResult.Failure
          } else {
            // Intermediate nodes are incomplete
            nodeResult = ProblemResult.Incomplete
          }

          if (item === '*') {
            // Skip wildcards - they're handled as properties of the previous node
            hasWildcard = true
            continue
          }

          const coord = item as Coordinate

          // If we just passed a wildcard, this coord is the computer response to the wildcard
          if (hasWildcard) {
            wildcardTree = tree
            tree = ImmutableMap<Coordinate, SequenceNode>()
            hasWildcard = false
          }

          const node: SequenceNode = {
            result: nodeResult,
            children: tree,
            wildcardChild: wildcardTree.size > 0 ? { result: ProblemResult.Incomplete, children: wildcardTree, wildcardChild: undefined } : undefined
          }
          tree = ImmutableMap<Coordinate, SequenceNode>().set(coord, node)
          wildcardTree = ImmutableMap<Coordinate, SequenceNode>()
        }

        // Merge with existing tree
        this.sequenceTree = this.mergeSequenceTrees(this.sequenceTree, tree)
      }
    }

    // Set current tree to the root of sequence tree
    this.currentTree = this.sequenceTree
    // Initialize wildcard from root level if present
    const rootWildcards = Array.from(this.sequenceTree.values()).filter(n => n.wildcardChild)
    this.currentWildcard = rootWildcards.length > 0 ? rootWildcards[0].wildcardChild : undefined
  }

  private applyWildcardToTree(tree: SequenceTree, wildcardNode: SequenceNode): SequenceTree {
    // Apply wildcardChild to all nodes in the tree
    return tree.map(node => ({
      result: node.result,
      children: node.children,
      wildcardChild: wildcardNode
    }))
  }

  private mergeSequenceTrees(tree1: SequenceTree, tree2: SequenceTree): SequenceTree {
    return tree2.reduce((merged, node2, coord) => {
      const node1 = merged.get(coord)
      if (node1) {
        // Merge the children of both nodes
        const mergedChildren = this.mergeSequenceTrees(node1.children, node2.children)

        // Merge wildcardChild if present in either node
        let mergedWildcardChild: SequenceNode | undefined = undefined
        if (node1.wildcardChild && node2.wildcardChild) {
          // Both have wildcardChild - merge them recursively
          const dummyTree1 = ImmutableMap<Coordinate, SequenceNode>().set(Coordinate(0, 0), node1.wildcardChild)
          const dummyTree2 = ImmutableMap<Coordinate, SequenceNode>().set(Coordinate(0, 0), node2.wildcardChild)
          const mergedDummy = this.mergeSequenceTrees(dummyTree1, dummyTree2)
          mergedWildcardChild = mergedDummy.get(Coordinate(0, 0))
        } else {
          mergedWildcardChild = node1.wildcardChild || node2.wildcardChild
        }

        // If the merged node has children, it's not a leaf, so mark as incomplete
        // Otherwise, keep the result from whichever node had it set
        const hasChildren = mergedChildren.size > 0 || mergedWildcardChild !== undefined
        const mergedResult = hasChildren ? ProblemResult.Incomplete : node1.result

        const mergedNode: SequenceNode = {
          result: mergedResult,
          children: mergedChildren,
          wildcardChild: mergedWildcardChild
        }
        return merged.set(coord, mergedNode)
      } else {
        return merged.set(coord, node2)
      }
    }, tree1)
  }

  private handleUserMove(coord: Coordinate): void {
    // Check if move violates ko rule
    if (!this.ignoreKo && this.koPoint && coord.equals(this.koPoint)) {
      // Silently ignore ko violation
      return
    }

    // Check if this move is in the current tree
    let node = this.currentTree.get(coord)

    // If not found in explicit children, check for wildcard
    if (!node && this.currentWildcard) {
      node = this.currentWildcard
    }

    // Play the move regardless of whether it's in the tree
    const currentColor = this.isBlackTurn ? BLACK : WHITE
    const move = Move(coord, currentColor)
    this.playedMoves.push(move)
    const boardBefore = this.currentBoard
    this.currentBoard = addMove(this.currentBoard, move)

    // Count captures
    const captures = countCapturesFromDiff(boardBefore, this.currentBoard)
    this.whiteCaptured += captures.whiteCaptured
    this.blackCaptured += captures.blackCaptured

    // Update ko point
    if (!this.ignoreKo) {
      this.koPoint = followupKo(boardBefore, move)
    }

    this.isBlackTurn = !this.isBlackTurn

    if (!node) {
      // Move not in tree and no wildcard - only set to failure if not already in success state
      if (this.result !== ProblemResult.Success) {
        this.result = ProblemResult.Failure
      }
      this.currentTree = ImmutableMap<Coordinate, SequenceNode>()
      this.currentWildcard = undefined
      this.render()
      return
    }

    // Valid move (either explicit or wildcard) - update tree and result
    this.currentTree = node.children
    this.currentWildcard = node.wildcardChild
    this.result = node.result

    // Re-render
    this.render()

    // If there are children (computer has responses), play a random one after delay
    if (node.children.size > 0) {
      setTimeout(() => this.playComputerResponse(), 500)
    }
  }

  private playComputerResponse(): void {
    // Pick a random child from current tree
    const children = Array.from(this.currentTree.entries())
    if (children.length === 0) return

    const randomIndex = Math.floor(Math.random() * children.length)
    const [coord, node] = children[randomIndex]

    // Play the move
    const currentColor = this.isBlackTurn ? BLACK : WHITE
    const move = Move(coord, currentColor)
    this.playedMoves.push(move)
    const boardBefore = this.currentBoard
    this.currentBoard = addMove(this.currentBoard, move)

    // Count captures
    const captures = countCapturesFromDiff(boardBefore, this.currentBoard)
    this.whiteCaptured += captures.whiteCaptured
    this.blackCaptured += captures.blackCaptured

    // Update ko point
    if (!this.ignoreKo) {
      this.koPoint = followupKo(boardBefore, move)
    }

    this.isBlackTurn = !this.isBlackTurn

    // Update current tree, wildcard, and result
    this.currentTree = node.children
    this.currentWildcard = node.wildcardChild
    this.result = node.result

    // Re-render
    this.render()
  }

  private reset(): void {
    this.currentTree = this.sequenceTree
    // Check if any root node has a wildcardChild (for root-level wildcards like "*>A")
    const rootWildcards = Array.from(this.sequenceTree.values()).filter(n => n.wildcardChild)
    this.currentWildcard = rootWildcards.length > 0 ? rootWildcards[0].wildcardChild : undefined
    this.playedMoves = []
    this.currentBoard = this.parsedBoard.board
    this.isBlackTurn = this.toPlay === BLACK
    this.result = ProblemResult.Incomplete
    this.whiteCaptured = 0
    this.blackCaptured = 0
    this.koPoint = null
    this.render()
  }

  render(): void {
    const element = this.element
    const { rowCount, columnCount } = this.parsedBoard

    // Determine last move coordinate
    let lastMove: Coordinate | undefined
    if (this.playedMoves.length > 0) {
      lastMove = this.playedMoves[this.playedMoves.length - 1].coordinate
    }

    // Material-styled button bar with result label
    const resetButtonId = `reset-${Math.random().toString(36).substr(2, 9)}`

    // Left indicator: turn indicator when in progress, result icon when complete
    let leftIndicator = ''
    if (this.result === ProblemResult.Incomplete) {
      // Show turn indicator when game is in progress
      const isBlackTurn = this.isBlackTurn
      const stoneColor = isBlackTurn ? '#000000' : '#ffffff'
      const stoneBorder = isBlackTurn ? 'none' : '2px solid #424242'
      leftIndicator = `<div style="width: 28px; height: 28px; border-radius: 50%; background: ${stoneColor}; border: ${stoneBorder};" title="${isBlackTurn ? 'Black' : 'White'} to play"></div>`
    } else if (this.result === ProblemResult.Success) {
      // Show check icon when successful
      const iconStyle = 'display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px;'
      leftIndicator = `<div style="${iconStyle}">${ICONS.check}</div>`
    } else if (this.result === ProblemResult.Failure) {
      // Show x icon when failed
      const iconStyle = 'display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px;'
      leftIndicator = `<div style="${iconStyle}">${ICONS.x}</div>`
    }

    // Dynamic bar styling based on result
    let barBackground = '#f8f8f8'
    let barBorderColor = '#9e9e9e'
    let buttonBackground = '#e0e0e0'
    let buttonColor = '#424242'

    if (this.result === ProblemResult.Success) {
      barBackground = '#e8f5e9'  // Light green
      barBorderColor = '#2e7d32'  // Green
      buttonBackground = '#a5d6a7'  // Medium green
      buttonColor = '#1b5e20'  // Dark green
    } else if (this.result === ProblemResult.Failure) {
      barBackground = '#ffebee'  // Light red
      barBorderColor = '#c62828'  // Red
      buttonBackground = '#ffcdd2'  // Softer red
      buttonColor = '#c62828'  // Red
    }

    // Generate SVG using current board state
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount, undefined, lastMove)

    // Render
    let output = `<div class="problem-container">`
    output += renderButtonBar({
      leftContent: leftIndicator,
      buttons: [
        { id: resetButtonId, icon: ICONS.reset, title: 'Reset' },
      ],
      style: {
        background: barBackground,
        borderColor: barBorderColor,
        buttonBackground,
        buttonColor,
      },
      marginDirection: 'bottom',
    })
    output += boardSvg

    // Capture count bar (below board)
    output += renderCaptureBar({
      whiteCaptured: this.whiteCaptured,
      blackCaptured: this.blackCaptured,
      marginDirection: 'bottom',
    })

    output += `</div>`

    element.innerHTML = output

    // Add click handler to SVG
    const svg = element.querySelector('svg.godash-board') as SVGSVGElement | null
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
          this.handleUserMove(coordinate)
        }
      })
    }

    // Add reset button event listener
    const resetButton = document.getElementById(resetButtonId)
    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset())
    }
  }
}

export interface ParsedMove {
  moveNumber: number
  coordinate: Coordinate
  color: Color  // Determined by odd/even (1=black, 2=white, etc.)
}

export type ColorMode = 'black' | 'white' | 'alternate'

export class FreeplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private currentBoard: Board
  private initialBoard: Board
  private history: HistoryEntry[]
  private currentMoveIndex: number // -1 means no moves yet
  private isBlackTurn: boolean
  private colorMode: ColorMode
  private numbered: boolean
  private whiteCaptured: number
  private blackCaptured: number
  private ignoreKo: boolean
  private koPoint: Coordinate | null

  constructor(element: Element, lines: string[]) {
    this.element = element

    // Parse board
    const parsed = validateBoard(lines, { allowEmpty: true })
    this.parsedBoard = parsed

    // Parse options
    const parsedOptions = parseOptions(lines, parsed.configStartIndex)

    // Parse color option (default to "alternate")
    const colorOption = parsedOptions.color
    const colorValue = colorOption
      ? (Array.isArray(colorOption) ? colorOption[0] : colorOption).toLowerCase()
      : 'alternate'

    if (colorValue !== 'black' && colorValue !== 'white' && colorValue !== 'alternate') {
      throw new Error(`Invalid color value '${colorValue}'. Must be 'black', 'white', or 'alternate'`)
    }
    this.colorMode = colorValue as ColorMode

    // Parse numbered option (default to false)
    const numberedOption = parsedOptions.numbered
    this.numbered = numberedOption === 'true' || numberedOption === '1'

    // Parse ignore-ko option (default to false)
    const ignoreKoOption = parsedOptions['ignore-ko']
    this.ignoreKo = ignoreKoOption === 'true' || ignoreKoOption === '1'

    this.initialBoard = this.parsedBoard.board
    this.currentBoard = this.parsedBoard.board
    this.history = []
    this.currentMoveIndex = -1
    // Set initial turn based on color mode
    this.isBlackTurn = this.colorMode !== 'white'
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
    // Set initial turn based on color mode
    if (this.colorMode === 'white') {
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

    // Turn indicator circle
    const stoneColor = this.isBlackTurn ? '#000000' : '#ffffff'
    const stoneBorder = this.isBlackTurn ? 'none' : '2px solid #424242'
    const turnIndicator = `<div style="width: 28px; height: 28px; border-radius: 50%; background: ${stoneColor}; border: ${stoneBorder};" title="${this.isBlackTurn ? 'Black' : 'White'} to play"></div>`

    let output = `<div class="freeplay-container">`
    output += renderButtonBar({
      leftContent: turnIndicator,
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
      marginDirection: 'top',
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

    // Parse options
    const parsedOptions = parseOptions(lines, parsed.configStartIndex)

    // Parse start-color option (default to black)
    const startColorOption = parsedOptions['start-color']
    const startColorValue = startColorOption
      ? (Array.isArray(startColorOption) ? startColorOption[0] : startColorOption).toLowerCase()
      : 'black'

    if (startColorValue !== 'black' && startColorValue !== 'white') {
      throw new Error(`Invalid start-color value '${startColorValue}'. Must be 'black' or 'white'`)
    }
    const startColor = startColorValue === 'white' ? WHITE : BLACK

    // Parse show-numbers option (default to false)
    const showNumbersOption = parsedOptions['show-numbers']
    this.showNumbers = showNumbersOption === 'true' || showNumbersOption === '1'

    // Parse initial-move option (default to 0)
    const initialMoveOption = parsedOptions['initial-move']
    let initialMove = 0
    if (initialMoveOption) {
      const initialMoveValue = Array.isArray(initialMoveOption) ? initialMoveOption[0] : initialMoveOption
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

    // Turn indicator circle
    const isBlackTurn = nextToPlay === BLACK
    const stoneColor = isBlackTurn ? '#000000' : '#ffffff'
    const stoneBorder = isBlackTurn ? 'none' : '2px solid #424242'
    const turnIndicator = `<div style="width: 28px; height: 28px; border-radius: 50%; background: ${stoneColor}; border: ${stoneBorder};" title="${isBlackTurn ? 'Black' : 'White'} to play"></div>`

    let output = `<div class="replay-container">`
    output += renderButtonBar({
      leftContent: turnIndicator,
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

import type { Color } from 'godash'
import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove } from 'godash'
import { Map as ImmutableMap } from 'immutable'
import { validateBoard, parseOptions } from './validate'
import { boardToSvg } from './render'

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
}

export interface IDiagram {
  render(): void
}

export type AnnotationShape = 'text' | 'triangle' | 'square' | 'circle' | 'x'

export interface AnnotationInfo {
  label: string
  shape: AnnotationShape
}

export class StaticDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private annotations: Map<string, AnnotationInfo> // coord key -> annotation info

  constructor(element: Element, lines: string[]) {
    this.element = element
    this.annotations = new Map()

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

    // Parse board first to get otherMarks
    const parsed = validateBoard(lines, { ignoreRules, validateCharacters: false })

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

    const { board, rowCount, columnCount } = this.parsedBoard

    // Generate SVG with annotations
    const boardSvg = boardToSvg(board, rowCount, columnCount, this.annotations)

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
        // Build the continuation tree (everything after the wildcard)
        let continuationTree: SequenceTree = ImmutableMap<Coordinate, SequenceNode>()

        for (let i = path.length - 1; i >= 1; i--) {
          const item = path[i]
          if (item === '*') {
            throw new Error(`Sequence '${sequence}': cannot have consecutive wildcards`)
          }

          const coord = item as Coordinate
          const isLastNode = i === path.length - 1
          const nodeResult = isLastNode
            ? (isSolution ? ProblemResult.Success : ProblemResult.Failure)
            : ProblemResult.Incomplete

          const node: SequenceNode = {
            result: nodeResult,
            children: continuationTree,
            wildcardChild: undefined
          }
          continuationTree = ImmutableMap<Coordinate, SequenceNode>().set(coord, node)
        }

        // Apply wildcardChild to all root nodes (or create a dummy root if tree is empty)
        const wildcardNode: SequenceNode = {
          result: ProblemResult.Incomplete,
          children: continuationTree,
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
    this.currentBoard = addMove(this.currentBoard, move)
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
    this.currentBoard = addMove(this.currentBoard, move)
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
    this.render()
  }

  render(): void {
    const element = this.element
    const { rowCount, columnCount } = this.parsedBoard

    // Generate SVG using current board state
    const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount)

    // Render
    let output = boardSvg

    // Add reset button and result label
    const resetButtonId = `reset-${Math.random().toString(36).substr(2, 9)}`
    const buttonStyle = 'padding: 0.5rem 1rem; margin: 0.5rem 0.25rem; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.9rem;'
    output += `<div style="margin-top: 1rem; display: flex; align-items: center;">`
    output += `<button id="${resetButtonId}" style="${buttonStyle}">Reset</button>`

    // Add result label next to button
    if (this.result === ProblemResult.Success) {
      output += `<span style="margin-left: 1rem; font-weight: 600; font-size: 1.1rem; color: #155724;">Success!</span>`
    } else if (this.result === ProblemResult.Failure) {
      output += `<span style="margin-left: 1rem; font-weight: 600; font-size: 1.1rem; color: #721c24;">Incorrect</span>`
    }

    output += `</div>`

    element.innerHTML = output

    // Add click handler to SVG
    const svg = element.querySelector('svg')
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

export class FreeplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private currentBoard: Board
  private initialBoard: Board
  private history: HistoryEntry[]
  private currentMoveIndex: number // -1 means no moves yet
  private isBlackTurn: boolean

  constructor(element: Element, lines: string[]) {
    this.element = element
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

    const { rowCount, columnCount } = this.parsedBoard

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

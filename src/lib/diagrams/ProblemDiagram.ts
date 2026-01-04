import type { Color } from 'godash'
import { Board, Move, Coordinate, BLACK, WHITE, isLegalMove, addMove, followupKo } from 'godash'
import { Map as ImmutableMap } from 'immutable'
import { validateBoard } from '../validate'
import { parseYaml, extractYamlSection } from '../parseYaml'
import { boardToSvg } from '../render'
import { renderCaptureBar } from '../ui/CaptureBar'
import { renderButtonBar } from '../ui/ButtonBar'
import { renderTurnIndicator, renderResultIcon } from '../ui/TurnIndicator'
import { ICONS } from '../ui/icons'
import type { IDiagram, ParsedBoard, SequenceNode, SequenceTree } from './types'
import { ProblemResult, countCapturesFromDiff } from './types'

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

    // Parse YAML configuration
    const yamlContent = extractYamlSection(lines, parsed.configStartIndex)
    const config = yamlContent ? parseYaml(yamlContent) : {}

    // Parse black and white marks into arrays
    const blackOption = config.black
    const whiteOption = config.white

    const blackMarks = blackOption
      ? (Array.isArray(blackOption) ? blackOption : (typeof blackOption === 'string' ? blackOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
      : []
    const whiteMarks = whiteOption
      ? (Array.isArray(whiteOption) ? whiteOption : (typeof whiteOption === 'string' ? whiteOption.split(',').map(m => m.trim()).filter(m => m.length > 0) : []))
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
    const toPlayOption = config['to-play']
    const toPlayValue = toPlayOption
      ? (Array.isArray(toPlayOption) ? toPlayOption[0] : (typeof toPlayOption === 'string' ? toPlayOption : '')).toLowerCase()
      : ''
    if (toPlayValue && toPlayValue !== 'black' && toPlayValue !== 'white') {
      throw new Error(`Invalid to-play value '${toPlayValue}'. Must be 'black' or 'white'`)
    }
    this.toPlay = toPlayValue === 'white' ? WHITE : BLACK

    // Parse ignore-ko option (default to false)
    const ignoreKoOption = config['ignore-ko']
    this.ignoreKo = ignoreKoOption === 'true' || ignoreKoOption === true

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
    const solutionsOption = config.solutions
    const allSequences: Array<{ sequence: string, isSolution: boolean }> = []
    if (solutionsOption && typeof solutionsOption !== 'boolean') {
      const solutions = Array.isArray(solutionsOption) ? solutionsOption : (typeof solutionsOption === 'string' ? [solutionsOption] : [])
      for (const solution of solutions) {
        validateSequence(solution, 'Solution')
        allSequences.push({ sequence: solution, isSolution: true })
      }
    }

    // Parse and validate sequences
    const sequencesOption = config.sequences
    if (sequencesOption && typeof sequencesOption !== 'boolean') {
      const sequences = Array.isArray(sequencesOption) ? sequencesOption : (typeof sequencesOption === 'string' ? [sequencesOption] : [])
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
      leftIndicator = renderTurnIndicator(this.isBlackTurn)
    } else if (this.result === ProblemResult.Success) {
      // Show check icon when successful
      leftIndicator = renderResultIcon('success')
    } else if (this.result === ProblemResult.Failure) {
      // Show x icon when failed
      leftIndicator = renderResultIcon('failure')
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


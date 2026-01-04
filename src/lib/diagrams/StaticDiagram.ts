import { Move, BLACK, WHITE, addMove } from 'godash'
import { validateBoard } from '../validate'
import { boardToSvg } from '../render'
import { parseYaml, extractYamlSection } from '../parseYaml'
import type { IDiagram, ParsedBoard, AnnotationInfo, AnnotationShape } from './types'

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

    // Parse YAML configuration
    const yamlContent = extractYamlSection(lines, configStartIndex)
    const config = yamlContent ? parseYaml(yamlContent) : {}

    // Extract ignore-rules option (defaults to false)
    const ignoreRulesOption = config['ignore-rules']
    const ignoreRules = ignoreRulesOption === 'true' || ignoreRulesOption === true || ignoreRulesOption === 'yes'

    // Parse area-colors option to build prefix -> color mapping
    const areaColorsOption = config['area-colors']
    if (areaColorsOption && typeof areaColorsOption === 'object' && !Array.isArray(areaColorsOption)) {
      // YAML provides area-colors as an object: {r: red, b: blue}
      for (const [prefix, color] of Object.entries(areaColorsOption)) {
        if (prefix.length === 1 && /^[a-z]$/.test(prefix)) {
          this.areaColors.set(prefix, color)
        } else {
          throw new Error(`Invalid area prefix '${prefix}'. Must be a single lowercase letter (a-z)`)
        }
      }
    }

    // Build set of valid prefixes for validateBoard
    const validPrefixes = this.areaColors.size > 0 ? new Set(this.areaColors.keys()) : undefined

    // Parse board with prefix knowledge
    const parsed = validateBoard(lines, { ignoreRules, validateCharacters: false, validPrefixes })

    // Parse black and white marks from options
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

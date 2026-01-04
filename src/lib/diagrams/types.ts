import type { Color, Board, Coordinate } from 'godash'
import { difference, BLACK, WHITE } from 'godash'
import { Map as ImmutableMap } from 'immutable'

/**
 * Result state for problem diagrams
 */
export const ProblemResult = {
  Success: 'success',
  Failure: 'failure',
  Incomplete: 'incomplete'
} as const

export type ProblemResult = typeof ProblemResult[keyof typeof ProblemResult]

/**
 * Sequence tree node with result and children
 */
export interface SequenceNode {
  result: ProblemResult
  children: SequenceTree
  wildcardChild?: SequenceNode  // For "*" moves - handles any unspecified player move
}

/**
 * Recursive type for sequence tree where each level represents a move option
 */
export type SequenceTree = ImmutableMap<Coordinate, SequenceNode>

/**
 * Parsed board representation with metadata
 */
export interface ParsedBoard {
  board: Board
  rowCount: number
  columnCount: number
  configStartIndex: number
  otherMarks: Record<string, Coordinate[]>
  areaPrefixes: Map<string, string>  // coord key -> prefix (e.g., "0,0" -> "r")
}

/**
 * Base interface for all diagram types
 */
export interface IDiagram {
  render(): void
}

/**
 * Annotation shape types
 */
export type AnnotationShape = 'text' | 'triangle' | 'square' | 'circle' | 'x'

/**
 * Annotation information
 */
export interface AnnotationInfo {
  label: string
  shape: AnnotationShape
}

/**
 * Parsed move with color information
 */
export interface ParsedMove {
  moveNumber: number
  coordinate: Coordinate
  color: Color  // Determined by odd/even (1=black, 2=white, etc.)
}

/**
 * Color mode for freeplay diagrams
 */
export type ColorMode = 'black' | 'white' | 'alternate'

/**
 * Helper function to count captures when playing a move
 * Compares before/after board states to determine which stones were captured
 */
export function countCapturesFromDiff(boardBefore: Board, boardAfter: Board): { whiteCaptured: number, blackCaptured: number } {
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

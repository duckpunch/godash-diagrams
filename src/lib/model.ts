/**
 * Main entry point for godash-diagrams
 * Re-exports all diagram classes and types
 */

// Import diagram classes
import { StaticDiagram } from './diagrams/StaticDiagram'
import { ProblemDiagram } from './diagrams/ProblemDiagram'
import { FreeplayDiagram } from './diagrams/FreeplayDiagram'
import { ReplayDiagram } from './diagrams/ReplayDiagram'

// Export shared types
export type {
  IDiagram,
  ParsedBoard,
  AnnotationShape,
  AnnotationInfo,
  SequenceNode,
  SequenceTree,
  ParsedMove,
  ColorMode,
} from './diagrams/types'

export { ProblemResult, countCapturesFromDiff } from './diagrams/types'
export type { ProblemResult as ProblemResultType } from './diagrams/types'

// Export diagram classes
export { StaticDiagram, ProblemDiagram, FreeplayDiagram, ReplayDiagram }

// Diagram type registry
export const DIAGRAM_TYPES = {
  static: StaticDiagram,
  freeplay: FreeplayDiagram,
  problem: ProblemDiagram,
  replay: ReplayDiagram,
} as const

export type DiagramType = keyof typeof DIAGRAM_TYPES

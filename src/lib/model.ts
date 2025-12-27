import { Board } from 'godash'

export interface ParsedBoard {
  board: Board
  rowCount: number
  columnCount: number
  configStartIndex: number
}

export class StaticDiagram {
  parsedBoard: ParsedBoard

  constructor(parsedBoard: ParsedBoard) {
    this.parsedBoard = parsedBoard
  }
}

export class FreeplayDiagram {
  parsedBoard: ParsedBoard

  constructor(parsedBoard: ParsedBoard) {
    this.parsedBoard = parsedBoard
  }
}

export type Diagram = StaticDiagram | FreeplayDiagram

export const DIAGRAM_TYPES = {
  static: StaticDiagram,
  freeplay: FreeplayDiagram,
} as const

export type DiagramType = keyof typeof DIAGRAM_TYPES

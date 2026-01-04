import { describe, it, expect } from 'vitest'
import { parseYaml, extractYamlSection } from '../parseYaml'

describe('parseYaml', () => {
  it('parses simple key-value pairs', () => {
    const yaml = 'black: A\nwhite: B'
    expect(parseYaml(yaml)).toEqual({ black: 'A', white: 'B' })
  })

  it('parses arrays (flow style)', () => {
    const yaml = 'black: [A, B, C]'
    expect(parseYaml(yaml)).toEqual({ black: ['A', 'B', 'C'] })
  })

  it('parses multi-line arrays', () => {
    const yaml = `black:
  - A
  - B
  - C`
    expect(parseYaml(yaml)).toEqual({ black: ['A', 'B', 'C'] })
  })

  it('parses nested objects (block style)', () => {
    const yaml = `area-colors:
  r: red
  b: blue`
    expect(parseYaml(yaml)).toEqual({
      'area-colors': { r: 'red', b: 'blue' }
    })
  })

  it('parses nested objects (flow style)', () => {
    const yaml = 'area-colors: {r: red, b: blue}'
    expect(parseYaml(yaml)).toEqual({
      'area-colors': { r: 'red', b: 'blue' }
    })
  })

  it('parses boolean values', () => {
    const yaml = 'numbered: true\nignore-ko: false'
    expect(parseYaml(yaml)).toEqual({
      numbered: true,
      'ignore-ko': false
    })
  })

  it('parses mixed content', () => {
    const yaml = `to-play: black
solutions:
  - a>b>d
sequences:
  - f>d>e>b
  - c>b>a
ignore-ko: true`
    expect(parseYaml(yaml)).toEqual({
      'to-play': 'black',
      solutions: ['a>b>d'],
      sequences: ['f>d>e>b', 'c>b>a'],
      'ignore-ko': true
    })
  })

  it('handles empty YAML', () => {
    expect(parseYaml('')).toEqual({})
  })

  it('handles whitespace-only YAML', () => {
    expect(parseYaml('   \n  \n  ')).toEqual({})
  })

  it('handles null YAML result', () => {
    expect(parseYaml('~')).toEqual({})
  })

  it('throws helpful error on invalid YAML', () => {
    const yaml = 'black: [A, B'  // Missing ]
    expect(() => parseYaml(yaml)).toThrow(/YAML parsing error/)
  })

  it('throws error on non-object YAML', () => {
    const yaml = '- item1\n- item2'  // Top-level array
    expect(() => parseYaml(yaml)).toThrow('Configuration must be a YAML object')
  })

  it('converts numeric values to strings', () => {
    const yaml = 'initial-move: 5'
    expect(parseYaml(yaml)).toEqual({ 'initial-move': '5' })
  })

  it('handles keys with hyphens', () => {
    const yaml = 'to-play: black\nignore-ko: true\nstart-color: white'
    expect(parseYaml(yaml)).toEqual({
      'to-play': 'black',
      'ignore-ko': true,
      'start-color': 'white'
    })
  })

  it('handles special characters in strings', () => {
    const yaml = 'sequences: [.>d, "a>b>c"]'
    expect(parseYaml(yaml)).toEqual({
      sequences: ['.>d', 'a>b>c']
    })
  })
})

describe('extractYamlSection', () => {
  it('extracts YAML after --- separator', () => {
    const lines = ['board', '---', 'black: A', 'white: B']
    expect(extractYamlSection(lines, 0)).toBe('black: A\nwhite: B')
  })

  it('returns empty string if no --- found', () => {
    const lines = ['board', 'black: A']
    expect(extractYamlSection(lines, 0)).toBe('')
  })

  it('handles --- with leading whitespace', () => {
    const lines = ['board', '  ---  ', 'black: A']
    expect(extractYamlSection(lines, 0)).toBe('black: A')
  })

  it('handles --- at different positions', () => {
    const lines = ['type', 'board', 'content', '---', 'config: value']
    expect(extractYamlSection(lines, 2)).toBe('config: value')
  })

  it('extracts multi-line YAML', () => {
    const lines = [
      'board',
      '---',
      'black: [A, B]',
      'white: [C]',
      'area-colors:',
      '  r: red',
      '  b: blue'
    ]
    expect(extractYamlSection(lines, 0)).toBe(
      'black: [A, B]\nwhite: [C]\narea-colors:\n  r: red\n  b: blue'
    )
  })

  it('handles empty content after ---', () => {
    const lines = ['board', '---']
    expect(extractYamlSection(lines, 0)).toBe('')
  })

  it('starts search from provided index', () => {
    const lines = ['skip', 'this', '---', 'early', 'board', '---', 'config: value']
    expect(extractYamlSection(lines, 4)).toBe('config: value')
  })
})

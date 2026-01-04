import YAML from 'yaml'

/**
 * Parse YAML configuration content into normalized config object
 *
 * @param yamlContent - Raw YAML string to parse
 * @returns Normalized configuration object with string, string[], or nested object values
 *
 * @example
 * const yaml = 'black: [A, B]\nwhite: C'
 * const config = parseYaml(yaml)
 * // { black: ['A', 'B'], white: 'C' }
 */
export function parseYaml(
  yamlContent: string
): Record<string, string | boolean | string[] | Record<string, string>> {
  // Handle empty content
  if (!yamlContent || yamlContent.trim() === '') {
    return {}
  }

  try {
    const parsed = YAML.parse(yamlContent)

    // Handle null or non-object result
    if (parsed === null) {
      return {}
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Configuration must be a YAML object (key-value pairs)')
    }

    // Normalize values to expected types
    const normalized: Record<string, string | boolean | string[] | Record<string, string>> = {}

    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        // Keep arrays, convert elements to strings
        normalized[key] = value.map(v => String(v))
      } else if (typeof value === 'boolean') {
        // Keep boolean values as-is
        normalized[key] = value
      } else if (typeof value === 'object' && value !== null) {
        // For nested objects (e.g., area-colors: {r: red, b: blue})
        const nested: Record<string, string> = {}
        for (const [k, v] of Object.entries(value)) {
          nested[k] = String(v)
        }
        normalized[key] = nested
      } else {
        // Scalar values - convert to string
        normalized[key] = String(value)
      }
    }

    return normalized
  } catch (error) {
    if (error instanceof YAML.YAMLParseError) {
      const line = error.linePos?.[0]?.line
      const lineInfo = line !== undefined ? ` at line ${line}` : ''
      throw new Error(`YAML parsing error${lineInfo}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract YAML section from diagram lines
 * Looks for '---' separator and returns everything after it
 *
 * @param lines - Array of diagram source lines
 * @param startIndex - Index to start searching from (after board section)
 * @returns YAML content as a string, or empty string if no YAML section found
 *
 * @example
 * const lines = ['board', '---', 'black: A', 'white: B']
 * const yaml = extractYamlSection(lines, 0)
 * // 'black: A\nwhite: B'
 */
export function extractYamlSection(lines: string[], startIndex: number): string {
  // Find the --- separator
  let yamlStartIndex = -1
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      yamlStartIndex = i + 1
      break
    }
  }

  if (yamlStartIndex === -1) {
    // No YAML config section
    return ''
  }

  // Extract all lines after ---
  return lines.slice(yamlStartIndex).join('\n')
}

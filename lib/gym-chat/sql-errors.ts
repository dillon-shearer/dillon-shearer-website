import type { GymChatQuery } from '@/types/gym-chat'

type SqlErrorInterpretation = {
  diagnosis: string
  suggestion: string
}

const interpretSqlError = (error: string): SqlErrorInterpretation => {
  const normalized = error.toLowerCase()
  const missingFrom = error.match(/missing from-clause entry for table \"([^\"]+)\"/i)
  if (missingFrom?.[1]) {
    const table = missingFrom[1]
    return {
      diagnosis: `The query references "${table}" but never joins it in FROM.`,
      suggestion:
        `Add a JOIN to ${table} with the correct key (for gym data this is often the date), ` +
        'or include it in the FROM clause with the proper alias.',
    }
  }
  if (normalized.includes('unsupported syntax')) {
    return {
      diagnosis: error,
      suggestion: 'Rewrite the query using the supported subset (no FILTER or window frames).',
    }
  }
  if (normalized.includes('unexpected word token')) {
    return {
      diagnosis: error,
      suggestion: 'Rewrite the query without window frame clauses or unsupported keywords.',
    }
  }
  const missingColumn = error.match(/column \"([^\"]+)\" does not exist/i)
  if (missingColumn?.[1]) {
    return {
      diagnosis: `The query references a column that does not exist: "${missingColumn[1]}".`,
      suggestion: 'Check the schema and update the column name or qualify it with the correct table alias.',
    }
  }
  const missingRelation = error.match(/relation \"([^\"]+)\" does not exist/i)
  if (missingRelation?.[1]) {
    return {
      diagnosis: `The query references a table that does not exist: "${missingRelation[1]}".`,
      suggestion: 'Check the schema and update the table name or schema qualifier.',
    }
  }
  const ambiguousColumn = error.match(/column reference \"([^\"]+)\" is ambiguous/i)
  if (ambiguousColumn?.[1]) {
    return {
      diagnosis: `The column "${ambiguousColumn[1]}" is ambiguous because multiple tables expose it.`,
      suggestion: 'Qualify the column with its table alias (e.g., t.column_name).',
    }
  }
  const syntaxError = error.match(/syntax error at or near \"([^\"]+)\"/i)
  if (syntaxError?.[1]) {
    return {
      diagnosis: `The SQL has a syntax error near "${syntaxError[1]}".`,
      suggestion: 'Check the SELECT syntax, commas, and parentheses around that token.',
    }
  }
  if (normalized.includes('timeout')) {
    return {
      diagnosis: 'The query exceeded the statement timeout.',
      suggestion: 'Add a tighter filter or reduce the time window to narrow the dataset.',
    }
  }
  return {
    diagnosis: 'The query failed to execute due to a SQL error.',
    suggestion: 'Review the SQL and ensure all referenced tables and columns are valid.',
  }
}

const windowToDays = (window: string | null | undefined): number | null => {
  if (!window || window === 'all_time') return null
  const match = window.match(/(\d+)[-\s]*(day|week|month|year)s?\b/i)
  if (!match?.[1] || !match[2]) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = match[2].toLowerCase()
  if (unit === 'day') return value
  if (unit === 'week') return value * 7
  if (unit === 'month') return value * 30
  if (unit === 'year') return value * 365
  return null
}

export const buildSqlErrorAssistantMessage = (
  question: string,
  queries: GymChatQuery[],
  options?: { nextSqlById?: Record<string, string>; debug?: boolean; timeWindow?: string },
): { message: string; followUps?: string[] } => {
  const allFailed = queries.length > 0 && queries.every(query => query.error)
  if (allFailed && !options?.debug) {
    const normalizedQuestion = question.toLowerCase()
    const isMuscleGroupQuestion =
      normalizedQuestion.includes('muscle group') ||
      normalizedQuestion.includes('body part') ||
      normalizedQuestion.includes('body parts')
    if (isMuscleGroupQuestion) {
      return [
        "I couldn't safely run this analysis on your logs.",
        'This usually means the query structure was invalid.',
        "Try something like: 'Compare my chest vs back volume over the last 12 weeks.'",
      ].join('\n')
    }
    // Suggest specific alternatives based on query intent
    const suggestedAlternatives: string[] = []
    if (normalizedQuestion.includes('time') && normalizedQuestion.includes('day')) {
      suggestedAlternatives.push("'What time of day do I usually work out?'")
    }
    if (normalizedQuestion.includes('haven') || normalizedQuestion.includes('not done') || normalizedQuestion.includes('missing')) {
      suggestedAlternatives.push("'What exercises haven't I done in the last month?'")
    }
    if (normalizedQuestion.includes('best') && (normalizedQuestion.includes('1rm') || normalizedQuestion.includes('pr'))) {
      suggestedAlternatives.push("'What's my best one rep max?'")
    }
    if (normalizedQuestion.includes('trend') || normalizedQuestion.includes('progress')) {
      suggestedAlternatives.push("'Show my Bench Press progression over the last 12 months.'")
    }
    if (normalizedQuestion.includes('summary') || normalizedQuestion.includes('overview')) {
      suggestedAlternatives.push("'Show my exercise summary for the last 90 days.'")
    }

    const alternativesText = suggestedAlternatives.length > 0
      ? `Try one of these:\n${suggestedAlternatives.map(a => `- ${a}`).join('\n')}`
      : 'Try re-asking with a specific lift and timeframe, e.g. "last 12 weeks of Hack Squats".'

    // Generate narrower window follow-ups based on timeWindow
    const followUps: string[] = []
    if (options?.timeWindow && options.timeWindow !== 'all_time') {
      const days = windowToDays(options.timeWindow)
      if (days && days > 30) {
        if (days > 180) followUps.push('Try the last 90 days')
        if (days > 60) followUps.push('Try the last 8 weeks')
        followUps.push('Try the last 30 days')
      }
    } else if (options?.timeWindow === 'all_time') {
      followUps.push('Try the last 12 months')
      followUps.push('Try the last 90 days')
    }

    return {
      message: [
        "I couldn't safely run this analysis on your logs.",
        'This usually means the filters or time window were too broad or referenced something that does not exist.',
        alternativesText,
        'If you want, I can retry with a narrower window or different filters.',
      ].join('\n'),
      followUps: followUps.length > 0 ? followUps : undefined,
    }
  }
  const issues = queries
    .filter(query => query.error)
    .map(query => ({
      queryId: query.id,
      purpose: query.purpose,
      error: query.error ?? 'Query failed.',
      interpretation: interpretSqlError(query.error ?? ''),
      sql: query.sql,
    }))

  const lines: string[] = []
  lines.push('I could not run the SQL for your request.')
  lines.push('')
  lines.push('Issues found:')
  issues.forEach(issue => {
    lines.push(
      `- ${issue.queryId}${issue.purpose ? ` (${issue.purpose})` : ''}: ${issue.interpretation.diagnosis}`,
    )
    lines.push(`  Error: ${issue.error}`)
    lines.push(`  Proposed fix: ${issue.interpretation.suggestion}`)
    const nextSql = options?.nextSqlById?.[issue.queryId]
    if (nextSql) {
      lines.push('  Next SQL to run:')
      lines.push(`  ${nextSql}`)
    } else if (issue.sql) {
      lines.push('  SQL that failed:')
      lines.push(`  ${issue.sql}`)
    }
  })
  lines.push('')
  lines.push(
    'I do not have any query results yet, so I cannot answer the data-backed portion of your question.',
  )
  lines.push(
    'If you want, I can retry the query with the fix. I can also provide general training guidance without using your logs.',
  )
  if (question) {
    lines.push('')
    lines.push(`Original question: "${question}"`)
  }
  return { message: lines.join('\n') }
}

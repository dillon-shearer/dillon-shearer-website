import { getCatalogTables } from './catalog'

export type SetsBaseCte = {
  alias: string
  cte: string
  sessionDateExpr: string
  performedAtExpr: string
  est1rmExpr: string
  volumeExpr: string
  dayTagExpr: string | null
}

const resolveSetsDateExpressions = () => {
  const tables = getCatalogTables()
  const lifts = tables.find(table => table.name.toLowerCase() === 'gym_lifts')
  const hasTimestamp = lifts?.columns.some(column => column.name.toLowerCase() === 'timestamp') ?? false
  const hasDayTag = lifts?.columns.some(column => column.name.toLowerCase() === 'day_tag') ?? false
  const hasSetNumber = lifts?.columns.some(column => column.name.toLowerCase() === 'set_number') ?? false
  const hasEquipment = lifts?.columns.some(column => column.name.toLowerCase() === 'equipment') ?? false
  const hasUnilateral = lifts?.columns.some(column => column.name.toLowerCase() === 'is_unilateral') ?? false
  const dateExpr = hasTimestamp ? 'COALESCE(gl.date::date, gl.timestamp::date)' : 'gl.date::date'
  const timestampExpr = hasTimestamp
    ? 'COALESCE(gl.timestamp::timestamptz, gl.date::timestamptz)'
    : 'gl.date::timestamptz'
  return {
    dateExpr,
    timestampExpr,
    dayTagExpr: hasDayTag ? 'gl.day_tag' : null,
    setNumberExpr: hasSetNumber ? 'gl.set_number' : null,
    equipmentExpr: hasEquipment ? 'gl.equipment' : null,
    unilateralExpr: hasUnilateral ? 'gl.is_unilateral' : null,
  }
}

export const buildSetsBaseCte = (alias = 'sets'): SetsBaseCte => {
  const { dateExpr, timestampExpr, dayTagExpr, setNumberExpr, equipmentExpr, unilateralExpr } =
    resolveSetsDateExpressions()
  const dayTagSelect = dayTagExpr ? `, ${dayTagExpr} AS day_tag` : ''
  const setNumberSelect = setNumberExpr ? `, ${setNumberExpr} AS set_number` : ''
  const equipmentSelect = equipmentExpr ? `, ${equipmentExpr} AS equipment` : ''
  const unilateralSelect = unilateralExpr ? `, ${unilateralExpr} AS is_unilateral` : ''
  const est1rmExpr = 'gl.weight * (1 + gl.reps / 30.0)'
  const volumeExpr = 'gl.weight * gl.reps'
  const cte =
    `${alias} AS (` +
    'SELECT gl.exercise, gl.weight, gl.reps, ' +
    `${dateExpr} AS session_date, ` +
    `${timestampExpr} AS performed_at, ` +
    `${dateExpr} AS date, ` +
    `${timestampExpr} AS timestamp, ` +
    `${est1rmExpr} AS est_1rm, ` +
    `${volumeExpr} AS volume` +
    dayTagSelect +
    setNumberSelect +
    equipmentSelect +
    unilateralSelect +
    ' FROM gym_lifts gl' +
    ')'
  return {
    alias,
    cte,
    sessionDateExpr: `${alias}.session_date`,
    performedAtExpr: `${alias}.performed_at`,
    est1rmExpr: `${alias}.est_1rm`,
    volumeExpr: `${alias}.volume`,
    dayTagExpr: dayTagExpr ? `${alias}.day_tag` : null,
  }
}

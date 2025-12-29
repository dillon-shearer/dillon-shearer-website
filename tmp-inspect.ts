import { parse } from 'pgsql-ast-parser'

const query = `SELECT lacking.body_part FROM (SELECT body_part FROM gym_day_meta) AS lacking`
const ast = parse(query)
console.log(JSON.stringify(ast, null, 2))

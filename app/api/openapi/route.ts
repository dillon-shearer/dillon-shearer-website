// app/api/openapi/route.ts
import { NextResponse } from 'next/server'

/**
 * OpenAPI 3.0 spec for the Gym Tracker export endpoints.
 * Serves JSON at /api/openapi
 */
export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Gym Tracker Exports',
      version: '1.0.0',
      description:
        'OpenAPI schema for the JSON and CSV export endpoints used by the Gym Tracker dashboard.',
      contact: { name: 'Gym Tracker', url: 'https://example.com' }
    },
    servers: [
      { url: '/', description: 'Same origin' }
    ],
    tags: [{ name: 'exports', description: 'Dataset exports' }],
    paths: {
      '/api/gym-data': {
        get: {
          tags: ['exports'],
          summary: 'Export lifts as JSON',
          description:
            'Returns gym lifts with derived fields. Supports filtering by date range and excluding specific fields.',
          parameters: [
            {
              name: 'from',
              in: 'query',
              description: 'Start date (inclusive), format YYYY-MM-DD',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
            },
            {
              name: 'to',
              in: 'query',
              description: 'End date (inclusive), format YYYY-MM-DD',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
            },
            {
              name: 'exclude',
              in: 'query',
              description:
                'Comma-separated list of fields to remove from each row (e.g., `day_of_week,iso_week`)',
              required: false,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      meta: {
                        type: 'object',
                        properties: {
                          count: { type: 'integer', example: 42 },
                          generated_at: { type: 'string', format: 'date-time' },
                          fields: {
                            type: 'array',
                            items: { type: 'string' }
                          },
                          filter: {
                            type: 'object',
                            properties: {
                              from: { type: 'string', nullable: true },
                              to: { type: 'string', nullable: true }
                            }
                          },
                          note: { type: 'string' }
                        }
                      },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/OutRow' }
                      }
                    }
                  },
                  examples: {
                    default: {
                      value: {
                        meta: {
                          count: 2,
                          generated_at: '2025-10-23T12:34:56.000Z',
                          fields: [
                            'id','date','exercise','weight','reps','setNumber','timestamp',
                            'dayTag','isUnilateral','volume','oneRM_est','day_of_week',
                            'iso_week','month','year'
                          ],
                          filter: { from: '2025-10-01', to: '2025-10-23' },
                          note: 'Wide export with raw + derived fields (includes dayTag and isUnilateral; excludes bodyParts).'
                        },
                        data: [
                          {
                            id: 'lift_123',
                            date: '2025-10-23',
                            exercise: 'Bench Press',
                            weight: 225,
                            reps: 5,
                            setNumber: 1,
                            timestamp: '2025-10-23T14:02:10.000Z',
                            dayTag: 'push day',
                            isUnilateral: false,
                            volume: 1125,
                            oneRM_est: 262,
                            day_of_week: 'Thu',
                            iso_week: '2025-W43',
                            month: '2025-10',
                            year: 2025
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/gym-data.csv': {
        get: {
          tags: ['exports'],
          summary: 'Export lifts as CSV',
          description:
            'CSV export of gym lifts with derived fields. Headers are derived from the first row unless fields are excluded.',
          parameters: [
            {
              name: 'from',
              in: 'query',
              description: 'Start date (inclusive), format YYYY-MM-DD',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
            },
            {
              name: 'to',
              in: 'query',
              description: 'End date (inclusive), format YYYY-MM-DD',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
            },
            {
              name: 'exclude',
              in: 'query',
              description:
                'Comma-separated list of fields to remove from the CSV output (e.g., `day_of_week,iso_week`)',
              required: false,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'OK (CSV)',
              headers: {
                'Content-Disposition': {
                  schema: { type: 'string' },
                  description: 'Suggested filename'
                }
              },
              content: {
                'text/csv': {
                  schema: { type: 'string', example: 'id,date,exercise,...\n...' }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        GymLift: {
          type: 'object',
          required: [
            'id','date','exercise','weight','reps','setNumber','timestamp'
          ],
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date', example: '2025-10-23' },
            exercise: { type: 'string', example: 'Back Squat' },
            weight: { type: 'number', example: 315 },
            reps: { type: 'number', example: 5 },
            setNumber: { type: 'number', example: 3 },
            timestamp: { type: 'string', format: 'date-time' },
            dayTag: { type: 'string', nullable: true, example: 'leg day' },
            isUnilateral: { type: 'boolean', nullable: true, example: false }
          }
        },
        OutRow: {
          allOf: [
            { $ref: '#/components/schemas/GymLift' },
            {
              type: 'object',
              properties: {
                volume: { type: 'number', example: 1575 },
                oneRM_est: { type: 'number', example: 368 },
                day_of_week: { type: 'string', example: 'Thu' },
                iso_week: { type: 'string', example: '2025-W43' },
                month: { type: 'string', example: '2025-10' },
                year: { type: 'number', example: 2025 }
              }
            }
          ]
        }
      }
    }
  }

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}

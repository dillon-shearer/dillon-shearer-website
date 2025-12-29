# Gym Chat Eval Harness

## Prereqs
- `OPENAI_API_KEY` or `GYM_CHAT_OPENAI_API_KEY`
- `GYM_CHAT_DATABASE_URL_READONLY` (or `POSTGRES_URL` in development)

## Run
```
npm run gym-chat:eval
```

## Output
- Results are written to `eval/results/<timestamp>.json`
- Each entry captures intent classification, selected templates, query count, fallback citation usage, and message length

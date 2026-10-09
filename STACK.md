# Tech stack

- database: supabase
- s3 obeject storage: supabase
- authentication provider: supabase
- webapp: nextjs + tailwindcss
- runtime: Nodejs
- cron manager: temporal.io cron scheduler
- message broker: temporal.io signals (trigger SDLC workflow), temporal nexus and rabbitMQ as alternatives
- orchestation: temporal.io
- agents: openagent-sdk for complex tasks (coding), claude agent sdk as alternative, vercel/ai for basic to med tasks.
- llm sdk: vercel/ai (for plain llm queries)
- vlm sdk: vercel/ai (for visual lang models queries)
- analytics ingestion: otel + signoz
- analytics db: clickhouse
- styles: tailwindcss + react motion

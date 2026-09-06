# NextAura

NextAura is a multi-tenant business application suite built with React, TypeScript, Vite, and Supabase.

## NextAura AI

The `nextaura-ai` Supabase Edge Function is the only AI provider boundary. It verifies the signed-in user, confirms active organization membership, queries business data through a user-scoped Supabase client so RLS remains active, applies an additional role-aware data policy, and calls the OpenAI Responses API with response storage disabled.

Required Edge Function secrets:

```text
OPENAI_API_KEY=...
NEXTAURA_AI_MODEL=gpt-5.6-luna
```

`NEXTAURA_AI_MODEL` is optional. The provider is intentionally unavailable until `OPENAI_API_KEY` is configured server-side. Never add an AI provider key to a `VITE_*` variable.

Deploy after authenticating the Supabase CLI against the intended project:

```bash
supabase secrets set OPENAI_API_KEY=... NEXTAURA_AI_MODEL=gpt-5.6-luna
supabase functions deploy nextaura-ai
```

The public pricing page is available at `/pricing`; authenticated users can also open Pricing from the application sidebar or Settings → Billing & plans.

## Frontend development

Copy `.env.example` to `.env.local`, supply the browser-safe Supabase project values, then run:

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm run build
```

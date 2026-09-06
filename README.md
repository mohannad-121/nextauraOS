# NextAura

NextAura is a multi-tenant business application suite built with React, TypeScript, Vite, and Supabase.

## NextAura AI

NextAura AI runs on a deterministic local intelligence engine. It uses a structured product knowledge base, intent and keyword scoring, typo-tolerant matching, conversation context, page awareness, response templates, and safe navigation actions. It does not require a model service or an AI credential.

The authenticated `nextaura-ai` Supabase Edge Function is the secure data boundary. It verifies the signed-in user, confirms active organization membership, and queries only role-permitted workspace records through a user-scoped Supabase client so Row Level Security remains active. The local engine combines that tenant-scoped context with its product knowledge and returns the answer, sources, suggested follow-ups, navigation actions, intent, confidence, and conversation context.

Deploy after authenticating the Supabase CLI against the intended project:

```bash
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
npm run test:ai
npm run lint
npm run build
```

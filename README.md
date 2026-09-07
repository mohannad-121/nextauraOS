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

## Paddle Sandbox billing

The paid-plan flow uses Paddle.js in the browser and signed Paddle notifications in Supabase Edge Functions. The free plan remains internal.

Browser environment variables (`.env.local`):

```bash
VITE_PADDLE_ENV=sandbox
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PADDLE_STANDARD_MONTHLY_PRICE_ID=pri_01m1xkjn0e25b2fh64xc3gwtwz
VITE_PADDLE_STANDARD_YEARLY_PRICE_ID=pri_01m1xkkmx9jnt7fm8dgp39g5cr
VITE_PADDLE_CUSTOM_MONTHLY_PRICE_ID=pri_01m1xkra5038az9bs921zmapwy
VITE_PADDLE_CUSTOM_YEARLY_PRICE_ID=pri_01m1xkrxamktvhqbxbgmsd5p6q
```

Set these as Supabase Edge Function secrets (never expose them to the browser):

```bash
PADDLE_ENV=sandbox
PADDLE_API_KEY=pdl_sdbx_apikey_...
PADDLE_NOTIFICATION_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_STANDARD_MONTHLY_PRICE_ID=pri_01m1xkjn0e25b2fh64xc3gwtwz
PADDLE_STANDARD_YEARLY_PRICE_ID=pri_01m1xkkmx9jnt7fm8dgp39g5cr
PADDLE_CUSTOM_MONTHLY_PRICE_ID=pri_01m1xkra5038az9bs921zmapwy
PADDLE_CUSTOM_YEARLY_PRICE_ID=pri_01m1xkrxamktvhqbxbgmsd5p6q
```

Deploy `prepare-paddle-checkout`, `create-paddle-portal`, `update-subscription-seats`, `activate-free-plan`, and `paddle-webhook` after applying the Paddle billing migration. Configure the Paddle Sandbox notification destination to post to `https://<project-ref>.supabase.co/functions/v1/paddle-webhook`, subscribe to customer, subscription, and transaction events, and use that destination's secret as `PADDLE_NOTIFICATION_WEBHOOK_SECRET`.

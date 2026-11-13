# A-Level Tutor

Next.js 15, TypeScript, Tailwind, Framer Motion, Supabase (auth + Postgres), Anthropic API.

## Setup
1. `npm install`
2. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
3. `cp .env.example .env.local` and fill in the Supabase URL and anon key, and your `ANTHROPIC_API_KEY`
   (server-side only; it is never sent to the browser).
4. `npm run dev`, open http://localhost:3000, create an account.

## How the tutor remembers you
Each reply the tutor judges ends with a hidden `<assessment>` line. The API route strips it, saves the
attempt, and updates `topic_mastery` (see `lib/mastery.ts`: correct-with-understanding counts fully,
correct-but-memorised about half, wrong lowers the score). Every new message injects your weakest topics,
strong topics and recent mistakes into the system prompt (`lib/tutor.ts`).

# Project Rules

- Database: Neon Postgres (accessed from the browser via the Neon Data API)
- Never suggest Prisma or ORM migrations.
- Use SQL migrations.
- Use UUID primary keys.
- RLS is enabled on all user data tables; policies use auth.user_id() (Neon Auth JWT).
- Ingredients drive recipe-synergy queries.

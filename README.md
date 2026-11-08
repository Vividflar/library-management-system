# Library Management System

A NestJS + Prisma + PostgreSQL backend for a library's book catalog.

## Setup

```bash
cd api
npm install
cp .env.example .env          # then paste your hosted Postgres URL (Neon / Supabase)
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio             # optional: browse the data
npm run start:dev
```

The seed command needs this entry in `api/package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

## Schema Decisions

**Why `Book` references `Genre` instead of embedding it.**
In PostgreSQL, a relationship between two things is expressed with a foreign key, not by nesting one record inside another. `Book.genreId` points at a single row in `Genre`, and Prisma exposes it through `@relation(fields: [genreId], references: [id])`. I chose this over embedding a genre name or object inside every book for these reasons:

- **One source of truth.** A genre's name and slug live in exactly one row. Renaming "Sci-Fi" to "Science Fiction" is a single update, and every book reflects it immediately. With embedded copies, I would have to rewrite every book and risk missing some.
- **No drift or typos.** "Fantasy", "fantasy" and "Fantsy" can never become three different genres, because a book can only point at a genre that actually exists. The database enforces this.
- **Genres are first-class.** Genres can be listed, filtered (`GET /books?genreId=2`), and given their own endpoints and fields later without touching the books table.
- **Efficient queries.** Finding all books in a genre is an indexed lookup on `genreId`, and Prisma's `include: { genre: true }` joins the genre back in when needed.

**Other decisions**

- `Role` is a Prisma enum (`PATRON`, `LIBRARIAN`), so the database rejects any other value. `User.role` defaults to `PATRON`, the least-privileged role.
- `Book.isbn` is `@unique` so the same title cannot be catalogued twice. `Genre.name` and `Genre.slug` are unique too.
- `totalCopies` and `availableCopies` are separate fields so borrowing logic can later decrement availability without losing the real stock count.
- The seed uses `upsert`, so it can be run repeatedly without creating duplicates.

### Stretch: `Review`

`Review` (`bookId`, `userId`, `rating`, `comment`) adds two more one-to-many relations: a Book has many Reviews and a User has many Reviews. `@@unique([bookId, userId])` limits each user to one review per book, and `onDelete: Cascade` removes reviews when their book or user is deleted.

### Stretch: Prisma vs. a document database

In a document database like MongoDB, the natural instinct is to embed related data, for example storing a genre object or a list of reviews inside each book document. In Prisma, I had to define the genre and reviews as their own models and connect them with foreign keys. It felt like more upfront design, but it means the database enforces consistency, and the schema file keeps the tables, the TypeScript types and the validation in sync.

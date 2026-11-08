// api/prisma/seed.ts
import pkg from '@prisma/client';
const { PrismaClient, Role } = pkg;

const prisma = new PrismaClient();

const genres = [
  { name: 'Science Fiction', slug: 'science-fiction' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Non-Fiction', slug: 'non-fiction' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Literary Fiction', slug: 'literary-fiction' },
];

// genreSlug links each book to its genre; copies default to 3 total / 3 available
const books = [
  // Science Fiction
  { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593', genreSlug: 'science-fiction' },
  { title: 'Neuromancer', author: 'William Gibson', isbn: '9780441569595', genreSlug: 'science-fiction' },
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', genreSlug: 'science-fiction' },
  { title: 'Foundation', author: 'Isaac Asimov', isbn: '9780553293357', genreSlug: 'science-fiction' },
  // Mystery
  { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', isbn: '9780307949486', genreSlug: 'mystery' },
  { title: 'Gone Girl', author: 'Gillian Flynn', isbn: '9780307588371', genreSlug: 'mystery' },
  { title: 'And Then There Were None', author: 'Agatha Christie', isbn: '9780062073488', genreSlug: 'mystery' },
  { title: 'The Big Sleep', author: 'Raymond Chandler', isbn: '9780394758282', genreSlug: 'mystery' },
  // Non-Fiction
  { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316110', genreSlug: 'non-fiction' },
  { title: 'Educated', author: 'Tara Westover', isbn: '9780399590504', genreSlug: 'non-fiction' },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', genreSlug: 'non-fiction' },
  { title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', isbn: '9780135957059', genreSlug: 'non-fiction' },
  // Fantasy
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', genreSlug: 'fantasy' },
  { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', isbn: '9780547773742', genreSlug: 'fantasy' },
  { title: 'The Name of the Wind', author: 'Patrick Rothfuss', isbn: '9780756404741', genreSlug: 'fantasy' },
  { title: 'Mistborn: The Final Empire', author: 'Brandon Sanderson', isbn: '9780765311788', genreSlug: 'fantasy' },
  // Literary Fiction
  { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '9780385474542', genreSlug: 'literary-fiction' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', genreSlug: 'literary-fiction' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', genreSlug: 'literary-fiction' },
  { title: 'Beloved', author: 'Toni Morrison', isbn: '9781400033416', genreSlug: 'literary-fiction' },
];

async function main() {
  // Genres first, so books can reference their ids. upsert keeps the seed re-runnable.
  const genreIdBySlug: Record<string, number> = {};
  for (const g of genres) {
    const genre = await prisma.genre.upsert({
      where: { slug: g.slug },
      update: { name: g.name },
      create: g,
    });
    genreIdBySlug[g.slug] = genre.id;
  }

  for (const { genreSlug, ...book } of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: {
        ...book,
        totalCopies: 3,
        availableCopies: 3,
        genreId: genreIdBySlug[genreSlug],
      },
    });
  }

  // Sample users (one per Role) and reviews for the stretch relation
  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@example.com' },
    update: {},
    create: { email: 'librarian@example.com', name: 'Lena Librarian', role: Role.LIBRARIAN },
  });
  const patron = await prisma.user.upsert({
    where: { email: 'patron@example.com' },
    update: {},
    create: { email: 'patron@example.com', name: 'Pat Patron', role: Role.PATRON },
  });

  const dune = await prisma.book.findUniqueOrThrow({ where: { isbn: '9780441013593' } });
  const hobbit = await prisma.book.findUniqueOrThrow({ where: { isbn: '9780547928227' } });
  await prisma.review.upsert({
    where: { bookId_userId: { bookId: dune.id, userId: patron.id } },
    update: {},
    create: { bookId: dune.id, userId: patron.id, rating: 5, comment: 'A towering classic.' },
  });
  await prisma.review.upsert({
    where: { bookId_userId: { bookId: hobbit.id, userId: librarian.id } },
    update: {},
    create: { bookId: hobbit.id, userId: librarian.id, rating: 4, comment: 'Great for new readers.' },
  });

  console.log(`Seeded ${genres.length} genres, ${books.length} books, 2 users, 2 reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
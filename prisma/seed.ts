import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log('Seed complete.'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

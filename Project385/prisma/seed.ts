import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const games = [
    ['Valorant', 'valorant', ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']],
    ['Apex Legends', 'apex-legends', ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Predator']],
    ['CS2', 'cs2', ['Silver I', 'Silver Elite', 'Gold Nova', 'Master Guardian', 'Legendary Eagle', 'Supreme', 'Global Elite']],
    ['Overwatch 2', 'overwatch-2', ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion']],
  ] as const;

  for (const [name, slug, ranks] of games) {
    await prisma.game.upsert({
      where: { slug },
      update: { name, ranks: [...ranks] },
      create: { name, slug, ranks: [...ranks] },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const games = [
        ['Valorant', 'valorant', ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']],
        ['Apex Legends', 'apex-legends', ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Predator']],
        ['CS2', 'cs2', ['Silver I', 'Silver Elite', 'Gold Nova', 'Master Guardian', 'Legendary Eagle', 'Supreme', 'Global Elite']],
        ['Overwatch 2', 'overwatch-2', ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion']],
    ];
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

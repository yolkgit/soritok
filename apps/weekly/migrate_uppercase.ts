import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Converting TimeSlot statuses to UPPERCASE...");
    await prisma.$executeRawUnsafe(`UPDATE TimeSlot SET status = UPPER(status)`);
    console.log("Converting User premiumStatus to UPPERCASE...");
    await prisma.$executeRawUnsafe(`UPDATE User SET premiumStatus = UPPER(premiumStatus)`);
    console.log("Migration complete");
}
main().catch(console.error).finally(() => prisma.$disconnect());

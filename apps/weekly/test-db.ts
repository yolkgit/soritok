
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        const children = await prisma.child.findMany();
        console.log('Successfully fetched children:', children);
    } catch (e) {
        console.error('Error fetching children:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

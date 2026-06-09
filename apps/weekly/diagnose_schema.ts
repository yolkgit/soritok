
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Diagnosing Database Schema...");
    try {
        console.log("1. Checking connection...");
        await prisma.$connect();
        console.log("Connected to database.");

        console.log("2. Listing tables (MySQL)...");
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log("Tables:", tables);

        console.log("3. Checking AppConfig table...");
        try {
            const appConfigs = await (prisma as any).appConfig.findMany();
            console.log("AppConfig count:", appConfigs.length);
        } catch (e) {
            console.error("AppConfig table error:", (e as any).message);
        }

        console.log("4. Checking RewardConfig columns...");
        try {
            const columns = await prisma.$queryRaw`SHOW COLUMNS FROM RewardConfig`;
            console.log("RewardConfig Columns:", columns);
        } catch (e) {
            console.error("RewardConfig table error (might not exist):", (e as any).message);
        }

    } catch (e) {
        console.error("Diagnosis failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

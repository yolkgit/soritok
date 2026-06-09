
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Data ---');

    // 1. Get all children
    const children = await prisma.child.findMany({
        include: { rewardConfig: true }
    });

    for (const child of children) {
        console.log(`\nChild: ${child.name} (${child.id})`);
        console.log('Reward Config:', child.rewardConfig);

        // 2. Get Schedule (Completed/Failed)
        const schedule = await prisma.timeSlot.findMany({
            where: { childId: child.id }
        });

        let calculatedScore = 0;
        let completedCount = 0;
        let failedCount = 0;

        console.log('\n- Schedule Summary:');
        schedule.forEach(slot => {
            if (slot.status === 'COMPLETED' || (slot.status as any) === 'FAILED') {
                const points = (child.rewardConfig as any)[slot.type] || 0;

                if (slot.status === 'COMPLETED') {
                    calculatedScore += points;
                    completedCount++;
                    console.log(`  [COMPLETED] ${slot.activity} (${slot.type}): +${points}`);
                } else if ((slot.status as any) === 'FAILED') {
                    calculatedScore -= points;
                    failedCount++;
                    console.log(`  [FAILED]    ${slot.activity} (${slot.type}): -${points}`);
                }
            }
        });

        console.log(`\n  Completed Tasks: ${completedCount}`);
        console.log(`  Failed Tasks: ${failedCount}`);
        console.log(`  Calculated Earned Points: ${calculatedScore}`);

        // 3. Get Logs
        const logs = await prisma.pointUsageLog.findMany({
            where: { childId: child.id }
        });

        const totalUsed = logs.reduce((acc, log) => acc + log.amount, 0);
        console.log(`\n- Usage Logs Total: ${totalUsed}`);
        logs.forEach(log => {
            console.log(`  [USED] ${log.reason}: -${log.amount}`);
        });

        console.log(`\n>>> Final Balance in DB should be: ${calculatedScore} - ${totalUsed} = ${calculatedScore - totalUsed}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

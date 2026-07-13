import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@aquado.com'
    const password = await bcrypt.hash('admin1234', 10)

    const admin = await prisma.user.upsert({
        where: { email },
        update: { role: 'ADMIN' },
        create: {
            email,
            password,
            name: '관리자',
            role: 'ADMIN',
        },
    })

    console.log('Admin user created/updated:', admin.email)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

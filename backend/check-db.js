require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL,
    },
  },
});

async function main() {
  const platforms = await prisma.biz_platform.findMany();
  const depts = await prisma.biz_department.findMany();
  const shops = await prisma.biz_shop.findMany();
  console.log('PLATFORMS:', JSON.stringify(platforms, null, 2));
  console.log('DEPTS:', JSON.stringify(depts, null, 2));
  console.log('SHOPS:', JSON.stringify(shops, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

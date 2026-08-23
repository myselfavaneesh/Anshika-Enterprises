const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('saifsalman@ae', salt);

  await prisma.user.update({
    where: { email: 'saifsalman@ae.com' },
    data: {
      password: hashedPassword
    }
  });

  console.log("Password for saifsalman@ae.com updated successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

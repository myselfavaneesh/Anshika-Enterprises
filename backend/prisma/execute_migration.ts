import fs from 'fs';
import path from 'path';
import prisma from '../src/prisma';

async function main() {
  console.log('Starting Float -> Decimal migration on PostgreSQL...');
  const sqlPath = path.join(__dirname, 'migrations_sql', 'step_a2_float_to_decimal.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const clean = s.replace(/--.*$/gm, '').trim();
      return clean.length > 0 && clean !== 'BEGIN' && clean !== 'COMMIT';
    });

  console.log(`Executing ${statements.length} table alterations in a single transaction...`);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const tableName = stmt.match(/ALTER TABLE\s+"([^"]+)"/)?.[1] || `Statement ${i + 1}`;
      console.log(`Migrating [${i + 1}/${statements.length}]: ${tableName}...`);
      await tx.$executeRawUnsafe(stmt);
    }
  }, {
    maxWait: 30000,
    timeout: 60000
  });

  console.log('SUCCESS: All tables migrated to NUMERIC(12,2) and NUMERIC(5,2)!');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

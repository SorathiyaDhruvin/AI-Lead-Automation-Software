import { db } from './server/db';
import { leads } from './shared/schema';
import { eq } from 'drizzle-orm';

async function cleanup() {
  await db.delete(leads).where(eq(leads.name, 'Test Lead'));
  await db.delete(leads).where(eq(leads.name, 'Test Lead 2'));
  await db.delete(leads).where(eq(leads.name, 'SORATHIYA DHRUVIN'));
  console.log('Cleanup done');
  process.exit(0);
}
cleanup();

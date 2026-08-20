import { db } from './server/db';
import { usersLegacy, leads } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  const allUsers = await db.select().from(usersLegacy);
  console.log('Users:', allUsers);
  
  const allLeads = await db.select().from(leads);
  console.log('Leads:', allLeads);
  
  process.exit(0);
}
checkData();

/**
 * Neon connectivity check (legacy backup DB).
 * Connection string .env se aati hai — NEON_CONNECTION (kabhi code mein hardcode na karein).
 * Run: node scripts/check-neon.cjs
 */
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const NEON_CONNECTION = (process.env.NEON_CONNECTION || '').trim();
if (!NEON_CONNECTION) {
  console.error('Missing NEON_CONNECTION in .env');
  process.exit(1);
}
const sql = neon(NEON_CONNECTION);
async function main() {
  try {
    const r = await sql`SELECT COUNT(*) as c FROM fee_data`;
    console.log("fee_data rows:", r[0].c);
    const r2 = await sql`SELECT COUNT(*) as c FROM fees`;
    console.log("fees rows:", r2[0].c);
    console.log("NEON ACTIVE");
  } catch(e) {
    console.error("NEON ERROR:", e.message);
  }
}
main();

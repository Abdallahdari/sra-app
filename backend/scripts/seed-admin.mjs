// Create or reset the admin account.
// Usage: npm run seed:admin -- admin@example.com "a-strong-password" "Admin name"
// (or set ADMIN_EMAIL / ADMIN_PASSWORD in .env)
import { connectDb, disconnectDb } from '../src/db.js';
import { User } from '../src/models.js';
import { hashPassword } from '../src/auth.js';

const [email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD, name = 'SRA Admin'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run seed:admin -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

await connectDb();
await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { email: email.toLowerCase(), name, role: 'admin', passwordHash: await hashPassword(password) },
  { upsert: true, new: true },
);
console.log(`Admin account ready: ${email}`);
await disconnectDb();

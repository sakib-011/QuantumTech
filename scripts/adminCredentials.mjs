export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error('Set ADMIN_PASSWORD before running admin browser checks.');
}

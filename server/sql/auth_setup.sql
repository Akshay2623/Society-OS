-- Add secure password storage to existing users table.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Optional: enforce every account has password hash after migration.
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Example hash generation (run in application code):
-- const hash = await bcrypt.hash("YourPlainPassword", 12);
-- UPDATE users SET password_hash = '<hash>' WHERE email = 'admin@society.com';

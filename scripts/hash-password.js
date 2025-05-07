import crypto from 'crypto';

/**
 * Generates a hashed password for testing
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    // Generate a salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      // Format as hex.salt
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function main() {
  const password = "adminpassword";
  const hashedPassword = await hashPassword(password);
  console.log('Password:', password);
  console.log('Hashed password:', hashedPassword);
}

main().catch(console.error);
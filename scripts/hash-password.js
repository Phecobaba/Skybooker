import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Validates password strength
 */
function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }
  
  return { isValid: true, message: "Password meets strength requirements" };
}

/**
 * Generates a hashed password with enhanced security
 */
async function hashPassword(password) {
  // Use a larger salt size (32 bytes) for better security
  const salt = crypto.randomBytes(32).toString('hex');
  
  // Use a higher cost factor (128) for better security
  const derivedKey = await scryptAsync(password, salt, 128);
  
  // Format as hex.salt
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function main() {
  // Get password from command line args or use default
  const password = process.argv[2] || "Admin123!";
  
  // Validate password strength
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.isValid) {
    console.error('Password validation failed:', passwordCheck.message);
    process.exit(1);
  }
  
  console.log('Validating password strength... OK');
  const hashedPassword = await hashPassword(password);
  console.log('Password:', password);
  console.log('Hashed password:', hashedPassword);
  
  // Add instructions for usage
  if (!process.argv[2]) {
    console.log('\nTIP: You can specify a custom password as a command line argument:');
    console.log('  node scripts/hash-password.js "YourStrongPassword123!"');
  }
}

main().catch(console.error);
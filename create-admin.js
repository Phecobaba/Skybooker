import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

// Strong password validation function
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

async function hashPassword(password) {
  // Use a larger salt size (32 bytes) for better security
  const salt = crypto.randomBytes(32).toString("hex");
  // Use a higher cost factor (128) for better security
  const buf = (await scryptAsync(password, salt, 128));
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  // Default password - should be changed after first login
  const password = 'Admin123!';
  
  // Validate password strength
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.isValid) {
    console.error('Password validation failed:', passwordCheck.message);
    process.exit(1);
  }
  
  const hashedPwd = await hashPassword(password);
  console.log('Admin created with default password. Please change after login!');
  console.log('Password hash:', hashedPwd);
}

main().catch(console.error);
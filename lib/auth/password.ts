import { hash, verify } from "@node-rs/argon2";

// Algorithm.Argon2id is a `const enum` in @node-rs/argon2's types, which
// can't be imported under isolatedModules (required by Next.js/SWC); 2 is
// its value.
const options = { algorithm: 2 as const };

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password, options);
}

import { db, type UserRecord } from "../db/db";

const ITERATIONS = 120000;
const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const digest = await derive(password, salt);
  return { hash: bytesToHex(digest), salt: bytesToHex(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const digest = await derive(password, hexToBytes(salt));
  return bytesToHex(digest) === hash;
}

export async function getAuthenticatedUser(): Promise<UserRecord | null> {
  const userId = (await db.settings.get("currentUserId"))?.value;
  if (!userId) return null;
  const user = await db.users.get(userId);
  if (!user?.active || !user.passwordHash || !user.passwordSalt) return null;
  return user;
}

export async function loginLocal(username: string, password: string) {
  const user = await db.users.where("username").equals(username.trim().toLowerCase()).first();
  if (!user?.active || !user.passwordHash || !user.passwordSalt) throw new Error("Username atau password salah.");
  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) throw new Error("Username atau password salah.");
  await db.settings.put({ key: "currentUserId", value: user.id });
  return user;
}

export async function logoutLocal() {
  await db.settings.delete("currentUserId");
}

export async function setUserPassword(userId: string, password: string) {
  if (password.length < 6) throw new Error("Password minimal 6 karakter.");
  const { hash, salt } = await hashPassword(password);
  await db.users.update(userId, { passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() });
}

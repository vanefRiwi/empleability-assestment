// Generates a local RS256 key pair for development. Never commit the output.
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "secrets");
const privatePath = resolve(dir, "jwt-private.pem");
const publicPath = resolve(dir, "jwt-public.pem");

if (existsSync(privatePath) && !process.argv.includes("--force")) {
  console.log(`Key pair already exists in ${dir}. Use --force to overwrite.`);
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync(dir, { recursive: true });
writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey);
console.log(`Private key: ${privatePath}\nPublic key:  ${publicPath}`);

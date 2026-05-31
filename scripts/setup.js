#!/usr/bin/env node
// Generate config.json with random tokens (if it does not exist yet) and
// print the personal links + admin link. Safe to run repeatedly: it never
// overwrites an existing config.json, it only prints from it.
//
//   npm run setup          create config.json if missing, then print links
//   npm run links          print links from the existing config.json
//   node scripts/setup.js --print   (same as: npm run links)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : path.join(ROOT, "config.json");

// Public base URL used when printing links. Override with PUBLIC_BASE_URL.
const BASE = (process.env.PUBLIC_BASE_URL || "https://checkcheckdoublecheck.com").replace(/\/+$/, "");

function token() {
  // 24 random bytes -> 32-char url-safe base64. Plenty of entropy, no padding.
  return crypto.randomBytes(24).toString("base64url");
}

function createConfig() {
  const config = {
    adminToken: token(),
    people: [
      { token: token(), name: "Kian", role: "Kian" },
      { token: token(), name: "Santi", role: "Santi" }
    ]
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  return config;
}

function printLinks(config) {
  console.log("");
  console.log("  HomeCare scope-check — links");
  console.log("  ============================");
  console.log("");
  for (const p of config.people) {
    console.log(`  ${p.name} (${p.role}):`);
    console.log(`    ${BASE}/f/${p.token}`);
    console.log("");
  }
  console.log("  Admin / status page:");
  console.log(`    ${BASE}/admin/${config.adminToken}`);
  console.log("");
  console.log(`  (config: ${CONFIG_PATH})`);
  console.log("");
}

function main() {
  const printOnly = process.argv.includes("--print");
  let config;

  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (!printOnly) {
      console.log(`\n  config.json already exists — leaving it untouched.`);
    }
  } else {
    if (printOnly) {
      console.error(`\n  No config.json at ${CONFIG_PATH}. Run "npm run setup" first.\n`);
      process.exit(1);
    }
    config = createConfig();
    console.log(`\n  Created ${CONFIG_PATH} with fresh random tokens.`);
  }

  printLinks(config);
}

main();

#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, 'data');

async function ensureOutDir() {
  try {
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

const tables = [
  'users',
  'class_config',
  'student_register_sequence',
  'teacher_register_sequence',
  'fees',
  'marks',
  'attendance',
];

async function exportTable(table) {
  console.log(`Exporting ${table}...`);
  try {
    const res = await query(`SELECT * FROM ${table} ORDER BY id NULLS LAST`);
    const outPath = path.join(OUT_DIR, `${table}.json`);
    await fs.promises.writeFile(outPath, JSON.stringify(res.rows || [], null, 2), 'utf8');
    console.log(`Wrote ${res.rows.length} rows to ${outPath}`);
  } catch (err) {
    console.error(`Failed to export ${table}:`, err.message || err);
  }
}

async function main() {
  console.log('Starting export from Supabase using DATABASE_URL config...');
  await ensureOutDir();
  for (const t of tables) {
    await exportTable(t);
  }
  console.log('Export complete. Files written to backend/data/');
}

main().catch((err) => {
  console.error('Export script failed:', err);
  process.exit(1);
});

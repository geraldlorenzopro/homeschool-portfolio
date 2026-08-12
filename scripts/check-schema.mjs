#!/usr/bin/env node
/**
 * Guards against the one class of bug the end-to-end suite cannot see.
 *
 * The tests run against the browser-local backend, which has no schema — it
 * accepts any shape. So a field the app writes but the database has no column
 * for passes every test and then fails silently in production, which is
 * exactly how `curriculums.area_id` shipped broken.
 *
 * This reads the columns the app expects out of src/lib/types.ts, replays the
 * migrations to work out which columns actually exist, and compares them.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not .pathname — a space in the directory arrives percent-encoded.
const root = fileURLToPath(new URL('..', import.meta.url))
const migrationsDir = join(root, 'supabase/migrations')

/** Interface in types.ts → table in Postgres. Mirrors TABLE in src/data/repo.ts. */
const TABLES = {
  Student: 'students',
  Area: 'areas',
  Goal: 'goals',
  Entry: 'entries',
  Curriculum: 'curriculums',
  Book: 'books',
  WorkSample: 'work_samples',
  SupportDocument: 'support_documents',
  Evaluation: 'evaluations',
  Attachment: 'attachments',
}

/** Fields the app keeps in memory that were never meant to be columns. */
const NOT_COLUMNS = new Set(['url'])

function expectedColumns() {
  const source = readFileSync(join(root, 'src/lib/types.ts'), 'utf8')
  const out = {}
  for (const [iface, table] of Object.entries(TABLES)) {
    const block = source.match(new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`))
    if (!block) throw new Error(`No interface ${iface} in types.ts`)
    out[table] = block[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[a-z_][\w]*\??:/i.test(line))
      .map((line) => line.split(/\??:/)[0].trim())
      .filter((name) => !NOT_COLUMNS.has(name))
  }
  return out
}

function actualColumns() {
  const sql = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n')

  const columns = {}
  const add = (table, name) => (columns[table] ??= new Set()).add(name)

  // create table <schema>.<t> ( ... )
  for (const m of sql.matchAll(
    /create table if not exists \w+\.(\w+)\s*\(([\s\S]*?)\n\);/g,
  )) {
    const [, table, body] = m
    for (const line of body.split('\n')) {
      const name = line.trim().match(/^([a-z_][\w]*)\s+\S/)
      if (name && !/^(unique|primary|foreign|constraint|check)$/i.test(name[1])) {
        add(table, name[1])
      }
    }
  }

  // alter table <schema>.<t> ... add column [if not exists] <name>
  for (const m of sql.matchAll(/alter table\s+\w+\.(\w+)([\s\S]*?);/g)) {
    const [, table, rest] = m
    for (const c of rest.matchAll(/add column (?:if not exists )?([a-z_][\w]*)/g)) {
      add(table, c[1])
    }
    for (const c of rest.matchAll(/drop column (?:if exists )?([a-z_][\w]*)/g)) {
      columns[table]?.delete(c[1])
    }
  }

  // A renamed table carries its columns across.
  for (const m of sql.matchAll(/alter table (?:homeschool\.)?(\w+) rename to (\w+)/g)) {
    const [, from, to] = m
    if (columns[from]) {
      columns[to] = new Set([...(columns[to] ?? []), ...columns[from]])
      delete columns[from]
    }
  }

  return columns
}

const expected = expectedColumns()
const actual = actualColumns()
const problems = []

for (const [table, wanted] of Object.entries(expected)) {
  const have = actual[table] ?? new Set()
  const missing = wanted.filter((c) => !have.has(c) && c !== 'id')
  if (missing.length) problems.push(`  ${table}: no column for ${missing.join(', ')}`)
}

if (problems.length) {
  console.error('Schema drift — the app writes fields the database has no column for:\n')
  console.error(problems.join('\n'))
  console.error('\nAdd a migration in supabase/migrations before shipping.\n')
  process.exit(1)
}

console.log(`Schema check passed — ${Object.keys(expected).length} tables match the migrations.`)

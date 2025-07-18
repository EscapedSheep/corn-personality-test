import { promises as fs } from 'fs';
import path from 'path';

export interface PersonalityResult {
  title: string;
  subtitle: string;
  description: string;
  traits: string[];
  emoji: string;
  dimension: string;
}

export interface StoredResult extends PersonalityResult {
  id: string;
  createdAt: string;
}

const DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DIR, 'results.json');

let writeQueue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    writeQueue = writeQueue.then(() => fn().then(resolve, reject));
  });
}

async function readStore(): Promise<Map<string, StoredResult>> {
  try {
    const raw = await fs.readFile(FILE, 'utf-8');
    return new Map(JSON.parse(raw));
  } catch {
    return new Map();
  }
}

async function writeStore(store: Map<string, StoredResult>): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify([...store], null, 2));
}

export async function saveResult(id: string, result: PersonalityResult): Promise<StoredResult> {
  return withLock(async () => {
    const store = await readStore();
    const entry: StoredResult = { ...result, id, createdAt: new Date().toISOString() };
    store.set(id, entry);
    await writeStore(store);
    return entry;
  });
}

export async function getResult(id: string): Promise<StoredResult | null> {
  const store = await readStore();
  return store.get(id) ?? null;
}

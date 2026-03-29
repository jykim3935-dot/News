import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// On Vercel, only /tmp is writable. Locally, use .data/ in project root.
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", ".data")
  : path.join(process.cwd(), ".data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): T[] {
  ensureDir();
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: string, data: T[]): void {
  ensureDir();
  fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
}

interface HasId {
  id: string;
}

export const localStore = {
  select<T>(collection: string): T[] {
    return readCollection<T>(collection);
  },

  selectWhere<T extends Record<string, unknown>>(
    collection: string,
    filter: Partial<Record<string, unknown>>
  ): T[] {
    const items = readCollection<T>(collection);
    return items.filter((item) => {
      for (const [key, value] of Object.entries(filter)) {
        if (value === null) {
          if (item[key] !== null && item[key] !== undefined) return false;
        } else if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });
  },

  insert<T>(collection: string, record: Omit<T, "id" | "created_at">): T {
    const items = readCollection<T>(collection);
    const newItem = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...(record as object),
    } as T;
    items.push(newItem);
    writeCollection(collection, items);
    return newItem;
  },

  insertMany<T>(collection: string, records: Omit<T, "id" | "created_at">[]): T[] {
    const items = readCollection<T>(collection);
    const newItems = records.map((record) => ({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...(record as object),
    })) as T[];
    items.push(...newItems);
    writeCollection(collection, items);
    return newItems;
  },

  update<T extends HasId>(collection: string, id: string, updates: Partial<T>): T | null {
    const items = readCollection<T>(collection);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...(updates as object) };
    writeCollection(collection, items);
    return items[idx];
  },

  updateWhere<T extends Record<string, unknown>>(
    collection: string,
    filter: Partial<Record<string, unknown>>,
    updates: Partial<Record<string, unknown>>
  ): T[] {
    const items = readCollection<T>(collection);
    const updated: T[] = [];
    for (let i = 0; i < items.length; i++) {
      let match = true;
      for (const [key, value] of Object.entries(filter)) {
        if (value === null) {
          if (items[i][key] !== null && items[i][key] !== undefined) { match = false; break; }
        } else if (items[i][key] !== value) { match = false; break; }
      }
      if (match) {
        items[i] = { ...items[i], ...(updates as object) } as T;
        updated.push(items[i]);
      }
    }
    if (updated.length > 0) writeCollection(collection, items);
    return updated;
  },

  delete(collection: string, id: string): boolean {
    const items = readCollection<HasId>(collection);
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    writeCollection(collection, filtered);
    return true;
  },
};

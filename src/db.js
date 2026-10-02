import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'links.json');

/**
 * JSON-file persistence with atomic writes.
 * Structure: { [code]: { code, url, createdAt, expiresAt, clicks: [{ts, referrer, ua}] } }
 */
const store = {
  read() {
    if (!fs.existsSync(DB_FILE)) return {};
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {
      return {};
    }
  },

  write(data) {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DB_FILE);
  },

  all() {
    return this.read();
  },

  get(code) {
    return this.read()[code];
  },

  save(link) {
    const data = this.read();
    data[link.code] = link;
    this.write(data);
  },

  remove(code) {
    const data = this.read();
    delete data[code];
    this.write(data);
  },
};

export default store;

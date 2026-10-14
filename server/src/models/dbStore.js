import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.js';

class Collection {
  constructor(name, dataDir) {
    this.name = name;
    this.filePath = path.join(dataDir, `${name}.json`);
    this.data = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = [];
        this.save();
      }
    } catch (err) {
      console.error(`[dbStore] Error loading collection ${this.name}:`, err);
      this.data = [];
    }
  }

  save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[dbStore] Error saving collection ${this.name}:`, err);
    }
  }

  find(query = {}) {
    return this.data.filter(item => this._matchesQuery(item, query));
  }

  findOne(query = {}) {
    return this.data.find(item => this._matchesQuery(item, query)) || null;
  }

  findById(id) {
    if (!id) return null;
    return this.data.find(item => item._id === id || item.id === id) || null;
  }

  create(doc) {
    const _id = doc._id || doc.id || 'ft_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const newDoc = {
      ...doc,
      _id,
      id: _id,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };
    this.data.push(newDoc);
    this.save();
    return newDoc;
  }

  findByIdAndUpdate(id, updates) {
    const index = this.data.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    
    const current = this.data[index];
    const updated = {
      ...current,
      ...updates,
      _id: current._id,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    this.data[index] = updated;
    this.save();
    return updated;
  }

  deleteOne(query) {
    const index = this.data.findIndex(item => this._matchesQuery(item, query));
    if (index === -1) return false;
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  deleteMany(query) {
    const initialLen = this.data.length;
    this.data = this.data.filter(item => !this._matchesQuery(item, query));
    if (this.data.length !== initialLen) {
      this.save();
    }
    return initialLen - this.data.length;
  }

  count(query = {}) {
    return this.find(query).length;
  }

  _matchesQuery(item, query) {
    for (const key of Object.keys(query)) {
      const qVal = query[key];
      const itemVal = item[key];

      if (qVal && typeof qVal === 'object' && !Array.isArray(qVal)) {
        // Handle MongoDB-style operators like $in, $gte, $lte, $regex
        if ('$in' in qVal) {
          if (!qVal.$in.includes(itemVal)) return false;
        }
        if ('$gte' in qVal) {
          if (itemVal < qVal.$gte) return false;
        }
        if ('$lte' in qVal) {
          if (itemVal > qVal.$lte) return false;
        }
        if ('$ne' in qVal) {
          if (itemVal === qVal.$ne) return false;
        }
        if ('$regex' in qVal) {
          const flags = qVal.$options || 'i';
          const reg = new RegExp(qVal.$regex, flags);
          if (!reg.test(String(itemVal || ''))) return false;
        }
      } else if (Array.isArray(itemVal) && !Array.isArray(qVal)) {
        if (!itemVal.includes(qVal)) return false;
      } else {
        if (itemVal !== qVal) return false;
      }
    }
    return true;
  }
}

class DbStore {
  constructor() {
    this.dataDir = config.dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.users = new Collection('users', this.dataDir);
    this.restaurants = new Collection('restaurants', this.dataDir);
    this.reviews = new Collection('reviews', this.dataDir);
    this.vouchers = new Collection('vouchers', this.dataDir);
  }
}

export const db = new DbStore();

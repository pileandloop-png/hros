import { initialSeedData, SeedCollectionMap } from './seedData';

const STORAGE_KEY = 'hros_db_store_v1';

class PersistentStore {
  private data: SeedCollectionMap = {};
  private listeners: Set<(collectionName: string) => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.data = JSON.parse(JSON.stringify(initialSeedData));
        this.save();
      }
    } catch {
      this.data = JSON.parse(JSON.stringify(initialSeedData));
    }
  }

  public save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  public reset() {
    this.data = JSON.parse(JSON.stringify(initialSeedData));
    this.save();
    this.notifyAll();
  }

  public getCollection(name: string): Record<string, any> {
    if (!this.data[name]) {
      this.data[name] = {};
    }
    return this.data[name];
  }

  public setDocument(col: string, id: string, docData: any, merge: boolean = false) {
    if (!this.data[col]) {
      this.data[col] = {};
    }
    if (merge && this.data[col][id]) {
      this.data[col][id] = { ...this.data[col][id], ...docData, id };
    } else {
      this.data[col][id] = { ...docData, id };
    }
    this.save();
    this.notify(col);
  }

  public updateDocument(col: string, id: string, updateData: any) {
    if (!this.data[col] || !this.data[col][id]) {
      this.data[col] = this.data[col] || {};
      this.data[col][id] = { id, ...updateData };
    } else {
      this.data[col][id] = { ...this.data[col][id], ...updateData };
    }
    this.save();
    this.notify(col);
  }

  public deleteDocument(col: string, id: string) {
    if (this.data[col] && this.data[col][id]) {
      delete this.data[col][id];
      this.save();
      this.notify(col);
    }
  }

  public subscribe(listener: (collectionName: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(col: string) {
    this.listeners.forEach(cb => cb(col));
  }

  private notifyAll() {
    Object.keys(this.data).forEach(col => this.notify(col));
  }
}

export const store = new PersistentStore();

// Firestore Compatibility Types
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}

  static now(): Timestamp {
    const ms = Date.now();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000));
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000);
  }

  toISOString(): string {
    return this.toDate().toISOString();
  }
}

export function serverTimestamp(): any {
  return new Date().toISOString();
}

export interface DocumentReference<T = any> {
  id: string;
  path: string;
  collection: string;
  converter?: any;
  firestore?: any;
  withConverter?: any;
}

export interface CollectionReference<T = any> {
  id?: string;
  path: string;
  parent?: any;
  firestore?: any;
  withConverter?: any;
}

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  op?: string;
  value?: any;
  direction?: 'asc' | 'desc';
  limitCount?: number;
}

export interface Query<T = any> {
  collection: string;
  constraints: QueryConstraint[];
}

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T;
}

export interface QueryDocumentSnapshot<T = any> extends DocumentSnapshot<T> {}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: QueryDocumentSnapshot<T>[];
  forEach: (callback: (result: QueryDocumentSnapshot<T>) => void) => void;
}

export function collection(_db: any, path: string, ...pathSegments: string[]): CollectionReference {
  const fullPath = [path, ...pathSegments].filter(Boolean).join('/');
  return { path: fullPath, id: pathSegments[pathSegments.length - 1] || path };
}

export function doc(first: any, pathOrId?: string, maybeId?: string): DocumentReference {
  if (maybeId) {
    return { collection: pathOrId || '', id: maybeId, path: `${pathOrId}/${maybeId}` };
  }
  if (!pathOrId) {
    const col = typeof first === 'string' ? first : first?.path || 'collection';
    const autoId = 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    return { collection: col, id: autoId, path: `${col}/${autoId}` };
  }
  if (pathOrId.includes('/')) {
    const parts = pathOrId.split('/');
    return { collection: parts[0], id: parts[1], path: pathOrId };
  }
  if (typeof first === 'object' && first && first.path) {
    return { collection: first.path, id: pathOrId, path: `${first.path}/${pathOrId}` };
  }
  return { collection: String(first), id: pathOrId, path: `${first}/${pathOrId}` };
}

export function where(field: string, op: string, value: any): QueryConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(limitCount: number): QueryConstraint {
  return { type: 'limit', limitCount };
}

export function query<T = any>(colRef: any, ...constraints: any[]): Query<T> {
  const flattened: QueryConstraint[] = [];
  constraints.forEach(c => {
    if (Array.isArray(c)) {
      flattened.push(...c);
    } else if (c && typeof c === 'object') {
      flattened.push(c);
    }
  });

  return {
    collection: colRef.collection || colRef.path || 'collection',
    constraints: flattened
  };
}

export function getDoc<T = any>(docRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  const colData = store.getCollection(docRef.collection);
  const data = colData[docRef.id];
  return Promise.resolve({
    id: docRef.id,
    exists: () => !!data,
    data: () => (data ? { ...data } : undefined) as any
  });
}

export function setDoc(docRef: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void> {
  const cleanData = JSON.parse(JSON.stringify(data));
  store.setDocument(docRef.collection, docRef.id, cleanData, options?.merge);
  return Promise.resolve();
}

export function updateDoc(docRef: DocumentReference, data: any): Promise<void> {
  const cleanData = JSON.parse(JSON.stringify(data));
  store.updateDocument(docRef.collection, docRef.id, cleanData);
  return Promise.resolve();
}

export function addDoc(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const id = 'gen-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  const cleanData = JSON.parse(JSON.stringify(data));
  store.setDocument(colRef.path, id, cleanData, false);
  return Promise.resolve({
    id,
    path: `${colRef.path}/${id}`,
    collection: colRef.path
  });
}

export function deleteDoc(docRef: DocumentReference): Promise<void> {
  store.deleteDocument(docRef.collection, docRef.id);
  return Promise.resolve();
}

export function executeQuery(target: any): any[] {
  const colName = target.collection || target.path || 'collection';
  const constraints = target.constraints || [];

  let items = Object.values(store.getCollection(colName));

  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op) {
      items = items.filter(item => {
        const val = item[c.field!];
        if (c.op === '==') return val === c.value;
        if (c.op === '!=') return val !== c.value;
        if (c.op === '>') return val > c.value;
        if (c.op === '>=') return val >= c.value;
        if (c.op === '<') return val < c.value;
        if (c.op === '<=') return val <= c.value;
        if (c.op === 'in') return Array.isArray(c.value) && c.value.includes(val);
        if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.value);
        return true;
      });
    } else if (c.type === 'orderBy' && c.field) {
      const field = c.field;
      const asc = c.direction !== 'desc';
      items.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return (valA > valB ? 1 : -1) * (asc ? 1 : -1);
      });
    } else if (c.type === 'limit' && c.limitCount) {
      items = items.slice(0, c.limitCount);
    }
  }

  return items;
}

export function getDocs<T = any>(target: any): Promise<QuerySnapshot<T>> {
  const items = executeQuery(target);
  const docs: QueryDocumentSnapshot<T>[] = items.map(item => ({
    id: item.id,
    exists: () => true,
    data: () => ({ ...item }) as any
  }));

  return Promise.resolve({
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (fn: (doc: QueryDocumentSnapshot<T>) => void) => docs.forEach(fn)
  });
}

export function onSnapshot<T = any>(
  docRef: DocumentReference<T>,
  observer: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: any) => void
): () => void;
export function onSnapshot<T = any>(
  queryOrCol: Query<T> | CollectionReference<T>,
  observer: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: any) => void
): () => void;
export function onSnapshot(
  target: any,
  observer: any,
  _onError?: any
): () => void {
  const isDoc = target && 'id' in target && 'collection' in target;
  const colName = isDoc
    ? (target as DocumentReference).collection
    : target?.collection || target?.path || 'collection';

  const emit = () => {
    try {
      if (isDoc) {
        const dRef = target as DocumentReference;
        const colData = store.getCollection(dRef.collection);
        const data = colData[dRef.id];
        observer({
          id: dRef.id,
          exists: () => !!data,
          data: () => (data ? { ...data } : undefined)
        });
      } else {
        const items = executeQuery(target);
        const docs: QueryDocumentSnapshot[] = items.map(item => ({
          id: item.id,
          exists: () => true,
          data: () => ({ ...item })
        }));
        observer({
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (fn: (doc: QueryDocumentSnapshot) => void) => docs.forEach(fn)
        });
      }
    } catch (e) {
      console.warn('onSnapshot emit error:', e);
    }
  };

  emit();

  return store.subscribe((changedCol: string) => {
    if (changedCol === colName) {
      emit();
    }
  });
}

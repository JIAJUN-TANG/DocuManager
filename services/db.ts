import { DocRecord } from '../types';

// For now, we'll keep using IndexedDB for the browser/renderer process
// and we'll implement SQLite only for the main process when needed
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DocuBrainDB extends DBSchema {
  documents: {
    key: string;
    value: DocRecord;
    indexes: { 'by-date': number; 'by-title': string };
  };
}

const DB_NAME = 'docubrain-db';
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBPDatabase<DocuBrainDB>>;

// Initialize the database
export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<DocuBrainDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-date', 'createdAt');
        store.createIndex('by-title', 'title');
      },
    });
  }
  return dbPromise;
};

export const saveDocument = async (doc: DocRecord) => {
  const db = await initDB();
  return db.put(STORE_NAME, doc);
};

export const getAllDocuments = async (): Promise<DocRecord[]> => {
  const db = await initDB();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
};

export const getDocumentById = async (id: string): Promise<DocRecord | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const deleteDocument = async (id: string) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};

export const searchDocuments = async (query: string): Promise<DocRecord[]> => {
  const db = await initDB();
  const allDocs = await db.getAll(STORE_NAME);
  
  if (!query) return allDocs;

  const lowerQuery = query.toLowerCase();
  return allDocs.filter(doc => 
    doc.title.toLowerCase().includes(lowerQuery) || 
    doc.content.toLowerCase().includes(lowerQuery) ||
    doc.fulltext.toLowerCase().includes(lowerQuery)
  );
};

export const getStats = async () => {
  const db = await initDB();
  const count = await db.count(STORE_NAME);
  // Simplistic size estimation
  const allDocs = await db.getAll(STORE_NAME);
  let mediaCount = 0;
  allDocs.forEach(d => {
    if (d.mediaBlob) mediaCount++;
  });
  
  return {
    totalDocs: count,
    mediaDocs: mediaCount,
    textOnlyDocs: count - mediaCount
  };
};
import { openDB } from 'idb';

const DB_NAME = 'AttendanceDB';
const STORE_NAME = 'pending_checkins';

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
  },
});

export const addPendingCheckin = async (data: any) => {
  const db = await dbPromise;
  return db.add(STORE_NAME, { ...data, timestamp: Date.now() });
};

export const getAllPendingCheckins = async () => {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
};

export const deletePendingCheckin = async (id: number) => {
  const db = await dbPromise;
  return db.delete(STORE_NAME, id);
};
const STORAGE_KEY = 'attendance_pending_checkins';

interface PendingCheckinRecord {
  id: number;
  type: 'on' | 'off';
  location?: string;
  timestamp: number;
}

function readRecords(): PendingCheckinRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: PendingCheckinRecord[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const addPendingCheckin = async (data: {
  type: 'on' | 'off';
  location?: string;
}) => {
  const records = readRecords();
  const id = Date.now();
  records.push({ id, ...data, timestamp: id });
  writeRecords(records);
  return id;
};

export const getAllPendingCheckins = async () => {
  return readRecords().sort((a, b) => a.timestamp - b.timestamp);
};

export const deletePendingCheckin = async (id: number) => {
  const records = readRecords().filter((item) => item.id !== id);
  writeRecords(records);
};

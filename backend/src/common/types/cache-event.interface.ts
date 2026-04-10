export interface CacheInvalidEvent {
  action: 'create' | 'update' | 'delete' | 'sync';
  entity: 'attendance' | 'approval' | 'finance' | 'knowledge' | 'product';
  platformId: string;
  targetId?: string;
  timestamp: number;
}

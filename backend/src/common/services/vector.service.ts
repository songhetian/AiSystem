import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AIConfigService } from './ai-config.service';

export interface VectorPayload {
  id: string;
  text: string;
  metadata: Record<string, any>;
  platform_id: string;
  dept_id: string;
  shop_id?: string | null;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private client: QdrantClient;
  private readonly logger = new Logger(VectorService.name);
  private readonly collectionName = 'knowledge_collection';
  private readonly vectorSize = 1536;

  constructor(
    private configService: ConfigService,
    private aiConfigService: AIConfigService,
  ) {
    const url = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');
    this.client = new QdrantClient({ url, apiKey });
  }

  async onModuleInit() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: { size: this.vectorSize, distance: 'Cosine' },
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant', error);
    }
  }

  async generateEmbedding(text: string, platformId?: string, deptId?: string): Promise<number[]> {
    // 获取AI配置
    const aiConfig = await this.aiConfigService.getAIConfig(platformId, deptId);
    
    if (aiConfig.apiKey && aiConfig.apiKey.startsWith('sk-')) {
      try {
        const response = await fetch(`${aiConfig.apiBaseUrl}/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
          body: JSON.stringify({ input: text.replace(/\n/g, ' '), model: 'text-embedding-3-small' }),
        });
        const json = await response.json();
        return json.data[0].embedding;
      } catch (e) {
        this.logger.warn('OpenAI Embedding fallback to hash', e);
      }
    }
    return this.generateFeatureHashEmbedding(text);
  }

  private generateFeatureHashEmbedding(text: string): number[] {
    const vector = new Array(this.vectorSize).fill(0);
    const words = text.toLowerCase().split(/[\s,，。！!？?]/).filter(w => w.length > 0);
    words.forEach((word, idx) => {
      for (let i = 0; i < 5; i++) {
        const hash = this.hashString(`${word}:${i}`);
        const pos = Math.abs(hash) % this.vectorSize;
        vector[pos] += (1 / (idx + 1)) * (hash > 0 ? 1 : -1);
      }
    });
    const mag = Math.sqrt(vector.reduce((a, v) => a + v * v, 0)) || 1;
    return vector.map(v => v / mag);
  }

  private hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return h;
  }

  async upsertArticle(payload: VectorPayload) {
    const vector = await this.generateEmbedding(payload.text, payload.platform_id, payload.dept_id);
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: payload.id,
        vector,
        payload: { ...payload.metadata, text: payload.text, platform_id: payload.platform_id, dept_id: payload.dept_id, shop_id: payload.shop_id || 'null' },
      }],
    });
  }

  async deleteArticle(id: string) {
    await this.client.delete(this.collectionName, { points: [id] });
  }

  async search(query: string, filter: { platform_id?: string; dept_id?: string; shop_id?: string }, limit = 10) {
    const vector = await this.generateEmbedding(query, filter.platform_id, filter.dept_id);
    const must: any[] = [];
    if (filter.platform_id) must.push({ key: 'platform_id', match: { value: filter.platform_id } });
    
    // 关键逻辑：(dept_id == 当前部门) OR (is_public == 1)
    if (filter.dept_id) {
      must.push({
        should: [
          { key: 'dept_id', match: { value: filter.dept_id } },
          { key: 'is_public', match: { value: 1 } }
        ]
      });
    }
    
    if (filter.shop_id) must.push({ key: 'shop_id', match: { value: filter.shop_id } });
    const results = await this.client.search(this.collectionName, { vector, filter: { must }, limit, with_payload: true });
    return results.map(r => ({ id: r.id, score: r.score, payload: r.payload }));
  }

  async scroll(filter: { platform_id?: string; dept_id?: string }, limit = 20, offset?: string) {
    const must: any[] = [];
    if (filter.platform_id) must.push({ key: 'platform_id', match: { value: filter.platform_id } });
    
    // 同上，放通公共知识库（is_public: 1）
    if (filter.dept_id) {
      must.push({
        should: [
          { key: 'dept_id', match: { value: filter.dept_id } },
          { key: 'is_public', match: { value: 1 } }
        ]
      });
    }

    const results = await this.client.scroll(this.collectionName, {
      filter: { must },
      limit,
      offset,
      with_payload: true,
      with_vector: false
    });

    return {
      points: results.points.map(r => ({ id: r.id, payload: r.payload })),
      next_page_offset: results.next_page_offset
    };
  }
}

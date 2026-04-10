import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

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
  private readonly vectorSize = 1536; // Matching text-embedding-3-small or similar

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');
    
    this.client = new QdrantClient({ url, apiKey });
  }

  async onModuleInit() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        this.logger.log(`Creating collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant collection', error);
    }
  }

  /**
   * Mocking embedding generation (Real implementation would call OpenAI or local model)
   */
  private generateMockEmbedding(text: string): number[] {
    const vector = new Array(this.vectorSize).fill(0);
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < this.vectorSize; i++) {
      vector[i] = Math.sin(seed + i) * 0.1;
    }
    return vector;
  }

  async upsertArticle(payload: VectorPayload) {
    try {
      const vector = this.generateMockEmbedding(payload.text);
      
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: payload.id,
            vector,
            payload: {
              ...payload.metadata,
              text: payload.text,
              platform_id: payload.platform_id,
              dept_id: payload.dept_id,
              shop_id: payload.shop_id || 'null',
            },
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Failed to upsert vector for article ${payload.id}`, error);
    }
  }

  async deleteArticle(id: string) {
    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
    } catch (error) {
      this.logger.error(`Failed to delete vector for article ${id}`, error);
    }
  }

  async search(query: string, filter: { platform_id?: string; dept_id?: string; shop_id?: string }, limit = 10) {
    try {
      const vector = this.generateMockEmbedding(query);
      
      const must: any[] = [];
      if (filter.platform_id) must.push({ key: 'platform_id', match: { value: filter.platform_id } });
      if (filter.dept_id) must.push({ key: 'dept_id', match: { value: filter.dept_id } });
      if (filter.shop_id) must.push({ key: 'shop_id', match: { value: filter.shop_id } });

      const results = await this.client.search(this.collectionName, {
        vector,
        filter: { must },
        limit,
        with_payload: true,
      });

      return results.map(r => ({
        id: r.id,
        score: r.score,
        payload: r.payload,
      }));
    } catch (error) {
      this.logger.error(`Search failed for query: ${query}`, error);
      return [];
    }
  }
}

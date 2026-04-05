import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client!: Client;
  private bucket!: string;

  onModuleInit() {
    this.bucket = process.env.MINIO_BUCKET ?? 'aisystem';
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? '127.0.0.1',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: String(process.env.MINIO_USE_SSL ?? 'false') === 'true',
      accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin'
    });
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async uploadObject(objectName: string, buffer: Buffer, mimeType: string) {
    try {
      await this.ensureBucket();
      await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
        'Content-Type': mimeType
      });

      return {
        bucket: this.bucket,
        objectName,
        url: `/${this.bucket}/${objectName}`
      };
    } catch (error) {
      throw new InternalServerErrorException(`文件上传失败: ${String(error)}`);
    }
  }
}

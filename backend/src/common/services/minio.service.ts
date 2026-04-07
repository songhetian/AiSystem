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

  async getPresignedUrl(objectName: string, expiry = 3600) {
    try {
      // Return local-friendly URL if it's already a full URL (though usually it's just the path)
      if (objectName.startsWith('http')) {
        return objectName;
      }
      return await this.client.presignedGetObject(this.bucket, objectName, expiry);
    } catch (error) {
      throw new InternalServerErrorException(`生成预览链接失败: ${String(error)}`);
    }
  }
}

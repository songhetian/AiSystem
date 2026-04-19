import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  console.log('Starting OpenAPI generation...');
  try {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('AiSystem API')
      .setDescription('AiSystem 后端接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    
    const outputPath = path.resolve(__dirname, '../../frontend/openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    
    console.log('OpenAPI spec generated at:', outputPath);
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL ERROR during OpenAPI generation:');
    console.error(err);
    process.exit(1);
  }
}

generate();

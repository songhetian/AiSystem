import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import * as officeparser from 'officeparser';
import * as pdf from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import * as xlsx from 'xlsx';

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  async parseFile(filePath: string, fileType: string): Promise<string> {
    try {
      const type = fileType.toLowerCase();
      switch (type) {
        case 'pdf':
          return await this.parsePdf(filePath);
        case 'docx':
          return await this.parseDocx(filePath);
        case 'xlsx':
          return await this.parseXlsx(filePath);
        case 'pptx':
          return await this.parsePptx(filePath);
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'bmp':
        case 'gif':
          return await this.parseImage(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error: any) {
      this.logger.error(`Error parsing file ${filePath}: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async parseImage(filePath: string): Promise<string> {
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'chi_sim+eng');
    return text;
  }

  private async parsePdf(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    // 兼容某些环境下 pdf-parse 的导出方式
    const pdfParser = (pdf as any).default || pdf;
    const data = await pdfParser(dataBuffer);
    return data.text;
  }

  private async parseDocx(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async parseXlsx(filePath: string): Promise<string> {
    const workbook = xlsx.readFile(filePath);
    let fullText = '';
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      fullText += `--- Sheet: ${sheetName} ---\n`;
      fullText += xlsx.utils.sheet_to_txt(worksheet);
      fullText += '\n';
    });
    return fullText;
  }

  private async parsePptx(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      officeparser.parseOffice(filePath, (data: any, err: any) => {
        if (err) return reject(err);
        resolve(String(data));
      });
    });
  }
}

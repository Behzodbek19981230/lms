import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import type { Express } from 'express';

@Injectable()
export class ImportProxyService {
  constructor(private readonly configService: ConfigService) {}

  async importQuestions(file: Express.Multer.File) {
    const base = String(
      this.configService.get('https://fast.universal-uz.uz'),
    ).replace(/\/$/, '');

    const url = `${base}/import/questions`;

    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname || 'upload',
      contentType: file.mimetype || 'application/octet-stream',
    });

    try {
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 60_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      });

      if (res.status < 200 || res.status >= 300) {
        throw new HttpException(
          {
            message: 'Import service error',
            statusCode: res.status,
            data: res.data,
          },
          res.status,
        );
      }

      // Pass-through response from Flask
      return res.data;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        {
          message: 'Failed to reach import service',
          error: err?.message || String(err),
        },
        502,
      );
    }
  }
}

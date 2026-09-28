import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });
  app.disable('x-powered-by');
  app.enableShutdownHooks();
  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = Number(process.env.PORT || process.env.SERVER_PORT || '3000');

  if (process.env.NODE_ENV === 'production') {
    // Vite 产物文件名带内容哈希，内容变了文件名就变，可放心让浏览器永久缓存；
    // 其余静态文件（favicon 等）保留 1 天缓存。index.html 由 ViewController 返回并禁止强缓存。
    app.useStaticAssets(join(process.cwd(), 'dist/client'), {
      index: false,
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (/[\\/]assets[\\/]/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });
  }

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();

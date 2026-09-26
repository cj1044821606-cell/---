import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  render(@Res() res: Response): void {
    // 入口 HTML 每次都向服务器确认是否有新版本，保证发版后用户立刻拿到新哈希资源
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(process.cwd(), 'dist/client/index.html'), {
      cacheControl: false,
    });
  }
}

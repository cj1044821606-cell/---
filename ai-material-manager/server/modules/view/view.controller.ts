import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  render(@Res() res: Response): void {
    res.sendFile(join(process.cwd(), 'dist/client/index.html'));
  }
}

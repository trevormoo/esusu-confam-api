import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async handleJoinRequest(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' },
    @Request() req: any
  ) {
    const userId = req.user.userId;

    if (!['approve', 'reject'].includes(body.action)) {
      throw new BadRequestException('Invalid action. Must be "approve" or "reject".');
    }

    return this.requestsService.handleRequest(id, body.action, userId);
  }
}
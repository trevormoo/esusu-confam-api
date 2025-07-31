import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class RequestsService {
  async handleRequest(requestId: string, action: 'approve' | 'reject', adminId: string) {
    const joinRequest = await prisma.groupRequest.findUnique({
      where: { id: requestId },
      include: { group: true },
    });

    if (!joinRequest) throw new NotFoundException('Join request not found');
    if (joinRequest.status !== 'pending') {
      throw new BadRequestException('Request has already been processed');
    }

    const group = joinRequest.group;
    if (group.adminId !== adminId) {
      throw new ForbiddenException('You are not the admin of this group');
    }

    if (action === 'reject') {
      await prisma.groupRequest.update({
        where: { id: requestId },
        data: { status: 'rejected' },
      });

      return { message: 'Request rejected' };
    }

    // Check if group is full
    const currentMembers = await prisma.user.count({
      where: { groupId: group.id },
    });

    if (currentMembers >= group.capacity) {
      throw new BadRequestException('Group is already full');
    }

    // Approve: assign user to the group
    await prisma.user.update({
      where: { id: joinRequest.userId },
      data: { groupId: group.id },
    });

    await prisma.groupRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });

    return { message: 'User added to group' };
  }
}
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

@Injectable()
export class GroupService {
    
  async searchPublicGroups(query: string) {
  return await prisma.$queryRaw`
    SELECT id, name, description, capacity, "createdAt"
    FROM "Group"
    WHERE "isPublic" = true
    AND LOWER(name) LIKE LOWER(${`%${query}%`})
  `;
}

  async requestToJoin(groupId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new BadRequestException('User not found');
  if (user.groupId) throw new BadRequestException('User already in a group');

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) throw new BadRequestException('Group not found');
  if (!group.isPublic) throw new BadRequestException('Group is private');
  if (group.members.length >= group.capacity)
    throw new BadRequestException('Group is full');

  const existingRequest = await prisma.groupRequest.findFirst({
    where: {
      userId,
      groupId,
    },
  });

  if (existingRequest)
    throw new BadRequestException('Join request already exists');

  const request = await prisma.groupRequest.create({
    data: {
      userId,
      groupId,
      status: 'pending',
    },
  });

  return {
    message: 'Join request sent',
    requestId: request.id,
  };
}


  async getJoinRequests(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundException('Group not found');
  }

  if (group.adminId !== adminId) {
    throw new ForbiddenException('You are not the admin of this group');
  }

  return await prisma.groupRequest.findMany({
    where: { groupId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
  

async joinByInviteCode(code: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new BadRequestException('User not found');
  if (user.groupId) throw new BadRequestException('User already in a group');

  const group = await prisma.group.findFirst({
    where: { inviteCode: code, isPublic: false },
    include: { members: true },
  });

  if (!group) throw new BadRequestException('Invalid or expired invite code');
  if (group.members.length >= group.capacity) {
    throw new BadRequestException('Group is full');
  }

  // Add user to group
  await prisma.user.update({
    where: { id: userId },
    data: { groupId: group.id },
  });

  return {
    message: 'Successfully joined private group',
    groupId: group.id,
  };
}

async getGroupMembers(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  console.log('Debug → groupId:', groupId);
  console.log('Debug → adminId from token:', adminId);
  console.log('Debug → group from DB:', group);

  if (!group) throw new NotFoundException('Group not found');
  if (group.adminId !== adminId) {
    throw new ForbiddenException('You are not the admin of this group');
  }

  return group.members;
}

  async removeUserFromGroup(groupId: string, adminId: string, userIdToRemove: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group || group.adminId !== adminId) {
    throw new ForbiddenException('You are not the admin of this group');
  }

  if (group.adminId === userIdToRemove) {
    throw new BadRequestException('Admin cannot remove themselves');
  }

  const user = await prisma.user.findUnique({
    where: { id: userIdToRemove },
  });

  if (!user || user.groupId !== groupId) {
    throw new BadRequestException('User is not a member of this group');
  }

  await prisma.user.update({
    where: { id: userIdToRemove },
    data: {
      groupId: null,
    },
  });

  return { message: 'User removed from group successfully' };
}


  async createGroup(data: {
    name: string;
    description: string;
    isPublic: boolean;
    capacity: number;
    userId: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) throw new BadRequestException('User not found');

    if (user.groupId) {
      throw new BadRequestException('User already belongs to a group');
    }

    const inviteCode = randomBytes(4).toString('hex'); // generates something like '9a7b6c2f'

    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        capacity: data.capacity,
        adminId: data.userId,
        inviteCode,
        members: {
          connect: { id: data.userId },
        },
      },
    });

    // Assign the group to the user
    await prisma.user.update({
      where: { id: data.userId },
      data: { groupId: group.id },
    });

    return {
      message: 'Group created successfully',
      group: {
        id: group.id,
        name: group.name,
        isPublic: group.isPublic,
        inviteCode: group.inviteCode,
      },
    };
  }
}
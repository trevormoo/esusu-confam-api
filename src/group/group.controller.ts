import { Controller, Post, Body, UseGuards, Request, Delete } from '@nestjs/common';
import { GroupService } from './group.service';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { Get, Query } from '@nestjs/common';
import { Param } from '@nestjs/common';


@Controller('groups')
export class GroupController {
    constructor(private readonly groupService: GroupService) {}
    
    @Get(':id/requests')
    @UseGuards(AuthGuard('jwt'))
    async getJoinRequests(
      @Param('id') groupId: string,
      @Request() req: ExpressRequest
    ) {
      const user = req.user as { userId: string };
      return this.groupService.getJoinRequests(groupId, user.userId);
    }


    @Get('search')
    async searchPublic(@Query('name') name: string) {
      if (!name) return { results: [] };
      return this.groupService.searchPublicGroups(name);
    }
    
    
    // GET /groups/:id/members
    @Get(':id/members')
    @UseGuards(AuthGuard('jwt'))
    async getGroupMembers(
    @Param('id') groupId: string,
    @Request() req: ExpressRequest
    ) {
      const user = req.user as {userId: string };
      return this.groupService.getGroupMembers(groupId, user.userId);
  }



    @Post()
    @UseGuards(AuthGuard('jwt'))
    async createGroup(
      @Body() body: {
        name: string;
        description: string;
        isPublic: boolean;
        capacity: number;
      },
      @Request() req: ExpressRequest
    ) {
      const user = req.user as { userId: string };
      return this.groupService.createGroup({
        ...body,
        userId: user.userId,
      });
    }

    @Post(':id/join')
    @UseGuards(AuthGuard('jwt'))
    async requestToJoin(
    @Param('id') groupId: string,
    @Request() req: ExpressRequest
  ) {
      const user = req.user as { userId: string };
      return this.groupService.requestToJoin(groupId, user.userId);
  }

    @Post('join-by-invite')
    @UseGuards(AuthGuard('jwt'))
    async joinByInvite(
    @Query('code') code: string,
    @Request() req: ExpressRequest
  ) {
    const user = req.user as { userId: string };
    return this.groupService.joinByInviteCode(code, user.userId);
  }

  @Delete(':groupId/members/:userId')
  @UseGuards(AuthGuard('jwt'))
  async removeUserFromGroup(
    @Param('groupId') groupId: string,
    @Param('userId') userIdToRemove: string,
    @Request() req: ExpressRequest
  ) {
    const user = req.user as { userId: string };
    return this.groupService.removeUserFromGroup(groupId, user.userId, userIdToRemove);
  }


}
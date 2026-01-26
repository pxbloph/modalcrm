
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('conversations')
    async createConversation(@Request() req, @Body() body: { targetUserId: string }) {
        // Initiates a conversation with target user
        // If Operator -> target is Supervisor
        // If Supervisor -> target is Operator
        return this.chatService.createConversation(req.user.id, body.targetUserId);
    }

    @Get('conversations')
    async getConversations(@Request() req) {
        return this.chatService.getConversations(req.user.id, req.user.role);
    }

    @Get('partners')
    async getChatPartners(@Request() req) {
        return this.chatService.getChatPartners(req.user.id, req.user.role);
    }

    @Get('conversations/:id/messages')

    async getMessages(
        @Request() req,
        @Param('id') id: string,
        @Query('cursor') cursor?: string
    ) {
        return this.chatService.getMessages(id, req.user.id, req.user.role, cursor);
    }

    @Post('conversations/:id/read')
    async markAsRead(@Request() req, @Param('id') id: string) {
        return this.chatService.markAsRead(id, req.user.id);
    }
}

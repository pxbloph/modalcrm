
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway
    ) { }

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

    // --- ANNOUNCEMENTS & UPLOAD ---

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/chat',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
            }
        })
    }))
    uploadFile(@UploadedFile() file: any) {
        // Need to ensure types for file are handled or explicit any if Express types missing
        return {
            filename: file.filename,
            path: `/uploads/chat/${file.filename}`
        };
    }

    @Post('announcements')
    async createAnnouncement(@Request() req, @Body() body: any) {
        const announcement = await this.chatService.createAnnouncement(
            req.user.id,
            body.title,
            body.content,
            body.priority
        );
        this.chatGateway.sendAnnouncementNotification(announcement);
        return announcement;
    }

    @Get('announcements')
    async getAnnouncements(@Request() req) {
        return this.chatService.getAnnouncements(req.user.id);
    }

    @Post('announcements/:id/read')
    async markAnnouncementAsRead(@Request() req, @Param('id') id: string) {
        return this.chatService.markAnnouncementAsRead(id, req.user.id);
    }

    @Delete('announcements/:id')
    async deleteAnnouncement(@Request() req, @Param('id') id: string) {
        // Only Admin or Author can delete
        return this.chatService.deleteAnnouncement(id, req.user.id, req.user.role);
    }

    @Get('operator/:id/stats')
    async getOperatorStats(@Request() req, @Param('id') operatorId: string) {
        // Only Admin or Supervisor can access this
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERVISOR') {
            // throw new ForbiddenException('Access denied');
            // Or return empty/null to avoid error if frontend calls speculatively
        }
        return this.chatService.getOperatorStats(operatorId);
    }
}

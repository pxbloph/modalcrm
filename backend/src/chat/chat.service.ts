
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async createConversation(initiatorId: string, targetUserId: string) {
        if (!targetUserId) {
            throw new BadRequestException('Target User ID is required');
        }

        const initiator = await this.prisma.user.findUnique({
            where: { id: initiatorId },
            include: { supervisor: true },
        });

        if (!initiator) throw new BadRequestException('User not found');

        let operatorId: string;
        let supervisorId: string;

        if (initiator.role === Role.OPERATOR) {
            // Case 1: Operator initiates to Supervisor
            // Ensure target is a Supervisor (or Admin)
            const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
            if (!target || (target.role !== Role.SUPERVISOR && target.role !== Role.ADMIN)) {
                throw new BadRequestException('Target user must be a Supervisor');
            }

            operatorId = initiator.id;
            supervisorId = targetUserId;
        } else if (initiator.role === Role.SUPERVISOR || initiator.role === Role.ADMIN) {
            // Case 2: Supervisor (or Admin) initiates to Operator
            const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });

            if (!targetUser || targetUser.role !== Role.OPERATOR) {
                throw new BadRequestException('Target user must be an Operator');
            }

            // Optional: Strict hierarchy check for Supervisor
            if (initiator.role === Role.SUPERVISOR && targetUser.supervisor_id !== initiatorId) {
                // Allowing flexibility for now, or uncomment to restrict:
                // throw new ForbiddenException('You can only chat with operators in your team');
            }

            operatorId = targetUserId;
            supervisorId = initiator.id;
        } else {
            throw new ForbiddenException('Role not allowed to initiate chats');
        }

        return this.prisma.conversation.upsert({
            where: {
                operator_id_supervisor_id: {
                    operator_id: operatorId,
                    supervisor_id: supervisorId,
                },
            },
            update: {},
            create: {
                operator_id: operatorId,
                supervisor_id: supervisorId,
            },
            include: {
                operator: { select: { id: true, name: true, surname: true } },
                supervisor: { select: { id: true, name: true, surname: true } },
            },
        });
    }


    async getConversations(userId: string, role: string) {
        try {
            if (role === Role.ADMIN) {
                return this.prisma.conversation.findMany({
                    include: {
                        operator: { select: { id: true, name: true, surname: true } },
                        supervisor: { select: { id: true, name: true, surname: true } },
                    },
                    orderBy: { last_message_at: 'desc' }
                });
            }

            if (role === Role.SUPERVISOR) {
                return this.prisma.conversation.findMany({
                    where: { supervisor_id: userId },
                    include: {
                        operator: { select: { id: true, name: true, surname: true } },
                        // Count unread messages
                        messages: {
                            where: { is_read: false, sender_id: { not: userId } },
                            select: { id: true }
                        }
                    },
                    orderBy: { last_message_at: 'desc' },
                });
            }

            if (role === Role.OPERATOR) {
                return this.prisma.conversation.findMany({
                    where: { operator_id: userId },
                    include: {
                        supervisor: { select: { id: true, name: true, surname: true } },
                        messages: {
                            where: { is_read: false, sender_id: { not: userId } },
                            select: { id: true }
                        }
                    },
                });
            }

            return [];
        } catch (error) {
            console.error('Error in getConversations:', error);
            throw error;
        }
    }



    async getChatPartners(userId: string, role: string) {
        // 1. Determine eligible partners
        let potentialPartners: any[] = [];

        if (role === Role.OPERATOR) {
            // Operators see Supervisors and Admins
            potentialPartners = await this.prisma.user.findMany({
                where: {
                    role: { in: [Role.SUPERVISOR, Role.ADMIN] },
                    is_active: true
                },
                select: { id: true, name: true, surname: true, role: true, email: true } // Minimal fields
            });
        } else {
            // Supervisors/Admins see Operators (or everyone, but usually Operators)
            // For now, let's stick to Operators to keep list clean
            potentialPartners = await this.prisma.user.findMany({
                where: {
                    role: Role.OPERATOR,
                    is_active: true
                },
                select: { id: true, name: true, surname: true, role: true, email: true }
            });
        }

        // 2. Fetch existing conversations for this user
        // We can reuse logic similar to getConversations but we need a Map for efficiency
        const conversations = await this.getConversations(userId, role);
        const convMap = new Map();

        conversations.forEach((c: any) => {
            // Identify the "other" user ID
            const otherId = role === Role.OPERATOR ? c.supervisor_id : c.operator_id;
            convMap.set(otherId, c);
        });

        // 3. Merge and Shape Data
        const results = potentialPartners.map(partner => {
            const conv = convMap.get(partner.id);
            return {
                user: partner,
                conversationId: conv ? conv.id : null,
                lastMessageAt: conv ? conv.last_message_at : null,
                unreadCount: conv?.messages ? conv.messages.length : 0,
                // Helper for sorting
                hasConversation: !!conv
            };
        });

        // 4. Sort
        // Priority: Unread > Recent Conversation > Alphabetical
        return results.sort((a, b) => {
            // 1. Unread count descending
            if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;

            // 2. Last Message descending (if both have conversations)
            if (a.lastMessageAt && b.lastMessageAt) {
                return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
            }
            // If only one has conversation, prioritize it
            if (a.lastMessageAt && !b.lastMessageAt) return -1;
            if (!a.lastMessageAt && b.lastMessageAt) return 1;

            // 3. Alphabetical by Name
            return a.user.name.localeCompare(b.user.name);
        });
    }

    async getMessages(conversationId: string, userId: string, role: string, cursor?: string, limit = 50) {

        // Validate access
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) throw new BadRequestException('Conversation not found');

        if (role !== Role.ADMIN && conversation.operator_id !== userId && conversation.supervisor_id !== userId) {
            throw new ForbiddenException('Access denied');
        }

        if (role === Role.ADMIN) {
            await this.auditLog(userId, 'VIEW_MESSAGES', conversationId);
        }

        const messages = await this.prisma.message.findMany({
            where: { conversation_id: conversationId },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { created_at: 'desc' },
        });

        return messages.reverse();
    }

    async sendMessage(senderId: string, conversationId: string, body: string, clientMessageId?: string) {
        // Basic Validation: Ensure sender belongs to conversation check can be optimized or trusted from controller if tight
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) throw new BadRequestException('Conversation not found');
        if (conversation.operator_id !== senderId && conversation.supervisor_id !== senderId) {
            throw new ForbiddenException("You cannot send message to this conversation");
        }

        const message = await this.prisma.message.create({
            data: {
                conversation_id: conversationId,
                sender_id: senderId,
                body,
                client_message_id: clientMessageId
            }
        });

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { last_message_at: new Date() }
        });

        return message;
    }

    async markAsRead(conversationId: string, readerId: string) {
        await this.prisma.message.updateMany({
            where: {
                conversation_id: conversationId,
                sender_id: { not: readerId },
                is_read: false
            },
            data: { is_read: true, read_at: new Date() }
        });
    }

    async auditLog(adminId: string, action: string, targetId?: string, details?: string) {
        await this.prisma.chatAuditLog.create({
            data: {
                admin_id: adminId,
                action,
                target_id: targetId,
                details
            }
        });
    }

    // Helper for Gateway validation
    async validateUser(userId: string) {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }
}

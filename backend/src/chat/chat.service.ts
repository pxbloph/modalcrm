
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
            // Case 2: Supervisor/Admin initiates
            const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });

            if (!targetUser) {
                throw new BadRequestException('Target user not found');
            }

            if (targetUser.role === Role.OPERATOR) {
                // Normal flow: Manager -> Operator
                operatorId = targetUserId;
                supervisorId = initiator.id;
            } else if (initiator.role === Role.ADMIN && targetUser.role === Role.SUPERVISOR) {
                // Admin -> Supervisor
                // Treat Supervisor as "operator" (subordinate) in this relationship
                operatorId = targetUserId;
                supervisorId = initiator.id;
            } else if (initiator.role === Role.SUPERVISOR && targetUser.role === Role.ADMIN) {
                // Supervisor -> Admin
                // Treat Supervisor as "operator" (subordinate)
                operatorId = initiator.id;
                supervisorId = targetUserId;
            } else {
                throw new BadRequestException('Invalid chat target for your role');
            }
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
            if (role === Role.ADMIN || role === Role.SUPERVISOR) {
                return this.prisma.conversation.findMany({
                    where: {
                        OR: [
                            { supervisor_id: userId },
                            { operator_id: userId } // Include where they might be the "subordinate" (e.g. Sup talking to Admin)
                        ]
                    },
                    include: {
                        operator: { select: { id: true, name: true, surname: true } },
                        supervisor: { select: { id: true, name: true, surname: true } },
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
                        operator: { select: { id: true, name: true, surname: true } }, // Should accept themselves? Usually unused but good for consistency
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
                select: { id: true, name: true, surname: true, role: true, email: true }
            });
        } else if (role === Role.SUPERVISOR) {
            // Supervisors see Operators AND Admins
            potentialPartners = await this.prisma.user.findMany({
                where: {
                    role: { in: [Role.OPERATOR, Role.ADMIN] },
                    is_active: true
                },
                select: { id: true, name: true, surname: true, role: true, email: true }
            });
        } else if (role === Role.ADMIN) {
            // Admins see Operators AND Supervisors
            potentialPartners = await this.prisma.user.findMany({
                where: {
                    role: { in: [Role.OPERATOR, Role.SUPERVISOR] },
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
            // Identify the "other" user ID dynamically
            const otherId = (c.operator_id === userId) ? c.supervisor_id : c.operator_id;
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

        // Validar se usuário participa da conversa (mesmo ADMIN agora só vê as suas)
        if (conversation.operator_id !== userId && conversation.supervisor_id !== userId) {
            // Se quiser manter permissão total para ver (audit), descomente abaixo, mas user pediu para "não ver de todo mundo"
            // if (role !== Role.ADMIN) 
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
    // --- ANNOUNCEMENTS LOGIC ---

    async createAnnouncement(authorId: string, title: string, content: string, priority: string) {
        return this.prisma.announcement.create({
            data: {
                author_id: authorId,
                title,
                content,
                priority
            },
            include: {
                author: { select: { id: true, name: true, surname: true } }
            }
        });
    }

    async getAnnouncements(userId: string) {
        // 1. Get all announcements ordered by creation
        const announcements = await this.prisma.announcement.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                author: { select: { id: true, name: true, surname: true } },
                reads: {
                    where: { user_id: userId },
                    select: { id: true }
                } // Check if THIS user read it
            }
        });

        // 2. Map to add 'isRead' flag
        return announcements.map(a => ({
            ...a,
            isRead: a.reads.length > 0
        }));
    }

    async markAnnouncementAsRead(announcementId: string, userId: string) {
        // Idempotent operation
        try {
            await this.prisma.announcementRead.create({
                data: {
                    announcement_id: announcementId,
                    user_id: userId
                }
            });
        } catch (e) {
            // Ignore unique constraint violation (already read)
        }
    }

    async deleteAnnouncement(announcementId: string, userId: string, role: string) {
        const announcement = await this.prisma.announcement.findUnique({
            where: { id: announcementId }
        });

        if (!announcement) throw new BadRequestException('Announcement not found');

        // Permission Check: Admin OR Author
        if (role !== Role.ADMIN && announcement.author_id !== userId) {
            throw new ForbiddenException('You can only delete your own announcements');
        }

        await this.prisma.announcement.delete({
            where: { id: announcementId }
        });

        return { success: true };
    }

    async getOperatorStats(operatorId: string) {
        // 1. Validate Operator
        const operator = await this.prisma.user.findUnique({
            where: { id: operatorId },
            select: { id: true, name: true, surname: true, role: true }
        });

        if (!operator) throw new BadRequestException('Operator not found');

        // 2. Aggregate Stats (Filtered by Current Month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // A. Total Leads Created (This Month)
        const totalLeads = await this.prisma.client.count({
            where: {
                created_by_id: operatorId,
                created_at: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        // B. Total with Tabulation "Conta aberta" (This Month Cohort)
        const totalTabulationOpen = await this.prisma.client.count({
            where: {
                created_by_id: operatorId,
                created_at: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                tabulacao: 'Conta aberta'
            }
        });

        // C. Total Real Open Accounts (This Month Cohort)
        const totalRealOpen = await this.prisma.client.count({
            where: {
                created_by_id: operatorId,
                created_at: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                has_open_account: true
            }
        });

        return {
            operator: {
                id: operator.id,
                name: operator.name,
                surname: operator.surname
            },
            stats: {
                totalLeads,
                totalTabulationOpen,
                totalRealOpen
            }
        };
    }
}

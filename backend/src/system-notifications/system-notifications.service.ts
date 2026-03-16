import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';

@Injectable()
export class SystemNotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly securityService: SecurityService,
    ) { }

    async listForUser(user: any) {
        const notifications: any[] = [];

        const unreadAnnouncements = await this.prisma.announcement.count({
            where: {
                reads: {
                    none: { user_id: user.id },
                },
            },
        });

        if (unreadAnnouncements > 0) {
            notifications.push({
                id: `announcements-unread-${user.id}`,
                type: 'ANNOUNCEMENTS_UNREAD',
                severity: 'info',
                title: 'Avisos não lidos',
                message: `Você possui ${unreadAnnouncements} aviso(s) não lido(s) no Chat.`,
                action_url: '/chat',
                source: 'CHAT_ANNOUNCEMENTS',
                created_at: new Date().toISOString(),
            });
        }

        const canSeeSecurityAlerts =
            user.role === 'ADMIN' ||
            (await this.securityService.userHasPermission(user.id, 'security.manage_roles'));

        if (canSeeSecurityAlerts) {
            const safety = await this.securityService.getSuperAdminSafetyStatus();
            if (safety.alert) {
                notifications.push({
                    id: 'superadmin-safety-warning',
                    type: 'SUPERADMIN_SAFETY',
                    severity: 'critical',
                    title: 'Risco de acesso administrativo',
                    message: safety.message,
                    action_url: '/settings/security',
                    source: 'SECURITY',
                    created_at: new Date().toISOString(),
                    metadata: safety,
                });
            }
        }

        return notifications;
    }
}

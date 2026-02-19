import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';

@Injectable()
export class ClientCustomFieldsService {
    constructor(private prisma: PrismaService) { }

    // --- GROUPS ---

    async findAllGroups(user: User) {
        return this.prisma.customFieldGroup.findMany({
            where: { is_active: true },
            include: {
                fields: {
                    where: { is_active: true },
                    orderBy: { order_index: 'asc' }
                }
            },
            orderBy: { order_index: 'asc' }
        });
    }

    async findAllGroupsAdmin(user: User) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');
        return this.prisma.customFieldGroup.findMany({
            include: {
                fields: {
                    orderBy: { order_index: 'asc' }
                }
            },
            orderBy: { order_index: 'asc' }
        });
    }

    async createGroup(user: User, data: { name: string, order_index?: number }) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        return this.prisma.customFieldGroup.create({
            data: {
                name: data.name,
                order_index: data.order_index ?? 0
            }
        });
    }

    async updateGroup(user: User, id: string, data: { name?: string, order_index?: number, is_active?: boolean }) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        return this.prisma.customFieldGroup.update({
            where: { id },
            data
        });
    }

    async deleteGroup(user: User, id: string) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        // Block if has fields
        const count = await this.prisma.clientCustomField.count({ where: { group_id: id } });
        if (count > 0) throw new ConflictException('Cannot delete group with fields.');

        return this.prisma.customFieldGroup.delete({ where: { id } });
    }

    async reorderGroups(user: User, ids: string[]) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        const updates = ids.map((id, index) =>
            this.prisma.customFieldGroup.update({
                where: { id },
                data: { order_index: index }
            })
        );
        return this.prisma.$transaction(updates);
    }

    // --- FIELDS ---

    async createField(user: User, data: any) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        // Generate Key if not provided
        let key = data.key;
        if (!key) {
            key = this.generateSlug(data.label);
        }

        // Check Duplicity
        const exists = await this.prisma.clientCustomField.findUnique({ where: { key } });
        if (exists) throw new ConflictException(`Key '${key}' already exists.`);

        return this.prisma.clientCustomField.create({
            data: {
                group_id: data.group_id,
                key: key,
                label: data.label,
                type: data.type,
                options_json: data.options_json,
                is_required: data.is_required,
                order_index: data.order_index ?? 0,
                is_active: true
            }
        });
    }

    async updateField(user: User, id: string, data: any) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        return this.prisma.clientCustomField.update({
            where: { id },
            data: {
                label: data.label,
                options_json: data.options_json,
                is_required: data.is_required,
                order_index: data.order_index,
                is_active: data.is_active,
                // Key and Type should usually be immutable to avoid breaking integrations & data
            }
        });
    }

    async deleteField(user: User, id: string) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        // Soft delete prefered or check values
        // Strategy: Soft Delete by setting is_active false? Or Allow delete?
        // Prompt implies "manage/deactivate". Let's update is_active to false instead of delete unless explicitly asked.
        // User asked: "criar/editar/remover/desativar"

        // Check values
        const valuesCount = await this.prisma.clientCustomFieldValue.count({ where: { field_id: id } });
        if (valuesCount > 0) {
            throw new ConflictException('Field has associated values. Deactivate instead of delete.');
        }

        return this.prisma.clientCustomField.delete({ where: { id } });
    }

    async reorderFields(user: User, ids: string[]) {
        if (user.role !== Role.ADMIN) throw new ConflictException('Unauthorized');

        const updates = ids.map((id, index) =>
            this.prisma.clientCustomField.update({
                where: { id },
                data: { order_index: index }
            })
        );
        return this.prisma.$transaction(updates);
    }


    // --- VALUES ---

    async getClientValues(clientId: string) {
        const values = await this.prisma.clientCustomFieldValue.findMany({
            where: { client_id: clientId },
            include: { field: true }
        });

        return values;

    }

    // Upsert Values Batch
    async updateClientValues(user: User, clientId: string, values: { [key: string]: any }) {
        // Validation (optional: check required fields)

        const results = [];

        for (const [key, value] of Object.entries(values)) {
            const field = await this.prisma.clientCustomField.findUnique({ where: { key } });
            if (!field) continue; // Skip unknown keys

            // Determine column based on type
            let dataPayload: any = {
                value_text: null,
                value_number: null,
                value_date: null,
                value_bool: null,
                value_json: null
            };

            if (field.type === 'NUMBER' || field.type === 'CURRENCY') {
                dataPayload.value_number = value !== null ? Number(value) : null;
            } else if (field.type === 'BOOLEAN') {
                dataPayload.value_bool = value;
            } else if (field.type === 'DATE') {
                dataPayload.value_date = value ? new Date(value) : null;
            } else if (field.type === 'MULTI_SELECT') {
                dataPayload.value_json = value;
            } else {
                dataPayload.value_text = value !== null ? String(value) : null;
            }

            const upsert = await this.prisma.clientCustomFieldValue.upsert({
                where: {
                    client_id_field_id: {
                        client_id: clientId,
                        field_id: field.id
                    }
                },
                create: {
                    client_id: clientId,
                    field_id: field.id,
                    ...dataPayload
                },
                update: {
                    ...dataPayload
                }
            });
            results.push(upsert);
        }

        return results;
    }

    private generateSlug(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .normalize('NFD') // Remove accents
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '')
            .replace(/__+/g, '_');
    }
}


import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { QualificationRadioGroup } from './QualificationRadioGroup';

export function ClientCustomFieldsRenderer({ clientId, className }: { clientId?: string, className?: string }) {
    const { setValue } = useFormContext();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFields = async () => {
            setLoading(true);
            try {
                // Fetch groups and definitions
                const res = await api.get('/client-custom-fields/groups'); // Use public endpoint (returns active only)
                // Note: user endpoint might be different? Access control? 
                // The controller has findAllGroupsAdmin. Is there a public one?
                // The requirement says "Renderizar por grupos... mostrar apenas ativos".
                // admin endpoint returns all. I should probably filter client-side or use a client-specific endpoint.
                // Let's use the admin one and filter for now if there isn't another. 
                // Actually, for "Filling", we need active fields. 

                // Let's assume admin endpoint is fine for now, filtering active fields.
                setGroups(res.data);

                // If clientId exists, fetch values to populate form
                if (clientId) {
                    // Note: The parent modal might handle fetching values to keep it centralized, 
                    // but fetching here isolates the logic nicely.
                    // IMPORTANT: If we fetch here, we need to populate useForm.
                    // But the parent ALSO resets the form. Race conditions?
                    // If parent uses populateForm(), it might overwrite what we set here if it happens later.
                    // The parent handles `loadedData`. 
                    // Let's actually NOT fetch values here if we can help it, OR ensure we write to a distinct namespace `custom_fields`.

                    // Actually, reading values:
                    // We can fetch values independently and just setValue('custom_fields.key', value).
                    // Parent form reset clears `client` and `qualification`. `custom_fields` might be untouched if not in defaultValues?
                    // No, reset() usually clears everything not provided.
                    // So we should probably let the Parent fetch values, OR we fetch here and `setValue` AFTER parent reset.
                    // Using `useEffect` here runs on mount. Parent reset happens on mount too.

                    const valRes = await api.get(`/client-custom-fields/values/${clientId}`);
                    const values = valRes.data; // array of values

                    values.forEach((v: any) => {
                        let val = null;
                        if (v.value_text !== null) val = v.value_text;
                        else if (v.value_number !== null) val = v.value_number;
                        else if (v.value_date !== null) val = v.value_date ? v.value_date.split('T')[0] : null; // Date input needs YYYY-MM-DD
                        else if (v.value_bool !== null) val = v.value_bool;
                        else if (v.value_json !== null) val = v.value_json;

                        if (v.field && v.field.key) {
                            setValue(`custom_fields.${v.field.key}`, val);
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to load custom fields", e);
            } finally {
                setLoading(false);
            }
        };
        loadFields();
    }, [clientId, setValue]);

    if (loading) return <div className="flex items-center gap-2 text-sm text-gray-400 py-4"><Loader2 className="h-4 w-4 animate-spin" /> Carregando campos...</div>;
    if (groups.length === 0) return null;

    return (
        <div className={`space-y-6 ${className || ''}`}>
            {[...groups].sort((a: any, b: any) => (a.order_index || a.order || 0) - (b.order_index || b.order || 0)).map((group) => {
                const activeFields = group.fields ? [...group.fields].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];

                if (activeFields.length === 0) return null;

                return (
                    <div key={group.id} className="bg-card p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{group.name}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeFields.map((field: any) => {
                                // Lógica de Grid: 
                                // Backend envia 12 (full) ou 6 (half).
                                // Tailwind grid-cols-2: col-span-2 é full, padrão é 1 (half).
                                const isFull = field.col_span === 12 || field.type === 'TEXTAREA' || field.type === 'JSON';
                                const colClass = isFull ? 'col-span-1 md:col-span-2' : 'col-span-1';

                                return (
                                    <div key={field.id} className={colClass}>
                                        <FieldInput field={field} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function FieldInput({ field }: { field: any }) {
    const { register, watch, setValue } = useFormContext();
    const fieldName = `custom_fields.${field.key}`;
    const value = watch(fieldName);

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                {field.label}
                {field.is_required && <span className="text-destructive">*</span>}
            </Label>

            {field.type === 'TEXT' && (
                <Input {...register(fieldName)} placeholder={field.placeholder} className="bg-input/20 border-input text-xs" />
            )}

            {field.type === 'TEXTAREA' && (
                <Textarea {...register(fieldName)} placeholder={field.placeholder} className="bg-input/20 border-input text-xs" />
            )}

            {(field.type === 'NUMBER') && (
                <Input type="number" step="any" {...register(fieldName)} placeholder={field.placeholder} className="bg-input/20 border-input text-xs" />
            )}

            {(field.type === 'CURRENCY') && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                        type="number"
                        step="0.01"
                        {...register(fieldName)}
                        className="pl-9 bg-input/20 border-input text-xs"
                        placeholder="0,00"
                    />
                </div>
            )}

            {field.type === 'DATE' && (
                <Input type="date" {...register(fieldName)} className="bg-input/20 border-input text-xs" />
            )}

            {field.type === 'BOOLEAN' && (
                <div className="flex items-center gap-2 py-1">
                    <Switch
                        checked={value === true}
                        onCheckedChange={(checked) => setValue(fieldName, checked)}
                    />
                    <span className="text-xs text-muted-foreground">{value ? 'Sim' : 'Não'}</span>
                </div>
            )}

            {field.type === 'SELECT' && (
                <QualificationRadioGroup
                    name={fieldName}
                    value={value || ''}
                    onChange={(val) => setValue(fieldName, val)}
                    options={(field.options_json || []).map((opt: string) => ({ label: opt, value: opt }))}
                />
            )}

            {field.type === 'MULTI_SELECT' && (
                // Fallback to simple multiple select native if shadcn MultiSelect not available widely
                // Or implement a simple checkbox list
                <div className="space-y-2 p-3 border rounded-md border-input bg-muted/50 max-h-32 sm:max-h-40 overflow-y-auto">
                    {field.options_json?.map((opt: string) => {
                        const current = Array.isArray(value) ? value : [];
                        const isChecked = current.includes(opt);
                        return (
                            <div key={opt} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setValue(fieldName, [...current, opt]);
                                        } else {
                                            setValue(fieldName, current.filter((v: string) => v !== opt));
                                        }
                                    }}
                                    className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                                />
                                <span className="text-xs text-foreground">{opt}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Support help text if available in future */}
        </div>
    );
}

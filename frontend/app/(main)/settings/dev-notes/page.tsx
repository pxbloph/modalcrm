'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DevNote = {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    show_in_daily_popup: boolean;
    created_at: string;
    created_by?: {
        id: string;
        name: string;
        surname?: string | null;
    } | null;
};

const emptyForm = {
    title: '',
    content: '',
    is_active: true,
    show_in_daily_popup: true,
};

export default function DevNotesSettingsPage() {
    const [notes, setNotes] = useState<DevNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dev-notes');
            setNotes(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            console.error('Erro ao carregar Dev Notes', error);
            alert(error?.response?.data?.message || 'Erro ao carregar Dev Notes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/dev-notes/${editingId}`, form);
            } else {
                await api.post('/dev-notes', form);
            }
            await loadNotes();
            resetForm();
        } catch (error: any) {
            console.error('Erro ao salvar Dev Note', error);
            alert(error?.response?.data?.message || 'Erro ao salvar Dev Note.');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (note: DevNote) => {
        setEditingId(note.id);
        setForm({
            title: note.title,
            content: note.content,
            is_active: note.is_active,
            show_in_daily_popup: note.show_in_daily_popup,
        });
    };

    const handleDelete = async (note: DevNote) => {
        if (!window.confirm(`Excluir a Dev Note "${note.title}"?`)) return;
        try {
            await api.delete(`/dev-notes/${note.id}`);
            await loadNotes();
            if (editingId === note.id) {
                resetForm();
            }
        } catch (error: any) {
            console.error('Erro ao excluir Dev Note', error);
            alert(error?.response?.data?.message || 'Erro ao excluir Dev Note.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Dev Notes</h1>
                <p className="mt-1 text-sm text-muted-foreground">Comunique ajustes e novidades da plataforma para todos os usuários.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{editingId ? 'Editar Dev Note' : 'Nova Dev Note'}</h2>
                    {editingId && (
                        <Button type="button" variant="outline" onClick={resetForm}>
                            Cancelar edição
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Título</Label>
                        <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex h-10 items-center gap-6 rounded-md border px-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                                />
                                Ativa
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.show_in_daily_popup}
                                    onChange={(e) => setForm((prev) => ({ ...prev, show_in_daily_popup: e.target.checked }))}
                                />
                                Exibir no popup diário
                            </label>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Conteúdo</Label>
                    <textarea
                        value={form.content}
                        onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                        rows={6}
                        required
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Descreva a melhoria ou o aviso que deve aparecer para os usuários."
                    />
                </div>

                <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Dev Note'}
                </Button>
            </form>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b p-4">
                    <h2 className="font-semibold">Notas cadastradas</h2>
                </div>

                {loading ? (
                    <div className="p-6 text-sm text-muted-foreground">Carregando Dev Notes...</div>
                ) : notes.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">Nenhuma Dev Note cadastrada.</div>
                ) : (
                    <div className="space-y-3 p-4">
                        {notes.map((note) => (
                            <div key={note.id} className="rounded-xl border p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{note.title}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${note.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                                                {note.is_active ? 'Ativa' : 'Inativa'}
                                            </span>
                                            {note.show_in_daily_popup && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                    Popup diário
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {new Date(note.created_at).toLocaleString('pt-BR')}
                                            {note.created_by?.name ? ` | ${note.created_by.name}${note.created_by.surname ? ` ${note.created_by.surname}` : ''}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(note)}>
                                            Editar
                                        </Button>
                                        <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(note)}>
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

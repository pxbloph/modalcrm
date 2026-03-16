'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Wrench } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

interface DevNotesWidgetProps {
    userId?: string;
}

function formatBrazilDateTime(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function parseDevNoteContent(content: string) {
    const blocks = content
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean);

    if (blocks.length === 0) {
        return { intro: '', sections: [] as Array<{ title: string; body: string }> };
    }

    const [intro, ...rest] = blocks;
    const sections = rest.map((block) => {
        const [title, ...bodyLines] = block.split('\n').map((line) => line.trim()).filter(Boolean);
        return {
            title: title || '',
            body: bodyLines.join(' '),
        };
    });

    return { intro, sections };
}

export function DevNotesWidget({ userId }: DevNotesWidgetProps) {
    const [notes, setNotes] = useState<DevNote[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const activeNotes = useMemo(() => notes.filter((note) => note.is_active), [notes]);

    useEffect(() => {
        if (!userId) return;

        const loadFeed = async () => {
            setLoading(true);
            try {
                const res = await api.get('/dev-notes/feed');
                const nextNotes = Array.isArray(res.data?.notes) ? res.data.notes : [];
                setNotes(nextNotes);

                if (res.data?.should_auto_open) {
                    setOpen(true);
                    await api.post('/dev-notes/mark-seen-today');
                }
            } catch (error) {
                console.error('Erro ao carregar Dev Notes', error);
            } finally {
                setLoading(false);
            }
        };

        loadFeed();
    }, [userId]);

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                onClick={() => setOpen(true)}
                title="Dev Notes"
                className="relative"
            >
                <Bot className="h-[1.15rem] w-[1.15rem]" />
                <Wrench className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background p-[1px] text-primary" />
                {activeNotes.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {activeNotes.length}
                    </span>
                )}
                <span className="sr-only">Abrir Dev Notes</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Dev Notes
                        </DialogTitle>
                        <DialogDescription>
                            Atualizações e avisos da plataforma. Este popup abre automaticamente no primeiro login do dia.
                        </DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">Carregando Dev Notes...</div>
                    ) : activeNotes.length === 0 ? (
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma Dev Note ativa no momento.</div>
                    ) : (
                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                            {activeNotes.map((note) => (
                                <div key={note.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">{note.title}</p>
                                            {(() => {
                                                const parsed = parseDevNoteContent(note.content);
                                                return (
                                                    <div className="mt-3 space-y-3">
                                                        {parsed.intro && (
                                                            <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground">
                                                                {parsed.intro}
                                                            </div>
                                                        )}

                                                        {parsed.sections.map((section, index) => (
                                                            <div key={`${note.id}-section-${index}`} className="rounded-lg border bg-background/60 p-3">
                                                                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                                                                {section.body && (
                                                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.body}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                {formatBrazilDateTime(note.created_at)}
                                                {note.created_by?.name ? ` | ${note.created_by.name}${note.created_by.surname ? ` ${note.created_by.surname}` : ''}` : ''}
                                            </p>
                                        </div>
                                        {note.show_in_daily_popup && (
                                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                                                Popup diário
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

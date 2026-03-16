'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface QualificationRadioOption {
    label: string;
    value: string;
}

interface QualificationRadioGroupProps {
    /** name attribute for the radio group — must be unique per form */
    name: string;
    options: QualificationRadioOption[];
    /** Currently selected value; pass empty string for no selection */
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

/**
 * Single-choice option selector rendered as clickable chip buttons.
 * Exclusively for use inside Qualificação de Cliente forms.
 *
 * Semantics preserved:
 * - Each option is an <input type="radio"> + <label> pair
 * - Radio input is visually hidden (sr-only) but fully present in the DOM
 * - Focus ring is projected onto the label via the CSS peer pattern
 * - Keyboard navigation (arrow keys, space) works via native radio behaviour
 */
export function QualificationRadioGroup({
    name,
    options,
    value,
    onChange,
    disabled = false,
    required = false,
    className,
}: QualificationRadioGroupProps) {
    return (
        <div
            role="radiogroup"
            aria-required={required || undefined}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {options.map((opt) => {
                const id = `${name}__${opt.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
                const isSelected = value === opt.value;

                return (
                    // Wrapper div scopes the CSS peer selector so only the
                    // sibling label of *this* input gets the focus ring.
                    <div key={opt.value} className="inline-flex">
                        <input
                            type="radio"
                            id={id}
                            name={name}
                            value={opt.value}
                            checked={isSelected}
                            onChange={() => { if (!disabled) onChange(opt.value); }}
                            required={required}
                            disabled={disabled}
                            // Visually hidden but accessible and keyboard-focusable
                            className="sr-only peer"
                        />
                        <label
                            htmlFor={id}
                            className={cn(
                                // Base chip style
                                'inline-flex items-center px-3 py-1.5 rounded-full border',
                                'text-xs font-semibold select-none transition-all duration-150',
                                // Focus ring projected from the hidden peer radio input
                                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-1',
                                // Selected state
                                isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : [
                                        'bg-input/20 text-muted-foreground border-input',
                                        'hover:border-primary/50 hover:text-foreground hover:bg-muted/50',
                                        'cursor-pointer',
                                    ],
                                // Disabled state
                                disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                            )}
                        >
                            {opt.label}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale = 'fr-FR', currency = 'EUR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export const STATUS_LABELS: Record<string, string> = {
  new:         'Nouveau',
  in_progress: 'En cours',
  converted:   'Converti',
  lost:        'Perdu',
};

export const STATUS_COLORS: Record<string, string> = {
  new:         'status-new',
  in_progress: 'status-in_progress',
  converted:   'status-converted',
  lost:        'status-lost',
};

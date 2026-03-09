// components/ui/GlassCard.tsx
import { cn } from '@/lib/utils';
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'brand' | 'purple' | 'cyan' | 'emerald' | 'amber' | 'rose' | false;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const glowColors = {
  brand:   'hover:shadow-brand-500/20 hover:border-brand-500/30',
  purple:  'hover:shadow-purple-500/20 hover:border-purple-500/30',
  cyan:    'hover:shadow-cyan-500/20 hover:border-cyan-500/30',
  emerald: 'hover:shadow-emerald-500/20 hover:border-emerald-500/30',
  amber:   'hover:shadow-amber-500/20 hover:border-amber-500/30',
  rose:    'hover:shadow-rose-500/20 hover:border-rose-500/30',
};

const paddings = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
};

export default function GlassCard({
  className,
  children,
  glow = 'brand',
  padding = 'md',
  hover = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card',
        paddings[padding],
        hover && [
          'cursor-pointer transition-all duration-200',
          'hover:bg-white/10',
          glow && glowColors[glow],
          'hover:shadow-2xl',
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

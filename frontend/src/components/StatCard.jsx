import { Card, CardContent } from '@/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { StatCardSkeleton } from './StatCardSkeleton';

/**
 * StatCard
 * - Pass `gradient` (Tailwind gradient classes) for the colorful, white-on-color
 *   variant used across dashboards.
 * - Omit `gradient` for a clean, theme-aware surface variant with a tinted icon chip.
 */
export const StatCard = ({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  subtitle,
  to,
  onClick,
  isLoading,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else if (onClick) onClick();
  };

  const isClickable = Boolean(to || onClick);
  const hasGradient = Boolean(gradient);

  if (isLoading) {
    return <StatCardSkeleton gradient={gradient} />;
  }

  const TrendIcon = trend > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all duration-200',
        hasGradient ? 'border-transparent text-white shadow-soft' : 'hover:border-primary/30',
        gradient,
        isClickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                hasGradient ? 'text-white/80' : 'text-muted-foreground'
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                'mt-2 text-3xl font-bold tracking-tight',
                hasGradient ? 'text-white' : 'text-foreground'
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p
                className={cn(
                  'mt-1 text-xs',
                  hasGradient ? 'text-white/70' : 'text-muted-foreground'
                )}
              >
                {subtitle}
              </p>
            )}
            {typeof trend === 'number' && (
              <div
                className={cn(
                  'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  hasGradient
                    ? 'bg-white/15 text-white'
                    : trend > 0
                      ? 'bg-success/15 text-success'
                      : 'bg-destructive/15 text-destructive'
                )}
              >
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                hasGradient ? 'bg-white/20' : 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

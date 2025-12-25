import { Card, CardContent } from '@/ui/card';
import { cn } from '@/lib/utils';

export const StatCard = ({ title, value, icon: Icon, gradient, trend, subtitle }) => {
  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-lg', gradient)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground text-white">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={cn('flex items-center mt-2 text-sm', trend > 0 ? 'text-green-600' : 'text-red-600')}>
                <span>{trend > 0 ? '↑' : '↓'}</span>
                <span className="ml-1">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="ml-4 p-3 rounded-full bg-white/20">
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


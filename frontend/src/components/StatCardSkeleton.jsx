import { Card, CardContent } from '@/ui/card';
import { cn } from '@/lib/utils';

export const StatCardSkeleton = ({ gradient }) => {
  return (
    <Card 
      className={cn(
        'overflow-hidden',
        gradient || 'bg-gradient-to-br from-gray-200 to-gray-300'
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Title skeleton */}
            <div className="h-4 w-24 bg-white/30 rounded animate-pulse mb-4"></div>
            {/* Value skeleton */}
            <div className="h-9 w-16 bg-white/40 rounded animate-pulse"></div>
          </div>
          {/* Icon skeleton */}
          <div className="ml-4 p-3 rounded-full bg-white/20">
            <div className="h-6 w-6 bg-white/30 rounded-full animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


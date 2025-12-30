import { Button } from '@/ui/button';

export const Pagination = ({ pagination, onPageChange, className = '' }) => {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const { page, pages, limit, total } = pagination;

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>
          Showing {(page - 1) * limit + 1} to{' '}
          {Math.min(page * limit, total)} of {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-7 px-2 text-xs"
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            let pageNum;
            if (pages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= pages - 2) {
              pageNum = pages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="h-7 w-7 px-0 text-xs"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="h-7 px-2 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  );
};


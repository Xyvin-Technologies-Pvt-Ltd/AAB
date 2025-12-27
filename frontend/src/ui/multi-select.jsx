import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MultiSelect = ({
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
  isLoading = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleOption = (optionId) => {
    const isSelected = selected.includes(optionId);
    if (isSelected) {
      onChange(selected.filter((id) => id !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    onChange(selected.filter((id) => id !== optionId));
  };

  const getSelectedNames = () => {
    return selected
      .map((id) => options.find((opt) => opt._id === id)?.name)
      .filter(Boolean);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[40px] px-3 py-2 text-sm border border-gray-300 rounded-lg',
          'bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'flex items-center justify-between gap-2',
          isOpen && 'border-indigo-500 ring-2 ring-indigo-500'
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[24px]">
          {selected.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            getSelectedNames().map((name, idx) => {
              const optionId = options.find((opt) => opt.name === name)?._id;
              return (
                <span
                  key={optionId || idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-md"
                >
                  {name}
                  <button
                    type="button"
                    onClick={(e) => removeOption(optionId, e)}
                    className="hover:bg-indigo-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-gray-500 text-center">Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">{emptyMessage}</div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option._id);
                  return (
                    <div
                      key={option._id}
                      onClick={() => toggleOption(option._id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer hover:bg-gray-100',
                        isSelected && 'bg-indigo-50 hover:bg-indigo-100'
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-4 h-4 border-2 rounded',
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={cn('flex-1', isSelected && 'font-medium text-indigo-900')}>
                        {option.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


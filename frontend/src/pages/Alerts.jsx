import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { clientsApi } from '@/api/clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Filter,
  X,
  FileText,
  Building2,
  Receipt,
  User,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

const AlertItem = ({ item, onClientClick }) => {
  // Determine if this is an alert or deadline
  const isDeadline = !item.message && item.type;
  
  // Get type icon
  const getTypeIcon = () => {
    const type = item.type?.toLowerCase() || '';
    const category = item.category?.toLowerCase() || '';
    
    if (type.includes('license') || category.includes('license')) {
      return <Building2 className="h-4 w-4 text-gray-500" />;
    }
    if (type.includes('corporate') || category.includes('corporate')) {
      return <Receipt className="h-4 w-4 text-gray-500" />;
    }
    if (type.includes('vat') || category.includes('vat')) {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
    if (type.includes('emirates') || type.includes('passport')) {
      return <User className="h-4 w-4 text-gray-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  // Get severity icon
  const getSeverityIcon = () => {
    const severity = item.severity;
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry ?? 999;
    
    if (daysRemaining < 0) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (severity === 'CRITICAL' || daysRemaining <= 7) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (severity === 'HIGH' || daysRemaining <= 14) {
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
    if (severity === 'MEDIUM' || daysRemaining <= 30) {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-600" />;
  };

  // Get severity badge
  const getSeverityBadge = () => {
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry ?? 999;
    const isOverdue = daysRemaining < 0;
    
    if (isOverdue) {
      return <Badge variant="error">Overdue {Math.abs(daysRemaining)} days</Badge>;
    }
    
    if (item.severity === 'CRITICAL' || daysRemaining <= 7) {
      return <Badge variant="error">Critical</Badge>;
    }
    if (item.severity === 'HIGH' || daysRemaining <= 14) {
      return <Badge variant="warning">High</Badge>;
    }
    if (item.severity === 'MEDIUM' || daysRemaining <= 30) {
      return <Badge variant="info">Medium</Badge>;
    }
    return <Badge variant="outline">Low</Badge>;
  };

  // Get display message
  const getMessage = () => {
    if (item.message) {
      return item.message;
    }
    // For deadlines, create message from type
    const type = item.type?.replace(/_/g, ' ') || '';
    const category = item.category?.replace(/_/g, ' ') || '';
    return category || type || 'Deadline';
  };

  // Get date display
  const getDateDisplay = () => {
    const dueDate = item.dueDate || item.expiryDate;
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry;
    
    if (daysRemaining !== undefined) {
      if (daysRemaining < 0) {
        return `Overdue ${Math.abs(daysRemaining)} days`;
      }
      return `${daysRemaining} days remaining`;
    }
    
    if (dueDate) {
      return formatDateDDMMYYYY(dueDate);
    }
    
    return null;
  };

  return (
    <div
      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClientClick(item.clientId)}
    >
      {getSeverityIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getTypeIcon()}
            <p className="text-sm font-medium text-gray-900 truncate">{getMessage()}</p>
          </div>
          {getSeverityBadge()}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">{item.clientName}</p>
          {getDateDisplay() && (
            <p className="text-xs text-gray-500">{getDateDisplay()}</p>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </div>
  );
};

export const Alerts = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch all data once - filter client-side
  const { data, isLoading } = useQuery({
    queryKey: ['allAlerts'],
    queryFn: () => clientsApi.getAllAlerts({ type: undefined, severity: undefined }),
  });

  const allAlerts = data?.data?.alerts || [];
  const allDeadlines = data?.data?.deadlines || [];

  // Merge all alerts and deadlines
  const allUnifiedItems = useMemo(() => {
    return [
      ...allAlerts.map(alert => ({ ...alert, itemType: 'alert' })),
      ...allDeadlines.map(deadline => ({ ...deadline, itemType: 'deadline' })),
    ];
  }, [allAlerts, allDeadlines]);

  // Filter and sort unified items for display
  const unifiedItems = useMemo(() => {
    let filtered = allUnifiedItems;
    
    // Apply type filter
    if (typeFilter) {
      filtered = allUnifiedItems.filter((item) => {
        const itemType = item.type?.toLowerCase() || '';
        const itemCategory = item.category?.toLowerCase() || '';
        return itemType.includes(typeFilter.toLowerCase()) || itemCategory.includes(typeFilter.toLowerCase());
      });
    }

    // Sort by urgency: critical first, then by days remaining
    return filtered.sort((a, b) => {
      const daysA = a.daysUntilDue ?? a.daysUntilExpiry ?? 999;
      const daysB = b.daysUntilDue ?? b.daysUntilExpiry ?? 999;
      
      // Overdue items first
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysA >= 0 && daysB < 0) return 1;
      
      // Then by severity
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const severityA = severityOrder[a.severity] ?? 3;
      const severityB = severityOrder[b.severity] ?? 3;
      if (severityA !== severityB) {
        return severityA - severityB;
      }
      
      // Then by days remaining (sooner first)
      return daysA - daysB;
    });
  }, [allUnifiedItems, typeFilter]);

  // Calculate counts for each filter type from all unified items
  const getTypeCount = (typeValue) => {
    if (!typeValue) return allUnifiedItems.length;
    return allUnifiedItems.filter((item) => {
      const itemType = item.type?.toLowerCase() || '';
      const itemCategory = item.category?.toLowerCase() || '';
      return itemType.includes(typeValue.toLowerCase()) || itemCategory.includes(typeValue.toLowerCase());
    }).length;
  };

  const filterTypes = [
    { value: '', label: 'All Types', count: getTypeCount('') },
    { value: 'license', label: 'License', count: getTypeCount('license') },
    { value: 'corporate', label: 'Corporate Tax', count: getTypeCount('corporate') },
    { value: 'vat', label: 'VAT', count: getTypeCount('vat') },
    { value: 'emirates', label: 'Emirates ID', count: getTypeCount('emirates') },
    { value: 'passport', label: 'Passport', count: getTypeCount('passport') },
  ];

  const handleClientClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const clearFilters = () => {
    setTypeFilter('');
  };

  const hasActiveFilters = typeFilter !== '';

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts & Deadlines</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor all compliance alerts and upcoming deadlines</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Type:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setTypeFilter(type.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                      typeFilter === type.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      typeFilter === type.value
                        ? 'bg-indigo-700 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {type.count}
                    </span>
                  </button>
                ))}
              </div>
              {hasActiveFilters && (
                <div className="pt-2">
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unified List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading alerts...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  All Alerts & Deadlines ({unifiedItems.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unifiedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No alerts or deadlines found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {unifiedItems.map((item, index) => (
                    <AlertItem key={`${item.itemType}-${index}`} item={item} onClientClick={handleClientClick} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

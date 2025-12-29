import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { clientsApi } from '@/api/clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
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
  Calendar,
} from 'lucide-react';
import { AlertFilterDrawer } from '@/components/AlertFilterDrawer';
import { useNavigate } from 'react-router-dom';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { LoaderWithText } from '@/components/Loader';

const AlertItem = ({ item, onClientClick }) => {
  // Get type icon
  const getTypeIcon = () => {
    const type = item.type?.toLowerCase() || '';
    const category = item.category?.toLowerCase() || '';
    
    if (type.includes('license') || category.includes('license')) {
      return <Building2 className="h-3.5 w-3.5 text-gray-500" />;
    }
    if (type.includes('corporate') || category.includes('corporate')) {
      return <Receipt className="h-3.5 w-3.5 text-gray-500" />;
    }
    if (type.includes('vat') || category.includes('vat')) {
      return <FileText className="h-3.5 w-3.5 text-gray-500" />;
    }
    if (type.includes('emirates') || type.includes('passport')) {
      return <User className="h-3.5 w-3.5 text-gray-500" />;
    }
    return <FileText className="h-3.5 w-3.5 text-gray-500" />;
  };

  // Get severity icon
  const getSeverityIcon = () => {
    const severity = item.severity;
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry ?? 999;
    
    if (daysRemaining < 0) {
      return <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
    }
    if (severity === 'CRITICAL' || daysRemaining <= 7) {
      return <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
    }
    if (severity === 'HIGH' || daysRemaining <= 14) {
      return <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />;
    }
    if (severity === 'MEDIUM' || daysRemaining <= 30) {
      return <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />;
    }
    return <AlertCircle className="h-4 w-4 text-gray-600 flex-shrink-0" />;
  };

  // Get severity badge
  const getSeverityBadge = () => {
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry ?? 999;
    const isOverdue = daysRemaining < 0;
    
    if (isOverdue) {
      return <Badge variant="error" className="text-[10px] px-1.5 py-0.5">Overdue {Math.abs(daysRemaining)}d</Badge>;
    }
    
    if (item.severity === 'CRITICAL' || daysRemaining <= 7) {
      return <Badge variant="error" className="text-[10px] px-1.5 py-0.5">Critical</Badge>;
    }
    if (item.severity === 'HIGH' || daysRemaining <= 14) {
      return <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">High</Badge>;
    }
    if (item.severity === 'MEDIUM' || daysRemaining <= 30) {
      return <Badge variant="info" className="text-[10px] px-1.5 py-0.5">Medium</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Low</Badge>;
  };

  // Get display message
  const getMessage = () => {
    if (item.message) {
      return item.message;
    }
    const type = item.type?.replace(/_/g, ' ') || '';
    const category = item.category?.replace(/_/g, ' ') || '';
    return category || type || 'Deadline';
  };

  // Get date display
  const getDateDisplay = () => {
    const daysRemaining = item.daysUntilDue ?? item.daysUntilExpiry;
    
    if (daysRemaining !== undefined) {
      if (daysRemaining < 0) {
        return `${Math.abs(daysRemaining)}d overdue`;
      }
      return `${daysRemaining}d left`;
    }
    
    const dueDate = item.dueDate || item.expiryDate;
    if (dueDate) {
      return formatDateDDMMYYYY(dueDate);
    }
    
    return null;
  };

  return (
    <div
      className="flex items-center gap-2.5 p-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={() => onClientClick(item.clientId)}
    >
      {getSeverityIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {getTypeIcon()}
            <p className="text-xs font-medium text-gray-900 truncate">{getMessage()}</p>
          </div>
          {getSeverityBadge()}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-600 truncate">{item.clientName}</p>
          {getDateDisplay() && (
            <p className="text-[10px] text-gray-500 whitespace-nowrap">{getDateDisplay()}</p>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export const Alerts = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('thisMonth');
  
  // Get current and next month/year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();

  // Determine which month/year to use based on active tab
  const selectedMonth = activeTab === 'thisMonth' ? currentMonth : nextMonth;
  const selectedYear = activeTab === 'thisMonth' ? currentYear : nextYear;

  // Fetch data for both months
  const { data: currentMonthData, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['allAlerts', currentMonth, currentYear, typeFilter],
    queryFn: () => clientsApi.getAllAlerts({ 
      type: typeFilter || undefined, 
      severity: undefined,
      month: currentMonth,
      year: currentYear,
    }),
  });

  const { data: nextMonthData, isLoading: isLoadingNext } = useQuery({
    queryKey: ['allAlerts', nextMonth, nextYear, typeFilter],
    queryFn: () => clientsApi.getAllAlerts({ 
      type: typeFilter || undefined, 
      severity: undefined,
      month: nextMonth,
      year: nextYear,
    }),
  });

  // Get data based on active tab
  const data = activeTab === 'thisMonth' ? currentMonthData : nextMonthData;
  const isLoading = activeTab === 'thisMonth' ? isLoadingCurrent : isLoadingNext;

  const allAlerts = data?.data?.alerts || [];
  const allDeadlines = data?.data?.deadlines || [];

  // Merge all alerts and deadlines
  const allUnifiedItems = useMemo(() => {
    return [
      ...allAlerts.map(alert => ({ ...alert, itemType: 'alert' })),
      ...allDeadlines.map(deadline => ({ ...deadline, itemType: 'deadline' })),
    ];
  }, [allAlerts, allDeadlines]);

  // Fetch all data without type filter for counts (combine both months)
  const { data: allDataForCountsCurrent } = useQuery({
    queryKey: ['allAlerts', currentMonth, currentYear, 'all'],
    queryFn: () => clientsApi.getAllAlerts({ 
      type: undefined, 
      severity: undefined,
      month: currentMonth,
      year: currentYear,
    }),
  });

  const { data: allDataForCountsNext } = useQuery({
    queryKey: ['allAlerts', nextMonth, nextYear, 'all'],
    queryFn: () => clientsApi.getAllAlerts({ 
      type: undefined, 
      severity: undefined,
      month: nextMonth,
      year: nextYear,
    }),
  });

  const allAlertsForCounts = [
    ...(allDataForCountsCurrent?.data?.alerts || []),
    ...(allDataForCountsNext?.data?.alerts || []),
  ];
  const allDeadlinesForCounts = [
    ...(allDataForCountsCurrent?.data?.deadlines || []),
    ...(allDataForCountsNext?.data?.deadlines || []),
  ];
  
  const allItemsForCounts = useMemo(() => {
    return [
      ...allAlertsForCounts.map(alert => ({ ...alert, itemType: 'alert' })),
      ...allDeadlinesForCounts.map(deadline => ({ ...deadline, itemType: 'deadline' })),
    ];
  }, [allAlertsForCounts, allDeadlinesForCounts]);

  // Filter and sort unified items for display
  const unifiedItems = useMemo(() => {
    let filtered = allUnifiedItems;

    // Apply type filter client-side as well (in case API doesn't handle it)
    if (typeFilter) {
      filtered = filtered.filter((item) => {
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

  // Calculate counts for each filter type
  const getTypeCount = (typeValue) => {
    if (!typeValue) return allItemsForCounts.length;
    return allItemsForCounts.filter((item) => {
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

  // Get month name
  const getMonthName = (month) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1];
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alerts & Deadlines</h1>
            <p className="text-xs text-gray-600 mt-0.5">Monitor compliance alerts and deadlines</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDrawerOpen(true)}>
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-semibold rounded-full">
                1
              </span>
            )}
          </Button>
          <AlertFilterDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            filters={{ type: typeFilter }}
            onFilterChange={(newFilters) => {
              setTypeFilter(newFilters.type || '');
              setDrawerOpen(false);
            }}
            filterTypes={filterTypes}
            getTypeCount={getTypeCount}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="thisMonth" className="text-sm">
              This Month ({getMonthName(currentMonth)})
            </TabsTrigger>
            <TabsTrigger value="nextMonth" className="text-sm">
              Next Month ({getMonthName(nextMonth)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thisMonth" className="mt-3">
            {isLoading ? (
              <Card>
                <CardContent className="p-8">
                  <LoaderWithText text="Loading alerts..." />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2 px-4 pt-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Alerts & Deadlines</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {unifiedItems.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {unifiedItems.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No alerts or deadlines found</p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                      {unifiedItems.map((item, index) => (
                        <AlertItem key={`${item.itemType}-${index}`} item={item} onClientClick={handleClientClick} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nextMonth" className="mt-3">
            {isLoading ? (
              <Card>
                <CardContent className="p-8">
                  <LoaderWithText text="Loading alerts..." />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2 px-4 pt-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Alerts & Deadlines</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {unifiedItems.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {unifiedItems.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No alerts or deadlines found</p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                      {unifiedItems.map((item, index) => (
                        <AlertItem key={`${item.itemType}-${index}`} item={item} onClientClick={handleClientClick} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

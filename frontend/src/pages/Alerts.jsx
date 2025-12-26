import { useState } from 'react';
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
  Calendar,
  Filter,
  X,
  FileText,
  Building2,
  Receipt,
  User,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AlertCard = ({ alert, onClientClick }) => {
  const getIcon = () => {
    switch (alert.severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'MEDIUM':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = () => {
    switch (alert.severity) {
      case 'CRITICAL':
        return <Badge variant="error">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getTypeIcon = () => {
    if (alert.type?.includes('LICENSE') || alert.category === 'TRADE_LICENSE') {
      return <Building2 className="h-4 w-4 text-gray-500" />;
    }
    if (alert.type?.includes('TAX') || alert.category === 'CORPORATE_TAX_CERTIFICATE') {
      return <Receipt className="h-4 w-4 text-gray-500" />;
    }
    if (alert.type?.includes('VAT') || alert.category === 'VAT_CERTIFICATE') {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
    if (alert.type?.includes('EMIRATES_ID') || alert.type?.includes('PASSPORT')) {
      return <User className="h-4 w-4 text-gray-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div
      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClientClick(alert.clientId)}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getTypeIcon()}
            <p className="text-sm font-medium text-gray-900 truncate">{alert.message}</p>
          </div>
          {getSeverityBadge()}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">{alert.clientName}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {alert.dueDate && (
              <span>Due: {new Date(alert.dueDate).toLocaleDateString()}</span>
            )}
            {alert.expiryDate && (
              <span>Expires: {new Date(alert.expiryDate).toLocaleDateString()}</span>
            )}
            {alert.daysUntilExpiry !== undefined && (
              <span>
                {alert.daysUntilExpiry < 0
                  ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                  : `${alert.daysUntilExpiry} days remaining`}
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </div>
  );
};

const DeadlineCard = ({ deadline, onClientClick }) => {
  const getCategoryIcon = () => {
    if (deadline.category === 'TRADE_LICENSE') {
      return <Building2 className="h-4 w-4 text-blue-500" />;
    }
    if (deadline.category === 'CORPORATE_TAX_CERTIFICATE') {
      return <Receipt className="h-4 w-4 text-green-500" />;
    }
    if (deadline.category === 'VAT_CERTIFICATE') {
      return <FileText className="h-4 w-4 text-purple-500" />;
    }
    return <Calendar className="h-4 w-4 text-gray-500" />;
  };

  const getCategoryLabel = () => {
    if (deadline.category === 'TRADE_LICENSE') return 'Trade License';
    if (deadline.category === 'CORPORATE_TAX_CERTIFICATE') return 'Corporate Tax';
    if (deadline.category === 'VAT_CERTIFICATE') return 'VAT';
    return deadline.type?.replace(/_/g, ' ') || 'Deadline';
  };

  const isOverdue = deadline.daysUntilExpiry < 0;
  const isUrgent = deadline.daysUntilExpiry >= 0 && deadline.daysUntilExpiry <= 30;

  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClientClick(deadline.clientId)}
    >
      {getCategoryIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900">{getCategoryLabel()}</p>
          <Badge variant={isOverdue ? 'error' : isUrgent ? 'warning' : 'info'}>
            {isOverdue
              ? `Overdue ${Math.abs(deadline.daysUntilExpiry)} days`
              : `${deadline.daysUntilExpiry} days left`}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">{deadline.clientName}</p>
          <p className="text-xs text-gray-500">
            {new Date(deadline.expiryDate).toLocaleDateString()}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </div>
  );
};

export const Alerts = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['allAlerts', typeFilter, severityFilter],
    queryFn: () => clientsApi.getAllAlerts({ type: typeFilter || undefined, severity: severityFilter || undefined }),
  });

  const alerts = data?.data?.alerts || [];
  const deadlines = data?.data?.deadlines || [];

  const filterTypes = [
    { value: '', label: 'All Types' },
    { value: 'license', label: 'License' },
    { value: 'corporate', label: 'Corporate Tax' },
    { value: 'vat', label: 'VAT' },
    { value: 'emirates', label: 'Emirates ID' },
    { value: 'passport', label: 'Passport' },
  ];

  const severityTypes = [
    { value: '', label: 'All Severities' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
  ];

  const handleClientClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const clearFilters = () => {
    setTypeFilter('');
    setSeverityFilter('');
  };

  const hasActiveFilters = typeFilter || severityFilter;

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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {filterTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {severityTypes.map((severity) => (
                  <option key={severity.value} value={severity.value}>
                    {severity.label}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading alerts...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alerts Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Active Alerts ({alerts.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No alerts found</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {alerts.map((alert, index) => (
                      <AlertCard key={index} alert={alert} onClientClick={handleClientClick} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deadlines Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming Deadlines ({deadlines.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deadlines.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {deadlines.map((deadline, index) => (
                      <DeadlineCard key={index} deadline={deadline} onClientClick={handleClientClick} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};


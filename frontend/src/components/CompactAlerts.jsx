import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { useComplianceStatus } from '@/api/queries/clientQueries';

const AlertCard = ({ alert }) => {
  const getIcon = () => {
    switch (alert.severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
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

  return (
    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 transition-colors">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-xs font-medium text-gray-900 truncate">{alert.message}</p>
          {getSeverityBadge()}
        </div>
        <div className="text-xs text-gray-600 space-y-0.5">
          {alert.expiryDate && (
            <p>Expires: {new Date(alert.expiryDate).toLocaleDateString()}</p>
          )}
          {alert.dueDate && (
            <p>Due: {new Date(alert.dueDate).toLocaleDateString()}</p>
          )}
          {alert.daysUntilExpiry !== undefined && (
            <p>
              {alert.daysUntilExpiry < 0
                ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                : `${alert.daysUntilExpiry} days remaining`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const CompactAlerts = ({ clientId }) => {
  const { data: complianceData, isLoading } = useComplianceStatus(clientId);

  if (isLoading) {
    return null;
  }

  if (!complianceData?.data) {
    return null;
  }

  const compliance = complianceData.data;

  // Only show alerts, nothing else
  if (!compliance.alerts || compliance.alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Active Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {compliance.alerts.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


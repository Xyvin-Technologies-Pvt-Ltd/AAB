import { AlertCircle, CheckCircle2, Clock, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { useComplianceStatus } from '@/api/queries/clientQueries';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

const AlertCard = ({ alert }) => {
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

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50">
      {getIcon()}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-gray-900">{alert.message}</p>
          {getSeverityBadge()}
        </div>
        {alert.expiryDate && (
          <p className="text-sm text-gray-600">
            Expires: {formatDateDDMMYYYY(alert.expiryDate)}
          </p>
        )}
        {alert.dueDate && (
          <p className="text-sm text-gray-600">
            Due: {formatDateDDMMYYYY(alert.dueDate)}
          </p>
        )}
        {alert.daysUntilExpiry !== undefined && (
          <p className="text-sm text-gray-600">
            {alert.daysUntilExpiry < 0
              ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
              : `${alert.daysUntilExpiry} days remaining`}
          </p>
        )}
      </div>
    </div>
  );
};

export const ComplianceDashboard = ({ clientId }) => {
  const { data: complianceData, isLoading } = useComplianceStatus(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Loading compliance status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!complianceData?.data) {
    return null;
  }

  const compliance = complianceData.data;
  const statusColor =
    compliance.status === 'CRITICAL'
      ? 'text-red-600'
      : compliance.status === 'WARNING'
      ? 'text-orange-600'
      : 'text-green-600';

  const statusBg =
    compliance.status === 'CRITICAL'
      ? 'bg-red-100'
      : compliance.status === 'WARNING'
      ? 'bg-orange-100'
      : 'bg-green-100';

  return (
    <div className="space-y-6">
      {/* Compliance Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Compliance Status</span>
            <div className={`px-4 py-2 rounded-full ${statusBg}`}>
              <span className={`font-semibold ${statusColor}`}>{compliance.status}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900">{compliance.complianceScore}%</div>
              <div className="text-sm text-gray-600">Compliance Score</div>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    compliance.complianceScore >= 80
                      ? 'bg-green-600'
                      : compliance.complianceScore >= 50
                      ? 'bg-orange-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${compliance.complianceScore}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Documents */}
      {compliance.missingDocuments && compliance.missingDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Missing Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.missingDocuments.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-gray-700">
                    {doc.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Documents */}
      {compliance.expiringDocuments && compliance.expiringDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expiring Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.expiringDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {doc.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires: {formatDateDDMMYYYY(doc.expiryDate)}
                    </p>
                  </div>
                  <Badge variant={doc.daysUntilExpiry < 0 ? 'error' : 'warning'}>
                    {doc.daysUntilExpiry < 0
                      ? `Expired ${Math.abs(doc.daysUntilExpiry)} days ago`
                      : `${doc.daysUntilExpiry} days remaining`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unverified Data */}
      {compliance.unverifiedData && compliance.unverifiedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unverified Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.unverifiedData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">
                    {item.field.replace(/businessInfo\./g, '').replace(/([A-Z])/g, ' $1').trim()} - AI
                    Extracted
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {compliance.alerts && compliance.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compliance.alerts.map((alert, index) => (
                <AlertCard key={index} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Good */}
      {compliance.status === 'COMPLIANT' &&
        (!compliance.alerts || compliance.alerts.length === 0) &&
        (!compliance.missingDocuments || compliance.missingDocuments.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">All Compliance Requirements Met</p>
              <p className="text-sm text-gray-600 mt-2">
                All documents are verified and up to date.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
};


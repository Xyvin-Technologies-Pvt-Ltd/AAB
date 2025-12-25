import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { clientsApi } from '@/api/clients';
import { packagesApi } from '@/api/packages';
import { analyticsApi } from '@/api/analytics';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ArrowLeft, Plus, Edit, Trash2, FileText, DollarSign, TrendingUp, Clock, CheckSquare, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { StatCard } from '@/components/StatCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { FileUpload } from '@/components/FileUpload';

export const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id),
  });

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['packages', id],
    queryFn: () => packagesApi.getAll({ clientId: id, limit: 100 }),
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['client-dashboard', id],
    queryFn: () => analyticsApi.getClientDashboard(id),
  });

  const client = clientData?.data;
  const packages = packagesData?.data?.packages || [];
  const dashboard = dashboardData?.data;

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ clientId, file }) => clientsApi.uploadDocument(clientId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: 'Success', description: 'Document uploaded successfully', type: 'success' });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ clientId, documentId }) => clientsApi.deleteDocument(clientId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: 'Success', description: 'Document deleted successfully', type: 'success' });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: packagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', id] });
      setShowPackageForm(false);
      resetPackageForm();
      toast({ title: 'Success', description: 'Package created successfully', type: 'success' });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => packagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', id] });
      setShowPackageForm(false);
      setEditingPackage(null);
      resetPackageForm();
      toast({ title: 'Success', description: 'Package updated successfully', type: 'success' });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: packagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', id] });
      toast({ title: 'Success', description: 'Package deleted successfully', type: 'success' });
    },
  });

  const resetPackageForm = () => {
    setEditingPackage(null);
  };

  const handlePackageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      clientId: id,
      name: formData.get('name'),
      type: formData.get('type'),
      billingFrequency: formData.get('billingFrequency') || undefined,
      contractValue: parseFloat(formData.get('contractValue')),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || undefined,
      status: formData.get('status'),
    };

    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage._id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  const handleUploadDocument = async (file) => {
    await uploadDocumentMutation.mutateAsync({ clientId: id, file });
  };

  const handleDeleteDocument = async (documentId) => {
    await deleteDocumentMutation.mutateAsync({ clientId: id, documentId });
  };

  if (clientLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading...</div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-gray-600 mt-1">
                {client.contactPerson && `${client.contactPerson} • `}
                {client.email || client.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Client Info Card */}
        <Card>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="text-lg font-medium">{client.contactPerson || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-lg font-medium">{client.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-medium">{client.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    client.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {client.status}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Dashboard KPIs */}
        {dashboardLoading ? (
          <div className="text-center py-8">Loading dashboard data...</div>
        ) : dashboard ? (
          <div className="space-y-6">
            {/* Profitability Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Profitability Status</span>
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      dashboard.profitabilityStatus === 'UNDERPAYING'
                        ? 'bg-red-100 text-red-800'
                        : dashboard.profitabilityStatus === 'OVERPAYING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {dashboard.profitabilityStatus === 'UNDERPAYING' && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Underpaying
                      </span>
                    )}
                    {dashboard.profitabilityStatus === 'OVERPAYING' && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Overpaying
                      </span>
                    )}
                    {dashboard.profitabilityStatus === 'HEALTHY' && 'Healthy'}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`$${dashboard.kpis.totalRevenue.toLocaleString()}`}
                icon={DollarSign}
                gradient="bg-gradient-to-br from-green-500 to-green-600 text-white"
              />
              <StatCard
                title="Total Cost"
                value={`$${dashboard.kpis.totalCost.toLocaleString()}`}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-red-500 to-red-600 text-white"
              />
              <StatCard
                title="Profit Margin"
                value={`${dashboard.kpis.profitMargin.toFixed(1)}%`}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              />
              <StatCard
                title="Hours Logged"
                value={dashboard.kpis.totalHours.toFixed(1)}
                icon={Clock}
                gradient="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
              />
            </div>

            {/* Package Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Package Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.packageBreakdown.map((pkg) => (
                    <div key={pkg.packageId} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{pkg.packageName}</h4>
                        <span className="text-sm text-gray-500">{pkg.type}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Revenue:</span>
                          <span className="ml-2 font-medium">${pkg.revenue.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <span className="ml-2 font-medium">${pkg.cost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Profit:</span>
                          <span
                            className={`ml-2 font-medium ${
                              pkg.profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            ${pkg.profit.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Hours:</span>
                          <span className="ml-2 font-medium">{pkg.hoursLogged.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tasks Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckSquare className="h-5 w-5 mr-2" />
                  Tasks Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Open Tasks</p>
                    <p className="text-2xl font-bold">{dashboard.kpis.openTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{dashboard.kpis.completedTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-2xl font-bold">{dashboard.kpis.completionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Packages Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Packages</h2>
            <Button onClick={() => setShowPackageForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </div>

          {packagesLoading ? (
            <div className="text-center py-8">Loading packages...</div>
          ) : packages.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <p className="text-gray-500">No packages found</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg._id}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">{pkg.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPackage(pkg);
                            setShowPackageForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this package?')) {
                              deletePackageMutation.mutate(pkg._id);
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Type: </span>
                        <span className="font-medium">{pkg.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Value: </span>
                        <span className="font-medium">${pkg.contractValue?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status: </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            pkg.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <Card>
            <div className="p-6">
              <FileUpload
                onUpload={handleUploadDocument}
                onDelete={handleDeleteDocument}
                existingFiles={client.documents || []}
              />
            </div>
          </Card>
        </div>

        {/* Package Form Dialog */}
        <Dialog open={showPackageForm} onOpenChange={setShowPackageForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Package' : 'Add New Package'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? 'Update package information below.'
                  : 'Fill in the details to create a new package for this client.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePackageSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Package Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={editingPackage?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium text-gray-700">
                    Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    required
                    defaultValue={editingPackage?.type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="RECURRING">Recurring</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="billingFrequency" className="text-sm font-medium text-gray-700">
                    Billing Frequency
                  </label>
                  <select
                    id="billingFrequency"
                    name="billingFrequency"
                    defaultValue={editingPackage?.billingFrequency}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="contractValue" className="text-sm font-medium text-gray-700">
                  Contract Value *
                </label>
                <input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingPackage?.contractValue}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    defaultValue={
                      editingPackage?.startDate
                        ? new Date(editingPackage.startDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={
                      editingPackage?.endDate
                        ? new Date(editingPackage.endDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editingPackage?.status || 'ACTIVE'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageForm(false);
                    resetPackageForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                >
                  {createPackageMutation.isPending || updatePackageMutation.isPending
                    ? 'Saving...'
                    : editingPackage
                    ? 'Update'
                    : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};


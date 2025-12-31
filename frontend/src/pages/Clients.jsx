import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { clientsApi } from '@/api/clients';
import { packagesApi } from '@/api/packages';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Card } from '@/ui/card';
import { Plus, Search, Edit, Trash2, Eye, FileText, Upload, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu';
import { ClientBulkUpload } from '@/components/ClientBulkUpload';
import { ClientFilterDrawer } from '@/components/ClientFilterDrawer';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { LoaderWithText } from '@/components/Loader';
import { Avatar } from '@/components/Avatar';

export const Clients = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    vatMonths: [],
    packageId: '',
    status: '',
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch all clients for client-side filtering and pagination
  // Apply server-side filters (status, packageId, vatMonths) but fetch all matching records
  const { data: allClientsData, isLoading } = useQuery({
    queryKey: ['clients', 'all', filters.status, filters.packageId, filters.vatMonths?.join(',')],
    queryFn: () => {
      const params = {
        limit: 10000, // Fetch all clients matching the server-side filters
        status: filters.status || undefined,
        packageId: filters.packageId || undefined,
      };
      
      // Handle vatMonths array - send as comma-separated string or multiple params
      if (filters.vatMonths && filters.vatMonths.length > 0) {
        params.vatMonths = filters.vatMonths.join(',');
      }
      
      return clientsApi.getAll(params);
    },
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll({ limit: 1000 }),
  });

  // Group packages by client ID
  const packagesByClient = {};
  const packages = packagesData?.data?.packages || [];
  packages.forEach((pkg) => {
    const clientId = typeof pkg.clientId === 'object' ? pkg.clientId._id : pkg.clientId;
    if (clientId) {
      if (!packagesByClient[clientId]) {
        packagesByClient[clientId] = [];
      }
      packagesByClient[clientId].push(pkg);
    }
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      resetForm();
      toast({ title: 'Success', description: 'Client created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create client',
        type: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setEditingClient(null);
      resetForm();
      toast({ title: 'Success', description: 'Client updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update client',
        type: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Success', description: 'Client deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete client',
        type: 'destructive',
      });
    },
  });


  const resetForm = () => {
    setEditingClient(null);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this client?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      contactPerson: formData.get('contactPerson'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      status: formData.get('status'),
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 30) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function to format VAT cycle months
  const formatVATCycle = (client) => {
    if (!client.businessInfo?.vatTaxPeriods || client.businessInfo.vatTaxPeriods.length === 0) {
      return '-';
    }
    
    const months = [];
    client.businessInfo.vatTaxPeriods.forEach((period) => {
      const startDate = new Date(period.startDate);
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      if (!months.includes(monthName)) {
        months.push(monthName);
      }
    });
    
    return months.join(', ') || '-';
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />;
  };

  // Get all clients from the query
  let allClients = allClientsData?.data?.clients || [];

  // Apply client-side search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    allClients = allClients.filter((client) => {
      return (
        client.name?.toLowerCase().includes(searchLower) ||
        client.contactPerson?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower)
      );
    });
  }

  // Apply sorting
  if (sortField) {
    allClients = [...allClients].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'contactPerson':
          aValue = (a.contactPerson || '').toLowerCase();
          bValue = (b.contactPerson || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'phone':
          aValue = (a.phone || '').toLowerCase();
          bValue = (b.phone || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'vatCycle':
          aValue = formatVATCycle(a);
          bValue = formatVATCycle(b);
          break;
        case 'documents':
          aValue = a.documents?.length || 0;
          bValue = b.documents?.length || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Apply client-side pagination
  const total = allClients.length;
  const skip = (page - 1) * limit;
  const clients = allClients.slice(skip, skip + limit);
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setSearch(newFilters.search || '');
    setPage(1); // Reset to first page when filters change
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clients</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage your client relationships</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowBulkUpload(true)}
              size="sm"
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Bulk Upload
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card>
          <div className="p-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => {
                    const newSearch = e.target.value;
                    setSearch(newSearch);
                    setFilters({ ...filters, search: newSearch });
                    setPage(1); // Reset to first page when search changes
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterDrawer(true)}
                className="border-gray-300"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <Card>
            <div className="p-12">
              <LoaderWithText text="Loading clients..." />
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('contactPerson')}
                    >
                      <div className="flex items-center">
                        Contact Person
                        {getSortIcon('contactPerson')}
                      </div>
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        {getSortIcon('email')}
                      </div>
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('phone')}
                    >
                      <div className="flex items-center">
                        Phone
                        {getSortIcon('phone')}
                      </div>
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('vatCycle')}
                    >
                      <div className="flex items-center">
                        VAT Cycle
                        {getSortIcon('vatCycle')}
                      </div>
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('documents')}
                    >
                      <div className="flex items-center">
                        Documents
                        {getSortIcon('documents')}
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Packages
                    </th>
                    <th 
                      className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-2 py-8 text-center">
                        <p className="text-xs text-gray-500">No clients found</p>
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => {
                      const clientPackages = packagesByClient[client._id] || [];
                      return (
                        <tr
                          key={client._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-2 py-1.5">
                            <Avatar
                              name={client.name}
                              size="sm"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div 
                              className="text-xs font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                              onClick={() => navigate(`/clients/${client._id}`)}
                              title={client.name}
                            >
                              {truncateText(client.name, 25)}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div 
                              className="text-xs text-gray-600"
                              title={client.contactPerson || ''}
                            >
                              {truncateText(client.contactPerson, 20)}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div 
                              className="text-xs text-gray-600"
                              title={client.email || ''}
                            >
                              {truncateText(client.email, 25)}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div 
                              className="text-xs text-gray-600"
                              title={client.phone || ''}
                            >
                              {truncateText(client.phone, 15)}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div 
                              className="text-xs text-gray-600"
                              title={formatVATCycle(client)}
                            >
                              {truncateText(formatVATCycle(client), 20)}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{client.documents?.length || 0}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {clientPackages.length === 0 ? (
                                <span className="text-xs text-gray-400">-</span>
                              ) : (
                                clientPackages.slice(0, 2).map((pkg) => (
                                  <Badge
                                    key={pkg._id}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0.5"
                                    title={pkg.name}
                                  >
                                    {truncateText(pkg.name, 10)}
                                  </Badge>
                                ))
                              )}
                              {clientPackages.length > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                  +{clientPackages.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                client.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {client.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/clients/${client._id}`);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(client);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(client._id);
                                  }}
                                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} clients
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="h-7 px-2 text-xs"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
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
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={pagination.page === pagination.pages}
                    className="h-7 px-2 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>
                {editingClient
                  ? 'Update client information below.'
                  : 'Fill in the details to create a new client.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={editingClient?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">
                  Contact Person
                </label>
                <input
                  id="contactPerson"
                  name="contactPerson"
                  type="text"
                  defaultValue={editingClient?.contactPerson}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingClient?.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={editingClient?.phone}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editingClient?.status || 'ACTIVE'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingClient
                    ? 'Update'
                    : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <ClientBulkUpload open={showBulkUpload} onOpenChange={setShowBulkUpload} />

        {/* Filter Drawer */}
        <ClientFilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          filters={filters}
          onFilterChange={handleFilterChange}
          packages={packages}
        />
      </div>
    </AppLayout>
  );
};

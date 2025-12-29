import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { servicesApi } from '@/api/services';
import { activitiesApi } from '@/api/activities';
import { Button } from '@/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Card } from '@/ui/card';
import { Edit, Trash2, Search } from 'lucide-react';
import { LoaderWithText } from '@/components/Loader';

const ServicesTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowForm(false);
      setEditingService(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: servicesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const resetForm = () => {
    setEditingService(null);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this service?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const services = servicesData?.data?.services || [];
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Services</h2>
        <Button onClick={() => setShowForm(true)} size="sm">Add Service</Button>
      </div>

      {/* Search Bar */}
      <div className="mb-2 relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {showForm && (
        <Card className="mb-3 p-4">
          <h3 className="text-base font-semibold mb-3">
            {editingService ? 'Edit Service' : 'Add Service'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={editingService?.name}
                className="w-full px-3 py-1.5 text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-8">
          <LoaderWithText text="Loading activities..." />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service._id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(service)}
                          title="Edit service"
                          className="h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service._id)}
                          title="Delete service"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-2 py-3 text-center text-xs text-gray-500">
                      {search
                        ? `No services found matching "${search}".`
                        : 'No services found. Add your first service to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const ActivitiesTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => activitiesApi.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => activitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowForm(false);
      setEditingActivity(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: activitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const resetForm = () => {
    setEditingActivity(null);
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
    };

    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activities = activitiesData?.data?.activities || [];
  const filteredActivities = activities.filter((activity) =>
    activity.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Activities</h2>
        <Button onClick={() => setShowForm(true)} size="sm">Add Activity</Button>
      </div>

      {/* Search Bar */}
      <div className="mb-2 relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {showForm && (
        <Card className="mb-3 p-4">
          <h3 className="text-base font-semibold mb-3">
            {editingActivity ? 'Edit Activity' : 'Add Activity'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={editingActivity?.name}
                className="w-full px-3 py-1.5 text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-8">
          <LoaderWithText text="Loading activities..." />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities.map((activity) => (
                  <tr key={activity._id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                      {activity.name}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(activity)}
                          title="Edit activity"
                          className="h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(activity._id)}
                          title="Delete activity"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-2 py-3 text-center text-xs text-gray-500">
                      {search
                        ? `No activities found matching "${search}".`
                        : 'No activities found. Add your first activity to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export const Settings = () => {
  return (
    <AppLayout>
      <div className="px-4 py-4 sm:px-0">
        <h1 className="text-xl font-bold mb-4">Settings</h1>
        <Tabs defaultValue="services" className="w-full">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>
          <TabsContent value="services" className="mt-3">
            <ServicesTab />
          </TabsContent>
          <TabsContent value="activities" className="mt-3">
            <ActivitiesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};


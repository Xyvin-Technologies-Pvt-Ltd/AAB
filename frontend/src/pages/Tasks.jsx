import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { tasksApi } from "@/api/tasks";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { employeesApi } from "@/api/employees";
import { servicesApi } from "@/api/services";
import { activitiesApi } from "@/api/activities";
import { Button } from "@/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { Avatar } from "@/components/Avatar";
import { SelectSearch } from "@/ui/select-search";
import { MultiSelect } from "@/ui/multi-select";
import { FileUpload } from "@/components/FileUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/ui/drawer";
import {
  Plus,
  Search,
  LayoutGrid,
  Table2,
  ArrowUpDown,
  Filter,
  X,
  User,
  Calendar,
  Building2,
  Package,
  Briefcase,
  Activity,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { format } from "date-fns";

export const Tasks = () => {
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' or 'table'
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => tasksApi.getAll({ ...filters, limit: 1000 }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ["packages", filters.clientId || selectedClientId || editingTask?.clientId?._id || editingTask?.clientId],
    queryFn: () =>
      packagesApi.getAll({
        clientId: filters.clientId || selectedClientId || editingTask?.clientId?._id || editingTask?.clientId,
        limit: 100,
      }),
    enabled: !!(filters.clientId || selectedClientId || editingTask?.clientId?._id || editingTask?.clientId),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.getAll({ limit: 100 }),
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => activitiesApi.getAll({ limit: 100 }),
  });

  // Extract data from queries
  const tasks = tasksData?.data?.tasks || [];
  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const employees = employeesData?.data?.employees || [];

  // Get selected package to filter services and activities
  const selectedPackage = packages.find((pkg) => pkg._id === selectedPackageId);
  const packageServiceIds = selectedPackage?.services?.map((s) => (typeof s === 'object' ? s._id : s)) || [];
  const packageActivityIds = selectedPackage?.activities?.map((a) => (typeof a === 'object' ? a._id : a)) || [];

  // Filter services and activities based on selected package
  const availableServices = servicesData?.data?.services || [];
  const availableActivities = activitiesData?.data?.activities || [];
  const filteredServices = selectedPackageId
    ? availableServices.filter((s) => packageServiceIds.includes(s._id))
    : availableServices;
  const filteredActivities = selectedPackageId
    ? availableActivities.filter((a) => packageActivityIds.includes(a._id))
    : availableActivities;

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Success",
        description: "Task created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create task",
        type: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setEditingTask(null);
      resetForm();
      toast({
        title: "Success",
        description: "Task updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update task",
        type: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete task",
        type: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, order }) => tasksApi.updateOrder(id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const resetForm = () => {
    setEditingTask(null);
    setSelectedClientId("");
    setSelectedPackageId("");
    setSelectedEmployees([]);
    setSelectedServices([]);
    setSelectedActivities([]);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setSelectedClientId(task.clientId?._id || task.clientId || "");
    setSelectedPackageId(task.packageId?._id || task.packageId || "");
    // Handle both single employee (old format) and array (new format)
    const assignedEmployees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map((emp) => emp._id || emp)
      : task.assignedTo
      ? [task.assignedTo._id || task.assignedTo]
      : [];
    setSelectedEmployees(assignedEmployees);
    // Handle services and activities
    const serviceIds = task.services?.map((s) => (typeof s === 'object' ? s._id : s)) || [];
    const activityIds = task.activities?.map((a) => (typeof a === 'object' ? a._id : a)) || [];
    setSelectedServices(serviceIds);
    setSelectedActivities(activityIds);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTaskMove = async (taskId, updates) => {
    if (updates.status) {
      await updateMutation.mutateAsync({ id: taskId, data: updates });
    } else if (updates.order !== undefined) {
      await updateOrderMutation.mutateAsync({
        id: taskId,
        order: updates.order,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      clientId: selectedClientId,
      packageId: selectedPackageId,
      name: formData.get("name"),
      description: formData.get("description"),
      status: "TODO", // Default status for new tasks
      assignedTo: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      priority: formData.get("priority") || "MEDIUM",
      dueDate: formData.get("dueDate") || undefined,
      services: selectedServices.length > 0 ? selectedServices : undefined,
      activities: selectedActivities.length > 0 ? selectedActivities : undefined,
    };

    if (editingTask) {
      // Include status for updates
      data.status = editingTask.status || "TODO";
      updateMutation.mutate({ id: editingTask._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (file) => {
    // For new tasks, files will be uploaded after task creation
    // For existing tasks, upload immediately
    if (editingTask) {
      try {
        await tasksApi.addAttachment(editingTask._id, file);
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast({
          title: "Success",
          description: "File uploaded successfully",
          type: "success",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to upload file",
          type: "destructive",
        });
      }
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!editingTask) return;
    try {
      await tasksApi.deleteAttachment(editingTask._id, fileId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
        type: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete file",
        type: "destructive",
      });
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle nested properties
    if (sortConfig.key === "dueDate") {
      aValue = a.dueDate ? new Date(a.dueDate) : new Date(0);
      bValue = b.dueDate ? new Date(b.dueDate) : new Date(0);
    } else if (sortConfig.key === "assignedTo") {
      // For sorting, use first assigned employee name
      const aAssigned = Array.isArray(a.assignedTo)
        ? a.assignedTo[0]?.name || a.assignedTo[0]?.email || ""
        : a.assignedTo?.name || a.assignedTo?.email || "";
      const bAssigned = Array.isArray(b.assignedTo)
        ? b.assignedTo[0]?.name || b.assignedTo[0]?.email || ""
        : b.assignedTo?.name || b.assignedTo?.email || "";
      aValue = aAssigned;
      bValue = bAssigned;
    } else if (sortConfig.key === "clientId") {
      aValue = a.clientId?.name || "";
      bValue = b.clientId?.name || "";
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleTaskClick = async (task) => {
    // Fetch full task details with comments and attachments
    try {
      const response = await tasksApi.getById(task._id);
      setSelectedTask(response.data);
    } catch {
      // Fallback to task from list
      setSelectedTask(task);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">
              Manage and track your project tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Kanban
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowFilters(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {Object.keys(filters).some((key) => {
                if (key === "priority") return filters[key]?.length > 0;
                return filters[key];
              }) && (
                <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                  {
                    Object.keys(filters).filter((key) => {
                      if (key === "priority") return filters[key]?.length > 0;
                      return filters[key];
                    }).length
                  }
                </span>
              )}
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(filters.search ||
          filters.clientId ||
          filters.packageId ||
          filters.assignedTo ||
          filters.priority?.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.search && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                <span>Search: {filters.search}</span>
                <button
                  onClick={() => {
                    const newFilters = { ...filters, search: "" };
                    setFilters(newFilters);
                  }}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.clientId && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                <span>
                  Client:{" "}
                  {clients.find((c) => c._id === filters.clientId)?.name ||
                    filters.clientId}
                </span>
                <button
                  onClick={() => {
                    const newFilters = {
                      ...filters,
                      clientId: "",
                      packageId: "",
                    };
                    setFilters(newFilters);
                  }}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.packageId && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                <span>
                  Package:{" "}
                  {(packagesData?.data?.packages || []).find(
                    (p) => p._id === filters.packageId
                  )?.name || filters.packageId}
                </span>
                <button
                  onClick={() => {
                    const newFilters = { ...filters, packageId: "" };
                    setFilters(newFilters);
                  }}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.assignedTo && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                <span>
                  Assignee:{" "}
                  {employees.find((e) => e._id === filters.assignedTo)?.name ||
                    filters.assignedTo}
                </span>
                <button
                  onClick={() => {
                    const newFilters = { ...filters, assignedTo: "" };
                    setFilters(newFilters);
                  }}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.priority?.length > 0 &&
              filters.priority.map((priority) => (
                <div
                  key={priority}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                >
                  <span>Priority: {priority}</span>
                  <button
                    onClick={() => {
                      const newFilters = {
                        ...filters,
                        priority: filters.priority.filter(
                          (p) => p !== priority
                        ),
                      };
                      setFilters(newFilters);
                    }}
                    className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({})}
              className="text-sm"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* View Content */}
        {isLoading ? (
          <div className="text-center py-12">Loading tasks...</div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            tasks={tasks}
            onTaskMove={handleTaskMove}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Task Name
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("clientId")}
                  >
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Client
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("assignedTo")}
                  >
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Assignee
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      Services
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Activities
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due Date
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-3 py-8 text-center text-xs text-gray-500"
                    >
                      No tasks found
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const priorityColors = {
                      URGENT: "bg-red-100 text-red-800",
                      HIGH: "bg-orange-100 text-orange-800",
                      MEDIUM: "bg-yellow-100 text-yellow-800",
                      LOW: "bg-gray-100 text-gray-800",
                    };
                    const statusColors = {
                      TODO: "bg-gray-100 text-gray-800",
                      IN_PROGRESS: "bg-blue-100 text-blue-800",
                      DONE: "bg-green-100 text-green-800",
                    };
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE";

                    return (
                      <tr
                        key={task._id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[200px]">
                            {task.name}
                          </div>
                          {task.description && (
                            <div className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{task.clientId?.name || "-"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            {task.assignedTo && Array.isArray(task.assignedTo) ? (
                              task.assignedTo.length > 0 ? (
                                <>
                                  <Avatar
                                    src={task.assignedTo[0]?.profilePicture?.url}
                                    name={task.assignedTo[0]?.name || task.assignedTo[0]?.email || ''}
                                    size="xs"
                                  />
                                  <span className="truncate max-w-[100px]">
                                    {task.assignedTo[0]?.name || task.assignedTo[0]?.email || task.assignedTo[0]}
                                    {task.assignedTo.length > 1 && ` +${task.assignedTo.length - 1}`}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-gray-400">-</span>
                                </>
                              )
                            ) : task.assignedTo ? (
                              <>
                                <Avatar
                                  src={task.assignedTo.profilePicture?.url}
                                  name={task.assignedTo.name || task.assignedTo.email || ''}
                                  size="xs"
                                />
                                <span className="truncate max-w-[100px]">
                                  {task.assignedTo.name || task.assignedTo.email || task.assignedTo}
                                </span>
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-400">-</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {task.services && task.services.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5">
                              {task.services.slice(0, 1).map((service, idx) => (
                                <span
                                  key={service._id || service || idx}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]"
                                >
                                  <Briefcase className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[80px]">{service.name || service}</span>
                                </span>
                              ))}
                              {task.services.length > 1 && (
                                <span className="text-[10px] text-gray-500 px-1">
                                  +{task.services.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {task.activities && task.activities.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5">
                              {task.activities.slice(0, 1).map((activity, idx) => (
                                <span
                                  key={activity._id || activity || idx}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]"
                                >
                                  <Activity className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[80px]">{activity.name || activity}</span>
                                </span>
                              ))}
                              {task.activities.length > 1 && (
                                <span className="text-[10px] text-gray-500 px-1">
                                  +{task.activities.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 inline-flex text-[10px] font-semibold rounded-full ${
                              priorityColors[task.priority] ||
                              priorityColors.MEDIUM
                            }`}
                          >
                            {task.priority || "MEDIUM"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 inline-flex text-[10px] font-semibold rounded-full ${
                              statusColors[task.status] || statusColors.TODO
                            }`}
                          >
                            {task.status?.replace("_", " ") || "TODO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className={`h-3 w-3 flex-shrink-0 ${
                              isOverdue ? "text-red-500" : "text-gray-400"
                            }`} />
                            {task.dueDate ? (
                              <span
                                className={
                                  isOverdue ? "text-red-600 font-semibold" : "text-gray-600"
                                }
                              >
                                {format(new Date(task.dueDate), "MMM dd")}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {isOverdue && <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(task)}
                              className="h-6 w-6 p-0"
                              title="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(task._id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Task Detail Drawer */}
        <TaskDetailDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />

        {/* Filter Drawer */}
        <Drawer open={showFilters} onOpenChange={setShowFilters}>
          <DrawerContent side="right" className="sm:max-w-sm">
            <DrawerHeader className="px-4 pt-4 pb-3 border-b border-gray-200">
              <DrawerTitle className="text-base font-semibold">Filter Tasks</DrawerTitle>
              <DrawerDescription className="text-xs text-gray-500 mt-1">
                Refine your task list with filters
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-4 overflow-y-auto flex-1">
              <AdvancedFilters
                clients={clients}
                packages={packagesData?.data?.packages || []}
                employees={employees}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                }}
                initialFilters={filters}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Task Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription>
                {editingTask
                  ? "Update task information below."
                  : "Fill in the details to create a new task."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Project Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="clientId"
                      className="text-sm font-medium text-gray-700"
                    >
                      Client *
                    </label>
                    <SelectSearch
                      options={clients}
                      value={selectedClientId}
                      onChange={(value) => {
                        setSelectedClientId(value);
                        setSelectedPackageId(""); // Reset package when client changes
                        setSelectedServices([]);
                        setSelectedActivities([]);
                      }}
                      placeholder="Search and select client..."
                      searchPlaceholder="Search clients..."
                      emptyMessage="No clients found"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="packageId"
                      className="text-sm font-medium text-gray-700"
                    >
                      Package *
                    </label>
                    <SelectSearch
                      options={packages}
                      value={selectedPackageId}
                      onChange={(value) => {
                        setSelectedPackageId(value);
                        // Reset services and activities when package changes
                        setSelectedServices([]);
                        setSelectedActivities([]);
                      }}
                      placeholder="Search and select package..."
                      searchPlaceholder="Search packages..."
                      emptyMessage="No packages found"
                      disabled={!selectedClientId && !editingTask}
                    />
                  </div>
                </div>
              </div>

              {/* Task Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Task Information
                </h3>
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Task Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={editingTask?.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    defaultValue={editingTask?.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Services
                    </label>
                    <MultiSelect
                      options={filteredServices}
                      selected={selectedServices}
                      onChange={setSelectedServices}
                      placeholder="Select services..."
                      searchPlaceholder="Search services..."
                      emptyMessage="No services found"
                      disabled={!selectedPackageId && !editingTask}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Activities
                    </label>
                    <MultiSelect
                      options={filteredActivities}
                      selected={selectedActivities}
                      onChange={setSelectedActivities}
                      placeholder="Select activities..."
                      searchPlaceholder="Search activities..."
                      emptyMessage="No activities found"
                      disabled={!selectedPackageId && !editingTask}
                    />
                  </div>
                </div>
                {editingTask && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Attachments
                    </label>
                    <FileUpload
                      onUpload={handleFileUpload}
                      onDelete={handleFileDelete}
                      existingFiles={editingTask.attachments || []}
                      maxFiles={10}
                    />
                  </div>
                )}
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Assignees
                    </label>
                    <MultiSelect
                      options={employees}
                      selected={selectedEmployees}
                      onChange={setSelectedEmployees}
                      placeholder="Select employees..."
                      searchPlaceholder="Search employees..."
                      emptyMessage="No employees found"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="priority"
                      className="text-sm font-medium text-gray-700"
                    >
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      defaultValue={editingTask?.priority || "MEDIUM"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="dueDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={
                      editingTask?.dueDate
                        ? new Date(editingTask.dueDate)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingTask
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

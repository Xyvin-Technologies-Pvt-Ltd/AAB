import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { tasksApi } from "@/api/tasks";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { employeesApi } from "@/api/employees";
import { Button } from "@/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
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
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { format } from "date-fns";

export const Tasks = () => {
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
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
    queryKey: ["packages", filters.clientId || selectedClientId],
    queryFn: () =>
      packagesApi.getAll({
        clientId: filters.clientId || selectedClientId,
        limit: 100,
      }),
    enabled: !!(filters.clientId || selectedClientId),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
  });

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
    setSelectedEmployees([]);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setSelectedClientId(task.clientId?._id || task.clientId || "");
    // Handle both single employee (old format) and array (new format)
    const assignedEmployees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map((emp) => emp._id || emp)
      : task.assignedTo
      ? [task.assignedTo._id || task.assignedTo]
      : [];
    setSelectedEmployees(assignedEmployees);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      clientId: formData.get("clientId"),
      packageId: formData.get("packageId"),
      name: formData.get("name"),
      description: formData.get("description"),
      category: formData.get("category"),
      status: formData.get("status") || "TODO",
      assignedTo: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      priority: formData.get("priority") || "MEDIUM",
      dueDate: formData.get("dueDate") || undefined,
      estimatedMinutes: formData.get("estimatedMinutes")
        ? parseInt(formData.get("estimatedMinutes"))
        : undefined,
      labels: editingTask?.labels || [],
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const tasks = tasksData?.data?.tasks || [];
  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const employees = employeesData?.data?.employees || [];

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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Task Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("clientId")}
                  >
                    <div className="flex items-center gap-1">
                      Client
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("assignedTo")}
                  >
                    <div className="flex items-center gap-1">
                      Assignee
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1">
                      Due Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-12 text-center text-gray-500"
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.name}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.clientId?.name || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {task.assignedTo && Array.isArray(task.assignedTo) ? (
                            task.assignedTo.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {task.assignedTo.map((emp, idx) => (
                                  <span
                                    key={emp._id || emp || idx}
                                    className="inline-block"
                                  >
                                    {emp.name || emp.email || emp}
                                    {idx < task.assignedTo.length - 1 && ","}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "Unassigned"
                            )
                          ) : task.assignedTo ? (
                            task.assignedTo.name ||
                            task.assignedTo.email ||
                            task.assignedTo
                          ) : (
                            "Unassigned"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              priorityColors[task.priority] ||
                              priorityColors.MEDIUM
                            }`}
                          >
                            {task.priority || "MEDIUM"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              statusColors[task.status] || statusColors.TODO
                            }`}
                          >
                            {task.status?.replace("_", " ") || "TODO"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.dueDate ? (
                            <span
                              className={
                                isOverdue ? "text-red-600 font-semibold" : ""
                              }
                            >
                              {format(new Date(task.dueDate), "MMM dd, yyyy")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(task._id)}
                              className="text-red-600"
                            >
                              Delete
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
          <DrawerContent side="right" className="sm:max-w-md">
            <DrawerHeader>
              <DrawerTitle>Filter Tasks</DrawerTitle>
              <DrawerDescription>
                Filter tasks by client, package, assignee, priority, and more.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 pb-6 overflow-y-auto">
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
                    <select
                      id="clientId"
                      name="clientId"
                      required
                      value={
                        selectedClientId ||
                        editingTask?.clientId?._id ||
                        editingTask?.clientId ||
                        ""
                      }
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="packageId"
                      className="text-sm font-medium text-gray-700"
                    >
                      Package *
                    </label>
                    <select
                      id="packageId"
                      name="packageId"
                      required
                      defaultValue={
                        editingTask?.packageId?._id || editingTask?.packageId
                      }
                      disabled={!selectedClientId && !editingTask}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Package</option>
                      {packages.map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
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
                <div className="space-y-2">
                  <label
                    htmlFor="category"
                    className="text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    defaultValue={editingTask?.category}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-gray-700">
                      Assignees
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                      {employees.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No employees available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {employees.map((employee) => (
                            <label
                              key={employee._id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedEmployees.includes(
                                  employee._id
                                )}
                                onChange={() =>
                                  handleEmployeeToggle(employee._id)
                                }
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">
                                {employee.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedEmployees.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {selectedEmployees.length} employee
                        {selectedEmployees.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="estimatedMinutes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Estimated Time (minutes)
                    </label>
                    <input
                      id="estimatedMinutes"
                      name="estimatedMinutes"
                      type="number"
                      min="0"
                      defaultValue={editingTask?.estimatedMinutes || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="status"
                      className="text-sm font-medium text-gray-700"
                    >
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      defaultValue={editingTask?.status || "TODO"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
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

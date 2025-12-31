import { useState, useRef, useEffect } from "react";
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
import { TaskFilterDrawer } from "@/components/TaskFilterDrawer";
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
  MoreVertical,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTimer } from "@/hooks/useTimer";
import { format } from "date-fns";
import { Play, Pause, Check } from "lucide-react";
import { LoaderWithText } from "@/components/Loader";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

export const Tasks = () => {
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [copiedTaskData, setCopiedTaskData] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [pendingClientId, setPendingClientId] = useState(null);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' or 'table'
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [packageType, setPackageType] = useState("RECURRING");
  const [packageSelectedServices, setPackageSelectedServices] = useState([]);
  const [packageSelectedActivities, setPackageSelectedActivities] = useState(
    []
  );
  const [templatePackageId, setTemplatePackageId] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("");
  const [showAddServiceDropdown, setShowAddServiceDropdown] = useState(false);
  const [showAddActivityDropdown, setShowAddActivityDropdown] = useState(false);
  const [tempServiceSelection, setTempServiceSelection] = useState("");
  const [tempActivitySelection, setTempActivitySelection] = useState("");
  const [taskViewFilter, setTaskViewFilter] = useState("myTasks"); // 'myTasks' or 'allTasks'
  const packageFormRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuthStore();

  // Use centralized timer hook
  const {
    runningTimer,
    isRunning,
    isPaused,
    handleStartTimerForTask,
    handlePauseTimer,
    handleResumeTimer,
    handleCompleteTimer,
    startTimerForTaskMutation,
    pauseTimerMutation,
    resumeTimerMutation,
    stopTimerMutation,
  } = useTimer();

  // Build effective filters - include assignedTo for non-admin users by default
  const effectiveFilters = { ...filters };

  // For non-admin users, filter by assigned tasks by default unless viewing all tasks
  if (!isAdmin() && user?.employeeId) {
    if (taskViewFilter === "myTasks") {
      // Show only assigned tasks
      const employeeIdStr =
        user.employeeId?._id?.toString() ||
        user.employeeId?.toString() ||
        user.employeeId;
      effectiveFilters.assignedTo = employeeIdStr;
    } else if (taskViewFilter === "allTasks") {
      // Show all tasks - remove assignedTo filter
      delete effectiveFilters.assignedTo;
    }
  }

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", effectiveFilters],
    queryFn: () => tasksApi.getAll({ ...effectiveFilters, limit: 1000 }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: [
      "packages",
      filters.clientId ||
        selectedClientId ||
        editingTask?.clientId?._id ||
        editingTask?.clientId,
    ],
    queryFn: () =>
      packagesApi.getAll({
        clientId:
          filters.clientId ||
          selectedClientId ||
          editingTask?.clientId?._id ||
          editingTask?.clientId,
        limit: 10000,
      }),
    enabled: !!(
      filters.clientId ||
      selectedClientId ||
      editingTask?.clientId?._id ||
      editingTask?.clientId
    ),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 10000 }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.getAll({ limit: 10000 }),
    enabled: true,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => activitiesApi.getAll({ limit: 10000 }),
    enabled: true,
  });

  // Fetch all packages for template dropdown
  const { data: allPackagesData } = useQuery({
    queryKey: ["packages", "all"],
    queryFn: () => packagesApi.getAll({ limit: 1000 }),
  });

  // Filter packages by type for template selection
  const allPackages = allPackagesData?.data?.packages || [];
  const filteredTemplatePackages = allPackages.filter((pkg) => {
    if (!packageTypeFilter) return true;
    return pkg.type === packageTypeFilter;
  });

  // Format packages for SelectSearch (include client name in display)
  const formattedTemplatePackages = filteredTemplatePackages.map((pkg) => ({
    _id: pkg._id,
    name: `${pkg.name}${pkg.clientId?.name ? ` (${pkg.clientId.name})` : ""}`,
  }));

  // Extract data from queries
  const tasks = tasksData?.data?.tasks || [];
  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const employees = employeesData?.data?.employees || [];

  // Get selected package to filter services and activities
  const selectedPackage = packages.find((pkg) => pkg._id === selectedPackageId);
  const packageServiceIds =
    selectedPackage?.services?.map((s) =>
      typeof s === "object" ? s._id : s
    ) || [];
  const packageActivityIds =
    selectedPackage?.activities?.map((a) =>
      typeof a === "object" ? a._id : a
    ) || [];

  // Filter services and activities based on selected package
  // Use same pattern as ClientDetails.jsx which works correctly
  const availableServices =
    servicesData?.data?.services || servicesData?.data || [];
  const availableActivities =
    activitiesData?.data?.activities || activitiesData?.data || [];

  // Debug: Log services data to help diagnose the issue
  useEffect(() => {
    if (showPackageForm) {
      console.log("Package Form Open - Services Data:", {
        servicesData,
        availableServices,
        servicesDataStructure: servicesData?.data,
        servicesCount: availableServices.length,
      });
      console.log("Package Form Open - Activities Data:", {
        activitiesData,
        availableActivities,
        activitiesDataStructure: activitiesData?.data,
        activitiesCount: availableActivities.length,
      });
    }
  }, [
    showPackageForm,
    servicesData,
    activitiesData,
    availableServices,
    availableActivities,
  ]);
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

  const createClientMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowClientForm(false);
      // Select the newly created client
      if (data?.data?._id) {
        setSelectedClientId(data.data._id);
      }
      toast({
        title: "Success",
        description: "Client created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create client",
        type: "destructive",
      });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: packagesApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      setShowPackageForm(false);
      // Reset package form state
      setPackageType("RECURRING");
      setPackageSelectedServices([]);
      setPackageSelectedActivities([]);
      setTemplatePackageId("");
      // Select the newly created package
      if (data?.data?._id) {
        setSelectedPackageId(data.data._id);
      }
      toast({
        title: "Success",
        description: "Package created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create package",
        type: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditingTask(null);
    setCopiedTaskData(null);
    setPendingClientId(null);
    setSelectedClientId("");
    setSelectedPackageId("");
    setSelectedEmployees([]);
    setSelectedServices([]);
    setSelectedActivities([]);
    setShowAddServiceDropdown(false);
    setShowAddActivityDropdown(false);
    setTempServiceSelection("");
    setTempActivitySelection("");
  };

  // Ensure client is selected when form opens with copied data and clients are loaded
  useEffect(() => {
    if (showForm && !editingTask && pendingClientId && clients.length > 0) {
      // Find the client in the options
      const clientIdStr = pendingClientId?.toString() || pendingClientId;
      const clientExists = clients.find((client) => {
        const clientId = client._id?.toString() || client._id;
        return clientId === clientIdStr;
      });

      // Update selectedClientId if client exists and it's different
      if (clientExists) {
        const currentClientId =
          selectedClientId?.toString() || selectedClientId;
        if (currentClientId !== clientIdStr) {
          setSelectedClientId(clientIdStr);
        }
        setPendingClientId(null);
      } else if (pendingClientId) {
        // Client not found yet, but keep the pending ID
        // This might happen if clients are still loading
        const currentClientId =
          selectedClientId?.toString() || selectedClientId;
        if (currentClientId !== clientIdStr) {
          setSelectedClientId(clientIdStr);
        }
      }
    }
  }, [showForm, editingTask, pendingClientId, clients, selectedClientId]);

  const handleCreateClient = () => {
    setShowClientForm(true);
  };

  const handleCreatePackage = () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        type: "destructive",
      });
      return;
    }
    setShowPackageForm(true);
  };

  const handleClientSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      contactPerson: formData.get("contactPerson"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      status: formData.get("status") || "ACTIVE",
    };
    createClientMutation.mutate(data);
  };

  const handlePackageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      clientId: selectedClientId,
      name: formData.get("name"),
      type: packageType,
      billingFrequency:
        packageType === "RECURRING"
          ? formData.get("billingFrequency") || undefined
          : undefined,
      contractValue: parseFloat(formData.get("contractValue")),
      startDate: formData.get("startDate"),
      status: formData.get("status") || "ACTIVE",
      services: packageSelectedServices,
      activities: packageSelectedActivities,
    };
    createPackageMutation.mutate(data);
  };

  const handleTemplatePackageSelect = (packageId) => {
    if (!packageId) {
      setTemplatePackageId("");
      return;
    }

    const allPackages = allPackagesData?.data?.packages || [];
    const templatePackage = allPackages.find((pkg) => pkg._id === packageId);
    if (!templatePackage) return;

    setTemplatePackageId(packageId);

    // Auto-fill form fields
    setPackageType(templatePackage.type || "RECURRING");
    setPackageSelectedServices(
      templatePackage.services?.map((s) =>
        typeof s === "object" ? s._id : s
      ) || []
    );
    setPackageSelectedActivities(
      templatePackage.activities?.map((a) =>
        typeof a === "object" ? a._id : a
      ) || []
    );

    // Set form field values using the form reference
    if (packageFormRef.current) {
      const form = packageFormRef.current;
      const nameInput = form.querySelector('[name="name"]');
      const contractValueInput = form.querySelector('[name="contractValue"]');
      const startDateInput = form.querySelector('[name="startDate"]');
      const billingFrequencySelect = form.querySelector(
        '[name="billingFrequency"]'
      );
      const statusSelect = form.querySelector('[name="status"]');

      if (nameInput) nameInput.value = templatePackage.name || "";
      if (contractValueInput)
        contractValueInput.value = templatePackage.contractValue || "";
      if (startDateInput) startDateInput.value = "";
      if (billingFrequencySelect)
        billingFrequencySelect.value = templatePackage.billingFrequency || "";
      if (statusSelect) statusSelect.value = templatePackage.status || "ACTIVE";
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);

    // Extract and convert IDs to strings
    const clientId =
      task.clientId?._id?.toString() ||
      task.clientId?.toString() ||
      task.clientId ||
      "";
    const packageId =
      task.packageId?._id?.toString() ||
      task.packageId?.toString() ||
      task.packageId ||
      "";

    // Handle both single employee (old format) and array (new format)
    const assignedEmployees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map((emp) => {
          const empId = emp._id?.toString() || emp._id || emp;
          return typeof empId === "string" ? empId : empId?.toString() || empId;
        })
      : task.assignedTo
      ? [
          task.assignedTo._id?.toString() ||
            task.assignedTo._id ||
            task.assignedTo?.toString() ||
            task.assignedTo,
        ]
      : [];

    // Handle services and activities - convert to strings
    const serviceIds =
      task.services?.map((s) => {
        const serviceId =
          typeof s === "object" ? s._id?.toString() || s._id : s;
        return typeof serviceId === "string"
          ? serviceId
          : serviceId?.toString() || serviceId;
      }) || [];

    const activityIds =
      task.activities?.map((a) => {
        const activityId =
          typeof a === "object" ? a._id?.toString() || a._id : a;
        return typeof activityId === "string"
          ? activityId
          : activityId?.toString() || activityId;
      }) || [];

    setSelectedClientId(clientId);
    setSelectedPackageId(packageId);
    setSelectedEmployees(assignedEmployees);
    setSelectedServices(serviceIds);
    setSelectedActivities(activityIds);
    setShowForm(true);
  };

  const handleCopy = (task) => {
    // Copy task data but reset status to TODO and remove _id
    setEditingTask(null); // Not editing, creating a new task

    // Extract and convert IDs to strings
    const clientId =
      task.clientId?._id?.toString() ||
      task.clientId?.toString() ||
      task.clientId ||
      "";
    const packageId =
      task.packageId?._id?.toString() ||
      task.packageId?.toString() ||
      task.packageId ||
      "";

    // Handle both single employee (old format) and array (new format)
    const assignedEmployees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map((emp) => {
          const empId = emp._id?.toString() || emp._id || emp;
          return typeof empId === "string" ? empId : empId?.toString() || empId;
        })
      : task.assignedTo
      ? [
          task.assignedTo._id?.toString() ||
            task.assignedTo._id ||
            task.assignedTo?.toString() ||
            task.assignedTo,
        ]
      : [];

    // Handle services and activities - convert to strings
    const serviceIds =
      task.services?.map((s) => {
        const serviceId =
          typeof s === "object" ? s._id?.toString() || s._id : s;
        return typeof serviceId === "string"
          ? serviceId
          : serviceId?.toString() || serviceId;
      }) || [];

    const activityIds =
      task.activities?.map((a) => {
        const activityId =
          typeof a === "object" ? a._id?.toString() || a._id : a;
        return typeof activityId === "string"
          ? activityId
          : activityId?.toString() || activityId;
      }) || [];

    setCopiedTaskData({
      name: `${task.name} (Copy)`,
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
    });

    // Set pending client ID to be set after form opens and clients are loaded
    if (clientId) {
      setPendingClientId(clientId);
    }

    // Set state values - ensure they're strings
    setSelectedClientId(clientId);
    setSelectedPackageId(packageId);
    setSelectedEmployees(assignedEmployees);
    setSelectedServices(serviceIds);
    setSelectedActivities(activityIds);

    // Open form after state is set
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

  // Timer handlers now come from the useTimer hook

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
      activities:
        selectedActivities.length > 0 ? selectedActivities : undefined,
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

  const handleAddService = () => {
    if (tempServiceSelection) {
      const serviceIdStr =
        tempServiceSelection?.toString() || tempServiceSelection;
      // Check if service is already selected (compare as strings)
      const isAlreadySelected = selectedServices.some((id) => {
        const idStr = id?.toString() || id;
        return idStr === serviceIdStr;
      });
      if (!isAlreadySelected) {
        setSelectedServices([...selectedServices, serviceIdStr]);
      }
      setTempServiceSelection("");
      setShowAddServiceDropdown(false);
    }
  };

  const handleAddActivity = () => {
    if (tempActivitySelection) {
      const activityIdStr =
        tempActivitySelection?.toString() || tempActivitySelection;
      // Check if activity is already selected (compare as strings)
      const isAlreadySelected = selectedActivities.some((id) => {
        const idStr = id?.toString() || id;
        return idStr === activityIdStr;
      });
      if (!isAlreadySelected) {
        setSelectedActivities([...selectedActivities, activityIdStr]);
      }
      setTempActivitySelection("");
      setShowAddActivityDropdown(false);
    }
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
            {/* Task View Filter - Only show for non-admin users */}
            {!isAdmin() && user?.employeeId && (
              <div className="flex items-center gap-2 border rounded-lg p-1 bg-white">
                <Button
                  variant={taskViewFilter === "myTasks" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setTaskViewFilter("myTasks");
                    // Clear any manual assignedTo filter - will be set automatically
                    const newFilters = { ...filters };
                    delete newFilters.assignedTo;
                    setFilters(newFilters);
                  }}
                >
                  My Tasks
                </Button>
                <Button
                  variant={taskViewFilter === "allTasks" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setTaskViewFilter("allTasks");
                    // Clear assignedTo filter to show all tasks
                    const newFilters = { ...filters };
                    delete newFilters.assignedTo;
                    setFilters(newFilters);
                  }}
                >
                  All Tasks
                </Button>
              </div>
            )}
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
          <div className="py-12">
            <LoaderWithText text="Loading tasks..." />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            tasks={tasks}
            onTaskMove={handleTaskMove}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTaskClick={handleTaskClick}
            onCopy={handleCopy}
            onStartTimer={(taskId) => {
              const task = tasks.find((t) => t._id === taskId);
              return handleStartTimerForTask(taskId, task);
            }}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            onCompleteTimer={handleCompleteTimer}
            runningTimerId={
              runningTimer?.taskId?._id?.toString() ||
              runningTimer?.taskId?.toString() ||
              (runningTimer?.taskId && typeof runningTimer.taskId === "string"
                ? runningTimer.taskId
                : null)
            }
            isTimerRunning={isRunning && !isPaused}
            isTimerPaused={isPaused}
          />
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider"></th>
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
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Timer
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
                      colSpan="11"
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
                          <Avatar name={task.name} size="sm" />
                        </td>
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
                            <span className="truncate max-w-[120px]">
                              {task.clientId?.name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            {task.assignedTo &&
                            Array.isArray(task.assignedTo) ? (
                              task.assignedTo.length > 0 ? (
                                <>
                                  <Avatar
                                    src={
                                      task.assignedTo[0]?.profilePicture?.url
                                    }
                                    name={
                                      task.assignedTo[0]?.name ||
                                      task.assignedTo[0]?.email ||
                                      ""
                                    }
                                    size="xs"
                                  />
                                  <span className="truncate max-w-[100px]">
                                    {task.assignedTo[0]?.name ||
                                      task.assignedTo[0]?.email ||
                                      task.assignedTo[0]}
                                    {task.assignedTo.length > 1 &&
                                      ` +${task.assignedTo.length - 1}`}
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
                                  name={
                                    task.assignedTo.name ||
                                    task.assignedTo.email ||
                                    ""
                                  }
                                  size="xs"
                                />
                                <span className="truncate max-w-[100px]">
                                  {task.assignedTo.name ||
                                    task.assignedTo.email ||
                                    task.assignedTo}
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
                                  <span className="truncate max-w-[80px]">
                                    {service.name || service}
                                  </span>
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
                              {task.activities
                                .slice(0, 1)
                                .map((activity, idx) => (
                                  <span
                                    key={activity._id || activity || idx}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]"
                                  >
                                    <Activity className="h-2.5 w-2.5" />
                                    <span className="truncate max-w-[80px]">
                                      {activity.name || activity}
                                    </span>
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
                            <Calendar
                              className={`h-3 w-3 flex-shrink-0 ${
                                isOverdue ? "text-red-500" : "text-gray-400"
                              }`}
                            />
                            {task.dueDate ? (
                              <span
                                className={
                                  isOverdue
                                    ? "text-red-600 font-semibold"
                                    : "text-gray-600"
                                }
                              >
                                {format(new Date(task.dueDate), "MMM dd")}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {isOverdue && (
                              <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              const taskIdStr =
                                task._id?.toString() || task._id;
                              const runningTaskIdStr =
                                runningTimer?.taskId?._id?.toString() ||
                                runningTimer?.taskId?.toString() ||
                                (runningTimer?.taskId &&
                                typeof runningTimer.taskId === "string"
                                  ? runningTimer.taskId
                                  : null);
                              const isThisTaskRunning =
                                runningTaskIdStr &&
                                taskIdStr &&
                                runningTaskIdStr === taskIdStr;

                              if (isThisTaskRunning) {
                                return (
                                  <>
                                    {isRunning && !isPaused ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handlePauseTimer}
                                        disabled={pauseTimerMutation.isPending}
                                        className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50"
                                        title="Pause"
                                      >
                                        <Pause className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResumeTimer}
                                        disabled={resumeTimerMutation.isPending}
                                        className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                                        title="Resume"
                                      >
                                        <Play className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCompleteTimer}
                                      disabled={stopTimerMutation.isPending}
                                      className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                      title="Complete"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </>
                                );
                              } else {
                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleStartTimerForTask(task._id, task)
                                    }
                                    disabled={
                                      startTimerForTaskMutation.isPending
                                    }
                                    className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                                    title="Start Timer"
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                );
                              }
                            })()}
                          </div>
                        </td>
                        <td
                          className="px-3 py-2 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(task);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(task);
                                }}
                                className="cursor-pointer"
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Copy
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(task._id);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
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
        )}

        {/* Task Detail Drawer */}
        <TaskDetailDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />

        {/* Filter Drawer */}
        <TaskFilterDrawer
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={filters}
          onFilterChange={setFilters}
          clients={clients}
          packages={packagesData?.data?.packages || []}
          employees={employees}
        />

        {/* Task Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Project Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="clientId"
                      className="text-sm font-medium text-gray-700"
                    >
                      Client *
                    </label>
                    <SelectSearch
                      key={`client-${selectedClientId || "empty"}-${showForm}`}
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
                      onAddNew={handleCreateClient}
                      addNewLabel="Add Client"
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
                        setShowAddServiceDropdown(false);
                        setShowAddActivityDropdown(false);
                        setTempServiceSelection("");
                        setTempActivitySelection("");
                      }}
                      placeholder="Search and select package..."
                      searchPlaceholder="Search packages..."
                      emptyMessage="No packages found"
                      disabled={!selectedClientId && !editingTask}
                      onAddNew={
                        selectedClientId ? handleCreatePackage : undefined
                      }
                      addNewLabel="Add Package"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Services
                    </label>
                    {selectedPackageId && filteredServices.length === 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500 py-2 px-3 border border-gray-300 rounded-lg bg-gray-50">
                          No services found in this package
                        </div>
                        {showAddServiceDropdown ? (
                          <div className="space-y-2">
                            <SelectSearch
                              options={availableServices}
                              value={tempServiceSelection}
                              onChange={setTempServiceSelection}
                              placeholder="Select a service to add..."
                              searchPlaceholder="Search services..."
                              emptyMessage="No services found"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleAddService}
                                disabled={!tempServiceSelection}
                              >
                                Add Service
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAddServiceDropdown(false);
                                  setTempServiceSelection("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddServiceDropdown(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
                          </Button>
                        )}
                        {selectedServices.length > 0 && (
                          <div className="mt-2">
                            <MultiSelect
                              options={availableServices}
                              selected={selectedServices}
                              onChange={setSelectedServices}
                              placeholder="Selected services..."
                              searchPlaceholder="Search services..."
                              emptyMessage="No services selected"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <MultiSelect
                        options={filteredServices}
                        selected={selectedServices}
                        onChange={setSelectedServices}
                        placeholder="Select services..."
                        searchPlaceholder="Search services..."
                        emptyMessage="No services found"
                        disabled={!selectedPackageId && !editingTask}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Activities
                    </label>
                    {selectedPackageId && filteredActivities.length === 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500 py-2 px-3 border border-gray-300 rounded-lg bg-gray-50">
                          No activities found in this package
                        </div>
                        {showAddActivityDropdown ? (
                          <div className="space-y-2">
                            <SelectSearch
                              options={availableActivities}
                              value={tempActivitySelection}
                              onChange={setTempActivitySelection}
                              placeholder="Select an activity to add..."
                              searchPlaceholder="Search activities..."
                              emptyMessage="No activities found"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleAddActivity}
                                disabled={!tempActivitySelection}
                              >
                                Add Activity
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAddActivityDropdown(false);
                                  setTempActivitySelection("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddActivityDropdown(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Activity
                          </Button>
                        )}
                        {selectedActivities.length > 0 && (
                          <div className="mt-2">
                            <MultiSelect
                              options={availableActivities}
                              selected={selectedActivities}
                              onChange={setSelectedActivities}
                              placeholder="Selected activities..."
                              searchPlaceholder="Search activities..."
                              emptyMessage="No activities selected"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <MultiSelect
                        options={filteredActivities}
                        selected={selectedActivities}
                        onChange={setSelectedActivities}
                        placeholder="Select activities..."
                        searchPlaceholder="Search activities..."
                        emptyMessage="No activities found"
                        disabled={!selectedPackageId && !editingTask}
                      />
                    )}
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
                    defaultValue={copiedTaskData?.name || editingTask?.name}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                    defaultValue={
                      copiedTaskData?.description || editingTask?.description
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
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
                      defaultValue={
                        copiedTaskData?.priority ||
                        editingTask?.priority ||
                        "MEDIUM"
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                      copiedTaskData?.dueDate ||
                      (editingTask?.dueDate
                        ? new Date(editingTask.dueDate)
                            .toISOString()
                            .split("T")[0]
                        : "")
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

        {/* Client Creation Dialog */}
        <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new client.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="clientName"
                  className="text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="clientName"
                  name="name"
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="contactPerson"
                  className="text-sm font-medium text-gray-700"
                >
                  Contact Person
                </label>
                <input
                  id="contactPerson"
                  name="contactPerson"
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="clientEmail"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="clientEmail"
                  name="email"
                  type="email"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="clientPhone"
                  className="text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="clientPhone"
                  name="phone"
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="clientStatus"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="clientStatus"
                  name="status"
                  defaultValue="ACTIVE"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClientForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Package Creation Dialog */}
        <Dialog open={showPackageForm} onOpenChange={setShowPackageForm}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new package for this client.
              </DialogDescription>
            </DialogHeader>
            <form
              ref={packageFormRef}
              onSubmit={handlePackageSubmit}
              className="space-y-4"
            >
              <div className="space-y-2 mb-6">
                <label
                  htmlFor="templatePackage"
                  className="text-sm font-medium text-gray-700"
                >
                  Copy from Existing Package (Optional)
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Filter by Type
                    </label>
                    <select
                      value={packageTypeFilter}
                      onChange={(e) => {
                        setPackageTypeFilter(e.target.value);
                        setTemplatePackageId(""); // Reset selection when filter changes
                      }}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Types</option>
                      <option value="RECURRING">Recurring</option>
                      <option value="ONE_TIME">One Time</option>
                    </select>
                  </div>
                  <SelectSearch
                    options={formattedTemplatePackages}
                    value={templatePackageId}
                    onChange={(value) => handleTemplatePackageSelect(value)}
                    placeholder="Search and select package to copy..."
                    searchPlaceholder="Search packages..."
                    emptyMessage="No packages found"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="packageName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Package Name *
                  </label>
                  <input
                    id="packageName"
                    name="name"
                    type="text"
                    required
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="packageType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Type *
                  </label>
                  <select
                    id="packageType"
                    name="type"
                    required
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="RECURRING">Recurring</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
                {packageType === "RECURRING" && (
                  <div className="space-y-2">
                    <label
                      htmlFor="billingFrequency"
                      className="text-sm font-medium text-gray-700"
                    >
                      Billing Frequency *
                    </label>
                    <select
                      id="billingFrequency"
                      name="billingFrequency"
                      required={packageType === "RECURRING"}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Services
                  </label>
                  <MultiSelect
                    options={availableServices}
                    selected={packageSelectedServices}
                    onChange={setPackageSelectedServices}
                    placeholder="Select services..."
                    searchPlaceholder="Search services..."
                    emptyMessage="No services found"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Activities
                  </label>
                  <MultiSelect
                    options={availableActivities}
                    selected={packageSelectedActivities}
                    onChange={setPackageSelectedActivities}
                    placeholder="Select activities..."
                    searchPlaceholder="Search activities..."
                    emptyMessage="No activities found"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="contractValue"
                    className="text-sm font-medium text-gray-700"
                  >
                    Contract Value (AED) *
                  </label>
                  <input
                    id="contractValue"
                    name="contractValue"
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="startDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start Date *
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="packageStatus"
                    className="text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="packageStatus"
                    name="status"
                    defaultValue="ACTIVE"
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageForm(false);
                    setPackageType("RECURRING");
                    setPackageSelectedServices([]);
                    setPackageSelectedActivities([]);
                    setTemplatePackageId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPackageMutation.isPending}
                >
                  {createPackageMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

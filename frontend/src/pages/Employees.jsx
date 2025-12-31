import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { employeesApi } from "@/api/employees";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { FileUpload } from "@/components/FileUpload";
import { Avatar } from "@/components/Avatar";
import { Plus, Pencil, Trash2, Eye, FileText, Upload, X, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import { LoaderWithText } from "@/components/Loader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

export const Employees = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["employees", page, search],
    queryFn: () => employeesApi.getAll({ page, limit, search }),
  });

  const createMutation = useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Success",
        description: "Employee created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create employee",
        type: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowForm(false);
      setEditingEmployee(null);
      resetForm();
      toast({
        title: "Success",
        description: "Employee updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update employee",
        type: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete employee",
        type: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ employeeId, file }) =>
      employeesApi.uploadDocument(employeeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to upload document",
        type: "destructive",
      });
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: ({ employeeId, file }) =>
      employeesApi.uploadProfilePicture(employeeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to upload profile picture",
        type: "destructive",
      });
    },
  });

  const deleteProfilePictureMutation = useMutation({
    mutationFn: (employeeId) => employeesApi.deleteProfilePicture(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Profile picture deleted successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete profile picture",
        type: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ employeeId, documentId }) =>
      employeesApi.deleteDocument(employeeId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete document",
        type: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditingEmployee(null);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      designation: formData.get("designation") || undefined,
      hourlyRate: formData.get("hourlyRate")
        ? parseFloat(formData.get("hourlyRate"))
        : undefined,
      monthlyCost: parseFloat(formData.get("monthlyCost")),
      monthlyWorkingHours: formData.get("monthlyWorkingHours")
        ? parseFloat(formData.get("monthlyWorkingHours"))
        : undefined,
      isActive: formData.get("isActive") === "true",
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUploadDocument = async (file) => {
    if (!editingEmployee?._id) return;
    await uploadDocumentMutation.mutateAsync({
      employeeId: editingEmployee._id,
      file,
    });
  };

  const handleDeleteDocument = async (documentId) => {
    if (!editingEmployee?._id) return;
    await deleteDocumentMutation.mutateAsync({
      employeeId: editingEmployee._id,
      documentId,
    });
  };

  const employees = data?.data?.employees || [];
  const pagination = data?.data?.pagination;

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employees</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage your team members</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Employee
          </Button>
        </div>

        {/* Search */}
        <Card>
          <div className="p-2">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search employees..."
            />
          </div>
        </Card>

        {isLoading ? (
          <Card>
            <div className="p-8">
              <LoaderWithText text="Loading employees..." />
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
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Hourly Rate
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Monthly Cost
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-2 py-8 text-center text-xs text-gray-500"
                      >
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr
                        key={employee._id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/employees/${employee._id}`)}
                      >
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <Avatar
                            src={employee.profilePicture?.url}
                            name={employee.name}
                            size="sm"
                          />
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900">{employee.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                          {employee.designation || "-"}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                          {employee.email || "-"}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                          {employee.hourlyRate?.toFixed(2) ||
                            employee.hourlyCost?.toFixed(2) ||
                            "-"}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                          ${employee.monthlyCost?.toFixed(2) || "0.00"}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span>{employee.documents?.length || 0}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 inline-flex text-[10px] font-semibold rounded-full ${
                              employee.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {employee.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td
                          className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                                  navigate(`/employees/${employee._id}`);
                                }}
                                className="cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(employee);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(employee._id);
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pagination && (
              <Pagination pagination={pagination} onPageChange={setPage} />
            )}
          </Card>
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Update employee information below."
                  : "Fill in the details to create a new employee."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                  Profile Picture
                </h3>
                <div className="flex items-center gap-4">
                  <Avatar
                    src={editingEmployee?.profilePicture?.url}
                    name={editingEmployee?.name || ''}
                    size="lg"
                  />
                  <div className="flex-1 space-y-2">
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && editingEmployee?._id) {
                            uploadProfilePictureMutation.mutate({
                              employeeId: editingEmployee._id,
                              file,
                            });
                          }
                        }}
                        disabled={!editingEmployee?._id || uploadProfilePictureMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={!editingEmployee?._id || uploadProfilePictureMutation.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          const input = e.target.closest('label').querySelector('input[type="file"]');
                          input?.click();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {uploadProfilePictureMutation.isPending ? 'Uploading...' : 'Upload Picture'}
                      </Button>
                    </label>
                    {editingEmployee?.profilePicture?.url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (editingEmployee?._id) {
                            deleteProfilePictureMutation.mutate(editingEmployee._id);
                          }
                        }}
                        disabled={deleteProfilePictureMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Upload a profile picture (optional). Supported formats: JPG, PNG
                </p>
              </div>

              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      defaultValue={editingEmployee?.name}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingEmployee?.email}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="designation"
                      className="text-sm font-medium text-gray-700"
                    >
                      Designation/Position
                    </label>
                    <input
                      id="designation"
                      name="designation"
                      type="text"
                      placeholder="e.g., Senior Developer, Manager"
                      defaultValue={editingEmployee?.designation}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Compensation Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Compensation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="hourlyRate"
                      className="text-sm font-medium text-gray-700"
                    >
                      Hourly Rate
                    </label>
                    <input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingEmployee?.hourlyRate}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="monthlyCost"
                      className="text-sm font-medium text-gray-700"
                    >
                      Monthly Salary *
                    </label>
                    <input
                      id="monthlyCost"
                      name="monthlyCost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={editingEmployee?.monthlyCost}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="monthlyWorkingHours"
                      className="text-sm font-medium text-gray-700"
                    >
                      Monthly Working Hours
                    </label>
                    <input
                      id="monthlyWorkingHours"
                      name="monthlyWorkingHours"
                      type="number"
                      min="1"
                      max="744"
                      defaultValue={editingEmployee?.monthlyWorkingHours}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              {editingEmployee && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Documents
                  </h3>
                  <FileUpload
                    onUpload={handleUploadDocument}
                    onDelete={handleDeleteDocument}
                    existingFiles={editingEmployee.documents || []}
                  />
                </div>
              )}

              {/* Status Section */}
              <div className="space-y-2">
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={
                    editingEmployee?.isActive !== false ? "true" : "false"
                  }
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingEmployee
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

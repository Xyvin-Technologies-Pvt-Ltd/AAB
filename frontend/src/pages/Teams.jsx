import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { teamsApi } from "@/api/teams";
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
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { MultiSelect } from "@/ui/multi-select";
import { LoaderWithText } from "@/components/Loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

export const Teams = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => teamsApi.getAll({ limit: 100 }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Success",
        description: "Team created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create team",
        type: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowForm(false);
      setEditingTeam(null);
      resetForm();
      toast({
        title: "Success",
        description: "Team updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update team",
        type: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teamsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete team",
        type: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditingTeam(null);
    setSelectedManagerId("");
    setSelectedMembers([]);
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setSelectedManagerId(team.managerId?._id || team.managerId || "");
    setSelectedMembers(team.members?.map((m) => m._id || m) || []);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      managerId: selectedManagerId,
      members: selectedMembers,
      isActive: formData.get("isActive") === "true",
    };

    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const teams = data?.data?.teams || [];
  const employees = employeesData?.data?.employees || [];

  const employeeOptions = employees.map((emp) => ({
    _id: emp._id,
    name: emp.name,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">
              Manage teams and assign managers
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12">
            <LoaderWithText text="Loading teams..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team._id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {team.name}
                    </h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(team);
                        }}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team._id);
                        }}
                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium">Manager</span>
                    </div>
                    <p className="text-sm text-gray-900">
                      {team.managerId?.name || "Not assigned"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Members</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {team.members?.length || 0}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {team.members?.slice(0, 3).map((member) => (
                        <span
                          key={member._id || member}
                          className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded"
                        >
                          {member.name || "Unknown"}
                        </span>
                      ))}
                      {team.members?.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{team.members.length - 3} more
                        </span>
                      )}
                      {(!team.members || team.members.length === 0) && (
                        <span className="text-xs text-gray-400">
                          No members
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        team.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {team.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {teams.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No teams found
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first team
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[1200px]">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Edit Team" : "Create Team"}
              </DialogTitle>
              <DialogDescription>
                {editingTeam
                  ? "Update team details and members"
                  : "Create a new team and assign a manager"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingTeam?.name}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager *
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  required
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Manager</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Members
                </label>
                <MultiSelect
                  options={employeeOptions.filter(
                    (opt) => opt.value !== selectedManagerId
                  )}
                  selected={selectedMembers}
                  onChange={setSelectedMembers}
                  placeholder="Select team members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="isActive"
                  defaultValue={
                    editingTeam?.isActive !== false ? "true" : "false"
                  }
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  {editingTeam ? "Update" : "Create"} Team
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

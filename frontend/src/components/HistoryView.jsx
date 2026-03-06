import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, adminApi } from "@/api/tasks";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/ui/button";
import { Avatar } from "@/components/Avatar";
import { format } from "date-fns";
import { RotateCcw, Archive, Search, Building2, User, Calendar, Zap, Loader2 } from "lucide-react";
import { LoaderWithText } from "@/components/Loader";

export const HistoryView = ({ clients = [], employees = [] }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [searchText, setSearchText] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const { data: archivedData, isLoading } = useQuery({
    queryKey: ["tasks", "archived"],
    queryFn: () => tasksApi.getArchived(),
  });

  const unarchiveMutation = useMutation({
    mutationFn: tasksApi.unarchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Restored", description: "Task moved back to Done", type: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to restore", type: "destructive" });
    },
  });

  const triggerArchiveMutation = useMutation({
    mutationFn: adminApi.triggerArchive,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Archive complete", description: data?.message || "Auto-archive ran successfully", type: "success" });
    },
    onError: (error) => {
      toast({ title: "Failed", description: error.response?.data?.message || "Could not run archive", type: "destructive" });
    },
  });

  const archivedTasks = archivedData?.data?.tasks || [];

  const filtered = archivedTasks.filter((task) => {
    const matchSearch = !searchText || task.name?.toLowerCase().includes(searchText.toLowerCase());
    const matchClient = !clientFilter || task.clientId?._id === clientFilter;
    const matchAssignee = !assigneeFilter || (Array.isArray(task.assignedTo) ? task.assignedTo.some((a) => a._id === assigneeFilter) : task.assignedTo?._id === assigneeFilter);
    return matchSearch && matchClient && matchAssignee;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderWithText text="Loading history..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search archived tasks..."
            className="text-sm text-gray-700 outline-none flex-1 bg-transparent"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
        >
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
        >
          <option value="">All Assignees</option>
          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} archived tasks</span>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerArchiveMutation.mutate()}
            disabled={triggerArchiveMutation.isPending}
            className="h-8 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5"
            title="Immediately archive all DONE tasks older than 7 days"
          >
            {triggerArchiveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Run Archive Now
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg shadow">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Archive className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">No archived tasks</p>
            <p className="text-xs text-gray-300 mt-1">Completed tasks will appear here after being archived</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Task Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Client</div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1"><User className="h-3 w-3" /> Assignee</div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Completed</div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Archived</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filtered.map((task) => {
                const primaryAssignee = Array.isArray(task.assignedTo) ? task.assignedTo[0] : task.assignedTo;
                return (
                  <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800 max-w-[240px] truncate">{task.name}</div>
                      {task.packageId?.name && (
                        <div className="text-[10px] text-gray-400 truncate">{task.packageId.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{task.clientId?.name || "-"}</td>
                    <td className="px-4 py-2.5">
                      {primaryAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar src={primaryAssignee.profilePicture?.url} name={primaryAssignee.name || ""} size="xs" />
                          <span className="text-gray-600">{primaryAssignee.name || primaryAssignee.email || "-"}</span>
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {task.doneAt ? format(new Date(task.doneAt), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {task.archivedAt ? format(new Date(task.archivedAt), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unarchiveMutation.mutate(task._id)}
                        disabled={unarchiveMutation.isPending}
                        className="h-7 px-2.5 text-xs text-indigo-600 hover:bg-indigo-50"
                        title="Restore to Done"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

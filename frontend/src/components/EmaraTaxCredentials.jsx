import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { useToast } from "@/hooks/useToast";

export const EmaraTaxCredentials = ({ clientId, credentials }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch credentials using React Query for proper caching and refetching
  const { data: credentialsData, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["client", clientId, "emaraTaxCredentials"],
    queryFn: async () => {
      const response = await clientsApi.getById(clientId);
      return response?.data?.emaraTaxAccount || null;
    },
    enabled: !!clientId,
  });

  // Update formData when credentials are loaded (only when not editing)
  useEffect(() => {
    if (credentialsData && !isEditing) {
      setFormData({
        username: credentialsData.username || "",
        password: "",
      });
    }
  }, [credentialsData, isEditing]);

  const updateMutation = useMutation({
    mutationFn: (data) => clientsApi.updateEmaraTaxCredentials(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client", clientId, "emaraTaxCredentials"],
      });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      setIsEditing(false);
      setFormData({ username: formData.username, password: "" });
      toast({
        title: "Success",
        description: "EmaraTax credentials updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update credentials",
        type: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updateData = {
      username: formData.username || null,
      // Only send password if it's provided (empty string means don't update password)
      password: formData.password ? formData.password : undefined,
    };
    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setFormData({
      username: credentialsData?.username || "",
      password: "",
    });
    setIsEditing(false);
  };

  const getDisplayUsername = () => {
    if (isEditing) {
      return formData.username;
    }
    if (isLoadingCredentials) {
      return "Loading...";
    }
    return credentialsData?.username !== undefined &&
      credentialsData?.username !== null
      ? credentialsData.username
      : "-";
  };

  const getDisplayPassword = () => {
    if (isEditing) {
      return formData.password || "";
    }
    if (isLoadingCredentials) {
      return "Loading...";
    }
    // Show password if it exists, otherwise show '-'
    if (
      credentialsData?.password !== undefined &&
      credentialsData?.password !== null
    ) {
      return credentialsData.password;
    }
    return "-";
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            EmaraTax Account
          </h3>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                title="Edit credentials"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                title="Save"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Username</p>
            {isEditing ? (
              <input
                key="emara-username-input"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter username"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 break-all">
                {getDisplayUsername()}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Password</p>
            {isEditing ? (
              <input
                key="emara-password-input"
                type="text"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                placeholder="Enter password"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 font-mono break-all">
                {getDisplayPassword()}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

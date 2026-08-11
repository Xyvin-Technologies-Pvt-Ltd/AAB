import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import {
  useClientDetails,
  useUpdateEmaraTaxCredentials,
} from "@/api/queries/clientQueries";

export const EmaraTaxCredentials = ({ clientId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const { data: clientData, isLoading: isLoadingCredentials } =
    useClientDetails(clientId);
  const credentialsData = clientData?.data?.emaraTaxAccount || null;
  const updateMutation = useUpdateEmaraTaxCredentials();

  useEffect(() => {
    if (credentialsData && !isEditing) {
      setFormData({
        username: credentialsData.username || "",
        password: "",
      });
    }
  }, [credentialsData, isEditing]);

  const handleSave = () => {
    const updateData = {
      username: formData.username || null,
      password: formData.password ? formData.password : undefined,
    };
    updateMutation.mutate(
      { clientId, data: updateData },
      {
        onSuccess: () => {
          setIsEditing(false);
          setFormData({ username: formData.username, password: "" });
        },
      }
    );
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

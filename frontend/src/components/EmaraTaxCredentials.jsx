import { useState } from 'react';
import { Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { useToast } from '@/hooks/useToast';

export const EmaraTaxCredentials = ({ clientId, credentials }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [actualValues, setActualValues] = useState({
    username: null,
    password: null,
  });
  const [formData, setFormData] = useState({
    username: credentials?.username || '',
    password: '',
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (data) => clientsApi.updateEmaraTaxCredentials(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setIsEditing(false);
      setFormData({ username: formData.username, password: '' });
      setShowCredentials(false);
      toast({
        title: 'Success',
        description: 'EmaraTax credentials updated successfully',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update credentials',
        type: 'destructive',
      });
    },
  });

  const handleSave = () => {
    const updateData = {
      username: formData.username || null,
      password: formData.password || null,
    };
    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setFormData({
      username: credentials?.username || '',
      password: '',
    });
    setIsEditing(false);
    setShowCredentials(false);
  };

  const handleToggleView = async () => {
    if (!showCredentials) {
      // Fetch actual credentials from backend
      try {
        const response = await clientsApi.getById(clientId, { showCredentials: 'true' });
        if (response?.data?.emaraTaxAccount) {
          const account = response.data.emaraTaxAccount;
          // Store the actual values (even if empty string, we want to preserve it)
          setActualValues({
            username: account.username !== undefined ? account.username : null,
            password: account.password !== undefined ? account.password : null,
          });
          setShowCredentials(true);
        } else {
          toast({
            title: 'Info',
            description: 'No credentials found. Please edit to add credentials.',
            type: 'default',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch credentials',
          type: 'destructive',
        });
      }
    } else {
      setShowCredentials(false);
    }
  };

  const maskValue = (value) => {
    if (!value) return '-';
    if (value.length <= 4) return '*'.repeat(value.length);
    const first = value.slice(0, 2);
    const last = value.slice(-2);
    const middle = '*'.repeat(value.length - 4);
    return `${first}${middle}${last}`;
  };

  const getDisplayUsername = () => {
    if (isEditing) {
      return formData.username;
    }
    if (showCredentials) {
      // When showing credentials, use actual values if available
      if (actualValues.username !== null && actualValues.username !== undefined) {
        return actualValues.username;
      }
      // Fallback to credentials prop if actualValues not set yet
      if (credentials?.username && !credentials.username.includes('*')) {
        return credentials.username;
      }
    }
    // Show masked version
    return credentials?.username ? maskValue(credentials.username) : '-';
  };

  const getDisplayPassword = () => {
    if (isEditing) {
      return formData.password || '';
    }
    if (showCredentials && actualValues.password) {
      return actualValues.password;
    }
    return credentials?.password ? '••••••••' : '-';
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">EmaraTax Account</h3>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleView}
                title={showCredentials ? 'Hide credentials' : 'Show credentials'}
              >
                {showCredentials ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
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
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 mb-1">Username</p>
            {isEditing ? (
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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


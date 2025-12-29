import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Avatar } from "@/components/Avatar";
import { authApi } from "@/api/auth";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { Upload, X } from "lucide-react";

export const AccountDetailsDialog = ({ open, onOpenChange }) => {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [originalProfilePicture, setOriginalProfilePicture] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      // Load user data - name and DOB might come from employee profile
      const employeeName = user?.employeeId?.name || "";
      const employeeDob = user?.employeeId?.dateOfBirth || "";
      const profilePicture = user?.employeeId?.profilePicture?.url || "";

      setFormData({
        name: employeeName,
        dateOfBirth: employeeDob
          ? new Date(employeeDob).toISOString().split("T")[0]
          : "",
      });

      const originalPicture = profilePicture || null;
      setOriginalProfilePicture(originalPicture);
      setProfileImagePreview(originalPicture);
      setProfileImage(null);
      setErrors({});
    }
  }, [open, user]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "Please select an image file",
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image size must be less than 5MB",
        }));
        return;
      }

      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setProfileImagePreview(originalProfilePicture);
    // Clear the file input
    const fileInput = document.getElementById("profileImage");
    if (fileInput) fileInput.value = "";
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      if (formData.dateOfBirth) {
        formDataToSend.append("dateOfBirth", formData.dateOfBirth);
      }
      if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
      }

      const updatedUser = await authApi.updateAccountDetails(formDataToSend);

      // Update user in store
      setUser(updatedUser.data);

      toast({
        title: "Success",
        description: "Account details updated successfully",
        variant: "success",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update account details",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Account Details</DialogTitle>
          <DialogDescription>
            Update your account information including name, date of birth, and
            profile picture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <Avatar
                name={formData.name || user?.email || "User"}
                src={profileImagePreview}
                size="lg"
              />
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <label htmlFor="profileImage" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={(e) => e.preventDefault()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </label>
                  {profileImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                {errors.image && (
                  <p className="text-sm text-red-500 mt-1">{errors.image}</p>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label
              htmlFor="dateOfBirth"
              className="text-sm font-medium text-gray-700"
            >
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
              max={new Date().toISOString().split("T")[0]} // Prevent future dates
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

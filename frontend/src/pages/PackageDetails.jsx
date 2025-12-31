import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { packagesApi } from "@/api/packages";
import { servicesApi } from "@/api/services";
import { activitiesApi } from "@/api/activities";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import {
  ArrowLeft,
  Edit,
  Building2,
  Calendar,
  DollarSign,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { formatDateDDMMYYYY } from "@/utils/dateFormat";
import { Badge } from "@/ui/badge";
import { LoaderWithText } from "@/components/Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { MultiSelect } from "@/ui/multi-select";

export const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [stillActive, setStillActive] = useState(true);
  const [packageType, setPackageType] = useState("RECURRING");
  const packageFormRef = useRef(null);

  const {
    data: packageData,
    isLoading: packageLoading,
    isFetching: packageFetching,
    isError: packageError,
    isPending,
  } = useQuery({
    queryKey: ["package", id],
    queryFn: () => packagesApi.getById(id),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.getAll({ limit: 10000 }),
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => activitiesApi.getAll({ limit: 10000 }),
  });

  const pkg = packageData?.data;
  const services = servicesData?.data?.services || servicesData?.data || [];
  const activities =
    activitiesData?.data?.activities || activitiesData?.data || [];

  // Initialize form when package loads
  useEffect(() => {
    if (pkg && !showEditForm) {
      setSelectedServices(
        pkg.services?.map((s) => (typeof s === "object" ? s._id : s)) || []
      );
      setSelectedActivities(
        pkg.activities?.map((a) => (typeof a === "object" ? a._id : a)) || []
      );
      setStillActive(!pkg.endDate);
      setPackageType(pkg.type || "RECURRING");
    }
  }, [pkg?._id, showEditForm]);

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => packagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package", id] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      setShowEditForm(false);
      toast({
        title: "Success",
        description: "Package updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update package",
        type: "error",
      });
    },
  });

  const handleEdit = () => {
    if (pkg) {
      setSelectedServices(
        pkg.services?.map((s) => (typeof s === "object" ? s._id : s)) || []
      );
      setSelectedActivities(
        pkg.activities?.map((a) => (typeof a === "object" ? a._id : a)) || []
      );
      setStillActive(!pkg.endDate);
      setPackageType(pkg.type || "RECURRING");
      setShowEditForm(true);
    }
  };

  const handlePackageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const type = formData.get("type");
    const data = {
      clientId: pkg.clientId?._id || pkg.clientId,
      name: formData.get("name"),
      type: type,
      billingFrequency:
        type === "RECURRING"
          ? formData.get("billingFrequency") || undefined
          : undefined,
      contractValue: parseFloat(formData.get("contractValue")),
      startDate: formData.get("startDate"),
      endDate: !stillActive ? formData.get("endDate") || undefined : undefined,
      status: formData.get("status"),
      services: selectedServices,
      activities: selectedActivities,
    };

    updatePackageMutation.mutate({ id: pkg._id, data });
  };

  if (packageLoading || packageFetching || isPending) {
    return (
      <AppLayout>
        <div className="py-12">
          <LoaderWithText text="Loading package details..." />
        </div>
      </AppLayout>
    );
  }

  if (packageError || !pkg) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Package not found</p>
          <Button onClick={() => navigate("/packages")} className="mt-4">
            Back to Packages
          </Button>
        </div>
      </AppLayout>
    );
  }

  const clientId =
    typeof pkg.clientId === "object" ? pkg.clientId._id : pkg.clientId;
  const clientName =
    typeof pkg.clientId === "object" ? pkg.clientId.name : "Unknown Client";

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/packages")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pkg.name}</h1>
              <p className="text-xs text-gray-600 mt-0.5">Package Details</p>
            </div>
          </div>
          <Button onClick={handleEdit} size="sm">
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        {/* Package Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Package Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Package Name</p>
                  <p className="text-sm font-medium">{pkg.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <Badge variant="outline" className="text-xs">
                      {pkg.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        pkg.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : pkg.status === "COMPLETED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {pkg.status}
                    </span>
                  </div>
                </div>
                {pkg.type === "RECURRING" && pkg.billingFrequency && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Billing Frequency
                    </p>
                    <p className="text-sm font-medium">
                      {pkg.billingFrequency}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contract Value</p>
                  <p className="text-sm font-medium">
                    AED {pkg.contractValue?.toFixed(2) || "0.00"}
                  </p>
                </div>
                {pkg.monthlyRevenue && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Monthly Revenue
                    </p>
                    <p className="text-sm font-medium">
                      AED {pkg.monthlyRevenue.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="text-sm font-medium">
                    {pkg.startDate ? formatDateDDMMYYYY(pkg.startDate) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">End Date</p>
                  <p className="text-sm font-medium">
                    {pkg.endDate ? formatDateDDMMYYYY(pkg.endDate) : "Active"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs text-gray-500 mb-1">Client Name</p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  onClick={() => navigate(`/clients/${clientId}`)}
                >
                  {clientName}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contract Value</p>
                  <p className="text-sm font-medium">
                    AED {pkg.contractValue?.toFixed(2) || "0.00"}
                  </p>
                </div>
                {pkg.monthlyRevenue && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Monthly Revenue
                    </p>
                    <p className="text-sm font-medium">
                      AED {pkg.monthlyRevenue.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services and Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Services</CardTitle>
            </CardHeader>
            <CardContent>
              {pkg.services && pkg.services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pkg.services.map((service) => (
                    <Badge
                      key={typeof service === "object" ? service._id : service}
                      variant="outline"
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {typeof service === "object" ? service.name : service}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No services assigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {pkg.activities && pkg.activities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pkg.activities.map((activity) => (
                    <Badge
                      key={
                        typeof activity === "object" ? activity._id : activity
                      }
                      variant="outline"
                      className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {typeof activity === "object" ? activity.name : activity}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No activities assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Package Dialog */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>
                Update package information below.
              </DialogDescription>
            </DialogHeader>
            <form
              ref={packageFormRef}
              onSubmit={handlePackageSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Package Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={pkg.name}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Type *
                  </label>
                  <select
                    id="type"
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
                      defaultValue={pkg.billingFrequency}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                )}
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
                    defaultValue={pkg.contractValue}
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
                    defaultValue={
                      pkg.startDate
                        ? new Date(pkg.startDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="stillActive"
                      checked={stillActive}
                      onChange={(e) => setStillActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="stillActive"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Still Active
                    </label>
                  </div>
                  {!stillActive && (
                    <div className="space-y-2">
                      <label
                        htmlFor="endDate"
                        className="text-sm font-medium text-gray-700"
                      >
                        End Date *
                      </label>
                      <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        required={!stillActive}
                        defaultValue={
                          pkg.endDate
                            ? new Date(pkg.endDate).toISOString().split("T")[0]
                            : ""
                        }
                        className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
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
                    defaultValue={pkg.status}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Services
                  </label>
                  <MultiSelect
                    options={services}
                    selected={selectedServices}
                    onChange={setSelectedServices}
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
                    options={activities}
                    selected={selectedActivities}
                    onChange={setSelectedActivities}
                    placeholder="Select activities..."
                    searchPlaceholder="Search activities..."
                    emptyMessage="No activities found"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePackageMutation.isPending}
                >
                  {updatePackageMutation.isPending ? "Saving..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

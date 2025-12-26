import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Building2,
  Users,
  Shield,
  Calendar,
  Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { BusinessInfoForm } from "@/components/BusinessInfoForm";
import { PartnersManagers } from "@/components/PartnersManagers";
import { CompactAlerts } from "@/components/CompactAlerts";
import { EmaraTaxCredentials } from "@/components/EmaraTaxCredentials";
import { formatDateDDMMYYYY } from "@/utils/dateFormat";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

export const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientsApi.getById(id),
  });

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages", id],
    queryFn: () => packagesApi.getAll({ clientId: id, limit: 100 }),
  });

  const client = clientData?.data;
  const packages = packagesData?.data?.packages || [];

  // Calculate next submission dates for this client
  const calculateNextVATSubmissionDate = (client) => {
    if (!client?.businessInfo) return null;
    const now = new Date();
    const vatFilingDaysAfterPeriod = 28;

    // Use tax periods if available
    if (
      client.businessInfo.vatTaxPeriods &&
      client.businessInfo.vatTaxPeriods.length > 0
    ) {
      const vatTaxPeriods = client.businessInfo.vatTaxPeriods;
      const sortedPeriods = [...vatTaxPeriods].sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );

      // Find next upcoming period based on submission dates
      for (const period of sortedPeriods) {
        const periodEndDate = new Date(period.endDate);
        const submissionDate = new Date(periodEndDate);
        submissionDate.setDate(
          submissionDate.getDate() + vatFilingDaysAfterPeriod
        );

        if (submissionDate.getTime() > now.getTime()) {
          return {
            submissionDate,
            period: {
              startDate: new Date(period.startDate),
              endDate: periodEndDate,
            },
            daysUntilDue: Math.floor(
              (submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          };
        }
      }

      // All periods have passed - calculate next recurring period
      // Find which period should come next based on current month
      const currentMonth = now.getMonth() + 1; // 1-12
      let nextPeriod = null;

      // Find the period that should occur next based on current month
      for (const period of sortedPeriods) {
        const periodStart = new Date(period.startDate);
        const periodStartMonth = periodStart.getMonth() + 1;

        // Check if this period should occur in the current or next cycle
        let testYear = now.getFullYear();
        if (periodStartMonth < currentMonth) {
          testYear = now.getFullYear() + 1;
        }

        const testPeriodStart = new Date(periodStart);
        testPeriodStart.setFullYear(testYear);

        const testPeriodEnd = new Date(period.endDate);
        testPeriodEnd.setFullYear(testYear);

        const testSubmissionDate = new Date(testPeriodEnd);
        testSubmissionDate.setDate(
          testSubmissionDate.getDate() + vatFilingDaysAfterPeriod
        );

        if (testSubmissionDate.getTime() > now.getTime()) {
          if (
            !nextPeriod ||
            testSubmissionDate.getTime() <
              new Date(nextPeriod.endDate).getTime()
          ) {
            nextPeriod = {
              startDate: testPeriodStart,
              endDate: testPeriodEnd,
              submissionDate: testSubmissionDate,
            };
          }
        }
      }

      // If no period found, use first period of next year
      if (!nextPeriod) {
        const firstPeriod = sortedPeriods[0];
        const nextPeriodStart = new Date(firstPeriod.startDate);
        nextPeriodStart.setFullYear(now.getFullYear() + 1);

        const nextPeriodEnd = new Date(firstPeriod.endDate);
        nextPeriodEnd.setFullYear(now.getFullYear() + 1);

        const submissionDate = new Date(nextPeriodEnd);
        submissionDate.setDate(
          submissionDate.getDate() + vatFilingDaysAfterPeriod
        );

        return {
          submissionDate,
          period: {
            startDate: nextPeriodStart,
            endDate: nextPeriodEnd,
          },
          daysUntilDue: Math.floor(
            (submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      }

      return {
        submissionDate: nextPeriod.submissionDate,
        period: {
          startDate: nextPeriod.startDate,
          endDate: nextPeriod.endDate,
        },
        daysUntilDue: Math.floor(
          (nextPeriod.submissionDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      };
    }

    // Fallback to cycle-based calculation
    if (client.businessInfo.vatReturnCycle) {
      const cycle = client.businessInfo.vatReturnCycle;
      const now = new Date();
      let periodEndDate = new Date();
      let submissionDate = new Date();

      if (cycle === "MONTHLY") {
        // Current month's end
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        submissionDate = new Date(periodEndDate);
        submissionDate.setDate(
          submissionDate.getDate() + vatFilingDaysAfterPeriod
        );

        // If submission date has passed, move to next month (cycle forward)
        if (submissionDate.getTime() <= now.getTime()) {
          periodEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          submissionDate = new Date(periodEndDate);
          submissionDate.setDate(
            submissionDate.getDate() + vatFilingDaysAfterPeriod
          );
        }
      } else if (cycle === "QUARTERLY") {
        // Calculate current quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        // Current quarter end (month 3, 6, 9, or 12)
        periodEndDate = new Date(
          now.getFullYear(),
          (currentQuarter + 1) * 3,
          0
        );
        submissionDate = new Date(periodEndDate);
        submissionDate.setDate(
          submissionDate.getDate() + vatFilingDaysAfterPeriod
        );

        // If submission date has passed, move to next quarter (cycle forward)
        if (submissionDate.getTime() <= now.getTime()) {
          const nextQuarter = currentQuarter + 1;
          if (nextQuarter >= 4) {
            // Move to Q1 of next year
            periodEndDate = new Date(now.getFullYear() + 1, 3, 0);
          } else {
            // Move to next quarter of same year
            periodEndDate = new Date(
              now.getFullYear(),
              (nextQuarter + 1) * 3,
              0
            );
          }
          submissionDate = new Date(periodEndDate);
          submissionDate.setDate(
            submissionDate.getDate() + vatFilingDaysAfterPeriod
          );
        }
      } else {
        return null;
      }

      const daysUntilDue = Math.floor(
        (submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        submissionDate,
        cycle,
        daysUntilDue,
      };
    }

    return null;
  };

  const calculateNextCorporateTaxSubmissionDate = (client) => {
    if (!client?.businessInfo?.corporateTaxDueDate) return null;
    const now = new Date();
    const dueDate = new Date(client.businessInfo.corporateTaxDueDate);

    // If due date has passed, calculate next year
    if (dueDate < now) {
      const nextDueDate = new Date(dueDate);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

      return {
        submissionDate: nextDueDate,
        daysUntilDue: Math.floor((nextDueDate - now) / (1000 * 60 * 60 * 24)),
      };
    }

    return {
      submissionDate: dueDate,
      daysUntilDue: Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)),
    };
  };

  const nextVATSubmission = client
    ? calculateNextVATSubmissionDate(client)
    : null;
  const nextCorporateTaxSubmission = client
    ? calculateNextCorporateTaxSubmissionDate(client)
    : null;

  const createPackageMutation = useMutation({
    mutationFn: packagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", id] });
      setShowPackageForm(false);
      resetPackageForm();
      toast({
        title: "Success",
        description: "Package created successfully",
        type: "success",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => packagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", id] });
      setShowPackageForm(false);
      setEditingPackage(null);
      resetPackageForm();
      toast({
        title: "Success",
        description: "Package updated successfully",
        type: "success",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: packagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", id] });
      toast({
        title: "Success",
        description: "Package deleted successfully",
        type: "success",
      });
    },
  });

  const resetPackageForm = () => {
    setEditingPackage(null);
  };

  const handlePackageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      clientId: id,
      name: formData.get("name"),
      type: formData.get("type"),
      billingFrequency: formData.get("billingFrequency") || undefined,
      contractValue: parseFloat(formData.get("contractValue")),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate") || undefined,
      status: formData.get("status"),
    };

    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage._id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  if (clientLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading...</div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Client not found</p>
          <Button onClick={() => navigate("/clients")} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/clients")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2 py-10">
              <h1 className="text-2xl font-bold text-gray-900">
                {client.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-3"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Shield className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="business-info">
              <Building2 className="h-4 w-4 mr-2" />
              Business Info
            </TabsTrigger>
            <TabsTrigger value="partners-managers">
              <Users className="h-4 w-4 mr-2" />
              Partners & Managers
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3">
            {/* Contact Person & EmaraTax Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Contact Person Details */}
              <Card>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Contact Person</p>
                        <p className="text-sm font-medium">
                          {client.contactPerson || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">
                          {client.email || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium">
                          {client.phone || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            client.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {client.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* EmaraTax Credentials */}
              <EmaraTaxCredentials
                clientId={id}
                credentials={client.emaraTaxAccount}
              />
            </div>

            {/* Next Tax Submissions */}
            {(nextVATSubmission || nextCorporateTaxSubmission) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Next Tax Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nextVATSubmission && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Next VAT Submission
                          </h3>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Date:</span>{" "}
                          {formatDateDDMMYYYY(nextVATSubmission.submissionDate)}
                        </p>
                        {nextVATSubmission.period && (
                          <p className="text-xs text-gray-500 mb-2">
                            Period:{" "}
                            {formatDateDDMMYYYY(
                              nextVATSubmission.period.startDate
                            )}{" "}
                            -{" "}
                            {formatDateDDMMYYYY(
                              nextVATSubmission.period.endDate
                            )}
                          </p>
                        )}
                        <Badge
                          variant={
                            nextVATSubmission.daysUntilDue <= 7
                              ? "error"
                              : nextVATSubmission.daysUntilDue <= 14
                              ? "warning"
                              : "info"
                          }
                          className="text-xs"
                        >
                          {nextVATSubmission.daysUntilDue < 0
                            ? `Overdue ${Math.abs(
                                nextVATSubmission.daysUntilDue
                              )} days`
                            : `${nextVATSubmission.daysUntilDue} days remaining`}
                        </Badge>
                      </div>
                    )}
                    {nextCorporateTaxSubmission && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="h-4 w-4 text-green-600" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Next Corporate Tax Submission
                          </h3>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Date:</span>{" "}
                          {formatDateDDMMYYYY(
                            nextCorporateTaxSubmission.submissionDate
                          )}
                        </p>
                        <Badge
                          variant={
                            nextCorporateTaxSubmission.daysUntilDue <= 7
                              ? "error"
                              : nextCorporateTaxSubmission.daysUntilDue <= 14
                              ? "warning"
                              : "info"
                          }
                          className="text-xs"
                        >
                          {nextCorporateTaxSubmission.daysUntilDue < 0
                            ? `Overdue ${Math.abs(
                                nextCorporateTaxSubmission.daysUntilDue
                              )} days`
                            : `${nextCorporateTaxSubmission.daysUntilDue} days remaining`}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts & Packages Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Alerts */}
              <div>
                <CompactAlerts clientId={id} />
              </div>

              {/* Packages Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-gray-900">
                    Packages
                  </h2>
                  <Button size="sm" onClick={() => setShowPackageForm(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {packagesLoading ? (
                  <Card>
                    <div className="p-4 text-center text-sm text-gray-500">
                      Loading packages...
                    </div>
                  </Card>
                ) : packages.length === 0 ? (
                  <Card>
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">No packages found</p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {packages.map((pkg) => (
                      <Card key={pkg._id}>
                        <div className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-semibold">
                              {pkg.name}
                            </h3>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingPackage(pkg);
                                  setShowPackageForm(true);
                                }}
                                title="Edit package"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Delete this package?")) {
                                    deletePackageMutation.mutate(pkg._id);
                                  }
                                }}
                                className="text-red-600"
                                title="Delete package"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Type</span>
                              <p className="font-medium">{pkg.type}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Value</span>
                              <p className="font-medium">
                                ${pkg.contractValue?.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Status</span>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs mt-0.5 ${
                                  pkg.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {pkg.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Document Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentChecklist
                  clientId={id}
                  documents={client.documents || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Info Tab */}
          <TabsContent value="business-info" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BusinessInfoForm
                  clientId={id}
                  client={client}
                  businessInfo={client.businessInfo}
                  aiExtractedFields={
                    client.businessInfo?.aiExtractedFields || []
                  }
                  verifiedFields={client.businessInfo?.verifiedFields || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partners & Managers Tab */}
          <TabsContent value="partners-managers" className="space-y-3">
            <PartnersManagers
              clientId={id}
              partners={client.partners || []}
              managers={client.managers || []}
            />
          </TabsContent>
        </Tabs>

        {/* Package Form Dialog */}
        <Dialog open={showPackageForm} onOpenChange={setShowPackageForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? "Edit Package" : "Add New Package"}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? "Update package information below."
                  : "Fill in the details to create a new package for this client."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePackageSubmit} className="space-y-4">
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
                  defaultValue={editingPackage?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    defaultValue={editingPackage?.type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="RECURRING">Recurring</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="billingFrequency"
                    className="text-sm font-medium text-gray-700"
                  >
                    Billing Frequency
                  </label>
                  <select
                    id="billingFrequency"
                    name="billingFrequency"
                    defaultValue={editingPackage?.billingFrequency}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="contractValue"
                  className="text-sm font-medium text-gray-700"
                >
                  Contract Value *
                </label>
                <input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingPackage?.contractValue}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      editingPackage?.startDate
                        ? new Date(editingPackage.startDate)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="endDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    End Date
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={
                      editingPackage?.endDate
                        ? new Date(editingPackage.endDate)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  defaultValue={editingPackage?.status || "ACTIVE"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageForm(false);
                    resetPackageForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createPackageMutation.isPending ||
                    updatePackageMutation.isPending
                  }
                >
                  {createPackageMutation.isPending ||
                  updatePackageMutation.isPending
                    ? "Saving..."
                    : editingPackage
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

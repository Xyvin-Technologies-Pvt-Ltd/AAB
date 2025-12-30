import { useState, useCallback, memo } from "react";
import { Edit2, Save, X, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/ui/button";
import { useBusinessInfoUpdate } from "@/api/queries/clientQueries";
import { formatDateDDMonthYear } from "@/utils/dateFormat";
import { useToast } from "@/hooks/useToast";

// Helper function to calculate VAT submission cycle months
const getVATCycleMonths = (businessInfo) => {
  if (!businessInfo) return null;

  // Use tax periods if available
  if (businessInfo.vatTaxPeriods && businessInfo.vatTaxPeriods.length > 0) {
    const periods = businessInfo.vatTaxPeriods;
    const sortedPeriods = [...periods].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    // Extract months from periods
    const months = sortedPeriods.map((period) => {
      const startDate = new Date(period.startDate);
      return startDate.getMonth(); // 0-11
    });

    // Get unique months and sort
    const uniqueMonths = [...new Set(months)].sort((a, b) => a - b);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return uniqueMonths.map((month) => monthNames[month]).join(" • ");
  }

  // Fallback to cycle-based calculation
  if (businessInfo.vatReturnCycle === "MONTHLY") {
    return "Jan • Feb • Mar • Apr • May • Jun • Jul • Aug • Sep • Oct • Nov • Dec";
  } else if (businessInfo.vatReturnCycle === "QUARTERLY") {
    // Determine starting month from first period if available, otherwise default to Jan
    let startMonth = 0; // January by default

    if (businessInfo.vatTaxPeriods && businessInfo.vatTaxPeriods.length > 0) {
      const firstPeriod = businessInfo.vatTaxPeriods[0];
      const startDate = new Date(firstPeriod.startDate);
      startMonth = startDate.getMonth();
    }

    // Quarterly cycles: Jan-Apr-Jul-Oct, Feb-May-Aug-Nov, or Mar-Jun-Sep-Dec
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (startMonth === 0) {
      return "Jan • Apr • Jul • Oct";
    } else if (startMonth === 1) {
      return "Feb • May • Aug • Nov";
    } else if (startMonth === 2) {
      return "Mar • Jun • Sep • Dec";
    } else {
      // Default to Jan-Apr-Jul-Oct
      return "Jan • Apr • Jul • Oct";
    }
  }

  return null;
};

// Memoized FieldWrapper component to prevent unnecessary re-renders
const FieldWrapper = memo(({ field, label, type = "text", showCopy = false, formData, isEditing, handleFieldChange, handleCopy, copiedField }) => {
  const value = formData[field];
  const displayValue =
    type === "date" && value ? formatDateDDMonthYear(value) : value;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {isEditing ? (
        <>
          {type === "textarea" ? (
            <textarea
              key={`textarea-${field}`}
              value={formData[field] || ""}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          ) : type === "date" ? (
            <input
              key={`date-${field}`}
              type="date"
              value={
                formData[field]
                  ? new Date(formData[field]).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          ) : type === "select" ? (
            <select
              key={`select-${field}`}
              value={formData[field] || ""}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          ) : (
            <input
              key={`input-${field}`}
              type={type}
              value={formData[field] || ""}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        </>
      ) : (
        <div className="px-3 py-2 text-sm text-gray-900 min-h-[36px] flex items-center justify-between bg-white border border-gray-200 rounded-lg">
          <span className={!displayValue ? "text-gray-400" : ""}>
            {displayValue || "Not set"}
          </span>
          {showCopy && displayValue && (
            <button
              onClick={() => handleCopy(value, label)}
              className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copiedField === label ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

FieldWrapper.displayName = "FieldWrapper";

export const BusinessInfoForm = ({
  clientId,
  client,
  businessInfo,
  aiExtractedFields = [],
  verifiedFields = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: client?.name || "",
    nameArabic: client?.nameArabic || "",
    address: businessInfo?.address || "",
    emirate: businessInfo?.emirate || "",
    trn: businessInfo?.trn || "",
    ctrn: businessInfo?.ctrn || "",
    vatReturnCycle: businessInfo?.vatReturnCycle || "",
    corporateTaxDueDate: businessInfo?.corporateTaxDueDate || "",
    licenseNumber: businessInfo?.licenseNumber || "",
    licenseStartDate: businessInfo?.licenseStartDate || "",
    licenseExpiryDate: businessInfo?.licenseExpiryDate || "",
    remarks: businessInfo?.remarks || "",
  });

  const vatCycleMonths = getVATCycleMonths(businessInfo);

  const updateMutation = useBusinessInfoUpdate();

  const handleCopy = async (text, fieldName) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied",
        description: `${fieldName} copied to clipboard`,
        type: "success",
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy",
        type: "error",
      });
    }
  };

  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    const updateData = {
      ...formData,
      corporateTaxDueDate: formData.corporateTaxDueDate || null,
      licenseStartDate: formData.licenseStartDate || null,
      licenseExpiryDate: formData.licenseExpiryDate || null,
    };

    try {
      await updateMutation.mutateAsync({ clientId, data: updateData });
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: client?.name || "",
      nameArabic: client?.nameArabic || "",
      address: businessInfo?.address || "",
      emirate: businessInfo?.emirate || "",
      trn: businessInfo?.trn || "",
      ctrn: businessInfo?.ctrn || "",
      vatReturnCycle: businessInfo?.vatReturnCycle || "",
      corporateTaxDueDate: businessInfo?.corporateTaxDueDate || "",
      licenseNumber: businessInfo?.licenseNumber || "",
      licenseStartDate: businessInfo?.licenseStartDate || "",
      licenseExpiryDate: businessInfo?.licenseExpiryDate || "",
      remarks: businessInfo?.remarks || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">
          Business Information
        </h3>
        {!isEditing ? (
          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldWrapper
          field="name"
          label="Legal Name (English)"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="nameArabic"
          label="Legal Name (Arabic)"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="address"
          label="Address"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="emirate"
          label="Emirate"
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="trn"
          label="TRN"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="ctrn"
          label="CTRN"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <div className="space-y-1">
          <FieldWrapper
            field="vatReturnCycle"
            label="VAT Return Cycle"
            type="select"
            formData={formData}
            isEditing={isEditing}
            handleFieldChange={handleFieldChange}
            handleCopy={handleCopy}
            copiedField={copiedField}
          />
          {!isEditing && vatCycleMonths && (
            <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600">
              <span className="text-xs text-gray-500">Cycle months: </span>
              {vatCycleMonths}
            </div>
          )}
        </div>
        <FieldWrapper
          field="corporateTaxDueDate"
          label="Corporate Tax Due Date"
          type="date"
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="licenseNumber"
          label="License Number"
          showCopy={true}
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="licenseStartDate"
          label="License Start Date"
          type="date"
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
        <FieldWrapper
          field="licenseExpiryDate"
          label="License Expiry Date"
          type="date"
          formData={formData}
          isEditing={isEditing}
          handleFieldChange={handleFieldChange}
          handleCopy={handleCopy}
          copiedField={copiedField}
        />
      </div>
      <FieldWrapper
        field="remarks"
        label="Remarks"
        type="textarea"
        formData={formData}
        isEditing={isEditing}
        handleFieldChange={handleFieldChange}
        handleCopy={handleCopy}
        copiedField={copiedField}
      />
    </div>
  );
};

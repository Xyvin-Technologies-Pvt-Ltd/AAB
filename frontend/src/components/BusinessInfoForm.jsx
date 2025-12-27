import { useState } from 'react';
import { Sparkles, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { useBusinessInfoUpdate } from '@/api/queries/clientQueries';

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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return uniqueMonths.map((month) => monthNames[month]).join(' • ');
  }

  // Fallback to cycle-based calculation
  if (businessInfo.vatReturnCycle === 'MONTHLY') {
    return 'Jan • Feb • Mar • Apr • May • Jun • Jul • Aug • Sep • Oct • Nov • Dec';
  } else if (businessInfo.vatReturnCycle === 'QUARTERLY') {
    // Determine starting month from first period if available, otherwise default to Jan
    let startMonth = 0; // January by default
    
    if (businessInfo.vatTaxPeriods && businessInfo.vatTaxPeriods.length > 0) {
      const firstPeriod = businessInfo.vatTaxPeriods[0];
      const startDate = new Date(firstPeriod.startDate);
      startMonth = startDate.getMonth();
    }

    // Quarterly cycles: Jan-Apr-Jul-Oct, Feb-May-Aug-Nov, or Mar-Jun-Sep-Dec
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    if (startMonth === 0) {
      return 'Jan • Apr • Jul • Oct';
    } else if (startMonth === 1) {
      return 'Feb • May • Aug • Nov';
    } else if (startMonth === 2) {
      return 'Mar • Jun • Sep • Dec';
    } else {
      // Default to Jan-Apr-Jul-Oct
      return 'Jan • Apr • Jul • Oct';
    }
  }

  return null;
};

export const BusinessInfoForm = ({ clientId, client, businessInfo, aiExtractedFields = [], verifiedFields = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: client?.name || '',
    nameArabic: client?.nameArabic || '',
    address: businessInfo?.address || '',
    emirate: businessInfo?.emirate || '',
    trn: businessInfo?.trn || '',
    ctrn: businessInfo?.ctrn || '',
    vatReturnCycle: businessInfo?.vatReturnCycle || '',
    corporateTaxDueDate: businessInfo?.corporateTaxDueDate || '',
    licenseNumber: businessInfo?.licenseNumber || '',
    licenseStartDate: businessInfo?.licenseStartDate || '',
    licenseExpiryDate: businessInfo?.licenseExpiryDate || '',
    remarks: businessInfo?.remarks || '',
  });

  const vatCycleMonths = getVATCycleMonths(businessInfo);

  const updateMutation = useBusinessInfoUpdate();

  const isAiExtracted = (field) => {
    return aiExtractedFields.includes(`businessInfo.${field}`) || aiExtractedFields.includes(field);
  };

  const isVerified = (field) => {
    return verifiedFields.includes(`businessInfo.${field}`) || verifiedFields.includes(field);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
      console.error('Update error:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: client?.name || '',
      nameArabic: client?.nameArabic || '',
      address: businessInfo?.address || '',
      emirate: businessInfo?.emirate || '',
      trn: businessInfo?.trn || '',
      ctrn: businessInfo?.ctrn || '',
      vatReturnCycle: businessInfo?.vatReturnCycle || '',
      corporateTaxDueDate: businessInfo?.corporateTaxDueDate || '',
      licenseNumber: businessInfo?.licenseNumber || '',
      licenseStartDate: businessInfo?.licenseStartDate || '',
      licenseExpiryDate: businessInfo?.licenseExpiryDate || '',
      remarks: businessInfo?.remarks || '',
    });
    setIsEditing(false);
  };

  const FieldWrapper = ({ field, label, type = 'text' }) => {
    const isAi = isAiExtracted(field);
    const isVer = isVerified(field);

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-2">
          {label}
          {isAi && (
            <Badge variant="info" className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          )}
          {isVer && (
            <Badge variant="success" className="text-xs flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </label>
        {isEditing ? (
          <>
            {type === 'textarea' ? (
              <textarea
                value={formData[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
              />
            ) : type === 'date' ? (
              <input
                type="date"
                value={formData[field] ? new Date(formData[field]).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : type === 'select' ? (
              <select
                value={formData[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            ) : (
              <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
          </>
        ) : (
          <div className="px-2 py-1 text-sm bg-gray-50 rounded text-gray-900 min-h-[28px] flex items-center">
            {formData[field] || <span className="text-gray-400">Not set</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center pb-2 border-b">
        <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>
        {!isEditing ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit All
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="h-3 w-3 mr-1" />
              Save All
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldWrapper field="name" label="Legal Name (English)" />
        <FieldWrapper field="nameArabic" label="Legal Name (Arabic)" />
        <FieldWrapper field="address" label="Address" />
        <FieldWrapper field="emirate" label="Emirate" />
        <FieldWrapper field="trn" label="TRN" />
        <FieldWrapper field="ctrn" label="CTRN" />
        <div className="space-y-1">
          <FieldWrapper field="vatReturnCycle" label="VAT Return Cycle" type="select" />
          {!isEditing && vatCycleMonths && (
            <div className="px-2 py-1 text-sm bg-gray-50 rounded text-gray-600">
              <span className="text-xs text-gray-500">Cycle months: </span>
              {vatCycleMonths}
            </div>
          )}
        </div>
        <FieldWrapper field="corporateTaxDueDate" label="Corporate Tax Due Date" type="date" />
        <FieldWrapper field="licenseNumber" label="License Number" />
        <FieldWrapper field="licenseStartDate" label="License Start Date" type="date" />
        <FieldWrapper field="licenseExpiryDate" label="License Expiry Date" type="date" />
      </div>
      <FieldWrapper field="remarks" label="Remarks" type="textarea" />
    </div>
  );
};


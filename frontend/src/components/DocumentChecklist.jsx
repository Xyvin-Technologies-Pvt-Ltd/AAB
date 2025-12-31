import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  User,
  Building2,
  Users,
  AlertCircle,
  CheckCircle,
  Link,
} from "lucide-react";
import { Button } from "@/ui/button";
import {
  useDocumentUpload,
  useDocumentVerify,
  useDocumentDelete,
  useDocumentReprocess,
} from "@/api/queries/clientQueries";
import { useAddPartner, useAddManager } from "@/api/queries/clientQueries";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateDDMonthYear } from "@/utils/dateFormat";
import { useToast } from "@/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

const COMPANY_DOCUMENT_CATEGORIES = [
  { value: "VAT_CERTIFICATE", label: "VAT Certificate", required: true },
  { value: "TRADE_LICENSE", label: "Trade License", required: true },
  {
    value: "CORPORATE_TAX_CERTIFICATE",
    label: "Corporate Tax Certificate",
    required: true,
  },
];

const getProcessingStatusIcon = (status) => {
  switch (status) {
    case "COMPLETED":
      return (
        <CheckCircle className="h-4 w-4 text-green-600" title="Completed" />
      );
    case "PROCESSING":
      return (
        <Loader2
          className="h-4 w-4 text-blue-600 animate-spin"
          title="Processing"
        />
      );
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-600" title="Failed" />;
    case "PENDING":
    default:
      return (
        <AlertCircle
          className="h-4 w-4 text-yellow-600"
          title="Not Processed"
        />
      );
  }
};

const DocumentCell = ({
  document,
  isUploading,
  onUpload,
  onView,
  onReprocess,
  onVerify,
  onDelete,
  reprocessingDocumentId,
  verifyMutation,
  deleteMutation,
}) => {
  if (!document) {
    // If onUpload is null, don't show upload button (linked manager)
    if (onUpload === null) {
      return (
        <div className="flex items-center justify-center">
          <span className="text-xs text-gray-400">No document</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={onUpload}
          disabled={isUploading}
          className="h-7 px-2 text-xs"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
        {document.url ? (
          <button
            onClick={onView}
            className="text-xs text-blue-600 underline cursor-pointer hover:text-blue-800 truncate"
            title={document.name}
          >
            {document.name}
          </button>
        ) : (
          <span className="text-xs text-gray-700 truncate">
            {document.name}
          </span>
        )}
        {getProcessingStatusIcon(document.processingStatus)}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onReprocess && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReprocess}
            disabled={reprocessingDocumentId === document._id}
            title="Reprocess document"
            className="h-7 w-7"
          >
            {reprocessingDocumentId === document._id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        {document.processingStatus === "COMPLETED" &&
          document.uploadStatus !== "VERIFIED" &&
          onVerify && (
            <Button
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={verifyMutation.isPending}
              title="Verify document"
              className="h-7 px-2 text-xs"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verify
                </>
              )}
            </Button>
          )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deleteMutation.isPending}
            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete document"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export const DocumentChecklist = ({
  clientId,
  documents = [],
  partners = [],
  managers = [],
  onExtractedDataUpdate,
}) => {
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [uploadingPersonId, setUploadingPersonId] = useState(null);
  const [showExtractedDataDialog, setShowExtractedDataDialog] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [reprocessingDocumentId, setReprocessingDocumentId] = useState(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [showPartnerCopyDialog, setShowPartnerCopyDialog] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    name: "",
    documentType: "PASSPORT",
  });
  const [managerFormData, setManagerFormData] = useState({
    name: "",
    documentType: "PASSPORT",
  });
  const [isPartnerManager, setIsPartnerManager] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [partnerFile, setPartnerFile] = useState(null);
  const [managerFile, setManagerFile] = useState(null);
  const [processingPartnerDocument, setProcessingPartnerDocument] =
    useState(null);
  const [processingManagerDocument, setProcessingManagerDocument] =
    useState(null);
  const fileInputRefs = useRef({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useDocumentUpload();
  const verifyMutation = useDocumentVerify();
  const deleteMutation = useDocumentDelete();
  const reprocessMutation = useDocumentReprocess();
  const addPartnerMutation = useAddPartner();
  const addManagerMutation = useAddManager();

  const handleFileSelect = (category, personId = null) => {
    const key = personId ? `${category}_${personId}` : category;
    const input = fileInputRefs.current[key];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = async (e, category, personId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategory(category);
    setUploadingPersonId(personId);
    try {
      await uploadMutation.mutateAsync({
        clientId,
        category,
        file,
        personId: personId || undefined, // Pass personId if provided
      });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingCategory(null);
      setUploadingPersonId(null);
      e.target.value = ""; // Reset input
    }
  };

  const handleReprocess = async (document) => {
    setReprocessingDocumentId(document._id);

    (async () => {
      try {
        await reprocessMutation.mutateAsync({
          clientId,
          documentId: document._id,
        });

        setTimeout(async () => {
          await queryClient.refetchQueries({ queryKey: ["client", clientId] });

          const clientData = queryClient.getQueryData(["client", clientId]);
          const updatedDocument = clientData?.data?.documents?.find(
            (doc) => doc._id === document._id
          );

          setReprocessingDocumentId(null);

          if (updatedDocument?.extractedData) {
            setCurrentDocument(updatedDocument);
            setExtractedData(updatedDocument.extractedData);
            setShowExtractedDataDialog(true);
            toast({
              title: "Success",
              description:
                "Document reprocessed successfully. Extracted data is ready.",
              type: "success",
            });
          } else if (updatedDocument?.processingStatus === "COMPLETED") {
            toast({
              title: "Success",
              description: "Document reprocessed successfully.",
              type: "success",
            });
          } else if (updatedDocument?.processingStatus === "FAILED") {
            toast({
              title: "Error",
              description:
                updatedDocument?.processingError ||
                "Document processing failed.",
              type: "error",
            });
          } else {
            toast({
              title: "Processing",
              description: "Document is being reprocessed. Please wait...",
              type: "info",
            });
          }
        }, 1000);
      } catch (error) {
        setReprocessingDocumentId(null);
        console.error("Reprocess error:", error);
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to reprocess document",
          type: "error",
        });
      }
    })();
  };

  const handleExtractedDataUpdate = async (updatedData) => {
    if (onExtractedDataUpdate) {
      await onExtractedDataUpdate(currentDocument, updatedData);
    }
    setShowExtractedDataDialog(false);
    setCurrentDocument(null);
    setExtractedData(null);
  };

  const handleVerify = async (documentId) => {
    try {
      await verifyMutation.mutateAsync({
        clientId,
        documentId,
        verifiedFields: [],
      });
    } catch (error) {
      console.error("Verify error:", error);
    }
  };

  const handleDelete = async (documentId) => {
    if (
      confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      try {
        await deleteMutation.mutateAsync({ clientId, documentId });
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const handleViewDocument = (document) => {
    window.open(document.url, "_blank");
  };

  const getDocumentForCategory = (category) => {
    return documents.find(
      (doc) => doc.category === category && !doc.assignedToPerson
    );
  };

  const handleAddPartner = async () => {
    if (!partnerFile) {
      toast({
        title: "Error",
        description: "Please upload a Passport or Emirates ID document",
        type: "error",
      });
      return;
    }

    try {
      // Upload the document first
      const category =
        partnerFormData.documentType === "PASSPORT"
          ? "PASSPORT_PARTNER"
          : "EMIRATES_ID_PARTNER";

      setProcessingPartnerDocument(true);
      await uploadMutation.mutateAsync({
        clientId,
        category,
        file: partnerFile,
        personId: undefined, // Will be set after partner is created
      });

      // Wait a bit for processing to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Poll for processing completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      let processedDocument = null;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const clientData = await queryClient.fetchQuery({
          queryKey: ["client", clientId],
        });

        const documents = clientData?.data?.documents || [];
        // Find the most recently uploaded document of this category
        const categoryDocs = documents
          .filter((doc) => doc.category === category)
          .sort(
            (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
          );

        processedDocument = categoryDocs[0];

        if (processedDocument?.processingStatus === "COMPLETED") {
          break;
        }
        if (processedDocument?.processingStatus === "FAILED") {
          throw new Error("Document processing failed");
        }
        attempts++;
      }

      if (
        !processedDocument ||
        processedDocument.processingStatus !== "COMPLETED"
      ) {
        throw new Error("Document processing timed out. Please try again.");
      }

      // Extract data from processed document
      const extractedData = processedDocument.extractedData || {};
      const extractedName =
        extractedData.name?.value ||
        extractedData.name ||
        partnerFormData.name ||
        "";

      if (!extractedName) {
        toast({
          title: "Warning",
          description:
            "Could not extract name from document. Please add partner manually.",
          type: "warning",
        });
        setProcessingPartnerDocument(false);
        setShowPartnerForm(false);
        setPartnerFile(null);
        setPartnerFormData({ name: "", documentType: "PASSPORT" });
        return;
      }

      // Prepare partner data with extracted information
      const partnerData = { name: extractedName.trim() };

      // Add passport data if it's a passport document
      if (
        partnerFormData.documentType === "PASSPORT" &&
        extractedData.passportNumber
      ) {
        partnerData.passport = {
          number:
            extractedData.passportNumber.value ||
            extractedData.passportNumber ||
            null,
          issueDate:
            extractedData.issueDate?.value || extractedData.issueDate || null,
          expiryDate:
            extractedData.expiryDate?.value || extractedData.expiryDate || null,
          verified: false,
        };
      }

      // Add Emirates ID data if it's an Emirates ID document
      if (
        partnerFormData.documentType === "EMIRATES_ID" &&
        extractedData.idNumber
      ) {
        partnerData.emiratesId = {
          number:
            extractedData.idNumber.value || extractedData.idNumber || null,
          issueDate:
            extractedData.issueDate?.value || extractedData.issueDate || null,
          expiryDate:
            extractedData.expiryDate?.value || extractedData.expiryDate || null,
          verified: false,
        };
      }

      // Create the partner
      const partnerResponse = await addPartnerMutation.mutateAsync({
        clientId,
        data: partnerData,
      });

      // Link the document to the newly created partner
      if (processedDocument?._id && partnerResponse?.data?.partners) {
        const newPartner = partnerResponse.data.partners.find(
          (p) => p.name === extractedName.trim()
        );
        if (newPartner?._id) {
          try {
            const { clientsApi } = await import("@/api/clients");
            await clientsApi.assignDocument(
              clientId,
              processedDocument._id,
              newPartner._id
            );
          } catch (assignError) {
            console.error("Failed to link document to partner:", assignError);
            // Don't fail the whole operation, just log the error
          }
        }
      }

      // Refetch to ensure sync
      await queryClient.invalidateQueries({ queryKey: ["client", clientId] });

      setPartnerFormData({ name: "", documentType: "PASSPORT" });
      setPartnerFile(null);
      setProcessingPartnerDocument(false);
      setShowPartnerForm(false);

      toast({
        title: "Success",
        description:
          "Partner added successfully with extracted data from document",
        type: "success",
      });
    } catch (error) {
      console.error("Add partner error:", error);
      setProcessingPartnerDocument(false);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to add partner",
        type: "error",
      });
    }
  };

  const handleAddManager = async () => {
    // If managerFormData has emiratesId or passport, it means it was copied from a partner
    if (
      managerFormData.emiratesId ||
      managerFormData.passport ||
      (isPartnerManager && selectedPartnerId)
    ) {
      // Handle copy from partner case
      if (!managerFormData.name || !managerFormData.name.trim()) {
        toast({
          title: "Error",
          description: "Manager name is required",
          type: "error",
        });
        return;
      }
      try {
        const managerData = {
          name: managerFormData.name.trim(),
        };

        // If linked to a partner, store the partner ID
        if (isPartnerManager && selectedPartnerId) {
          managerData.linkedPartnerId = selectedPartnerId;
        }

        // Copy passport and emirates ID data if they exist (from partner)
        if (managerFormData.emiratesId) {
          managerData.emiratesId = {
            number: managerFormData.emiratesId.number || null,
            issueDate: managerFormData.emiratesId.issueDate
              ? managerFormData.emiratesId.issueDate instanceof Date
                ? managerFormData.emiratesId.issueDate.toISOString()
                : managerFormData.emiratesId.issueDate
              : null,
            expiryDate: managerFormData.emiratesId.expiryDate
              ? managerFormData.emiratesId.expiryDate instanceof Date
                ? managerFormData.emiratesId.expiryDate.toISOString()
                : managerFormData.emiratesId.expiryDate
              : null,
            verified: managerFormData.emiratesId.verified || false,
          };
        }
        if (managerFormData.passport) {
          managerData.passport = {
            number: managerFormData.passport.number || null,
            issueDate: managerFormData.passport.issueDate
              ? managerFormData.passport.issueDate instanceof Date
                ? managerFormData.passport.issueDate.toISOString()
                : managerFormData.passport.issueDate
              : null,
            expiryDate: managerFormData.passport.expiryDate
              ? managerFormData.passport.expiryDate instanceof Date
                ? managerFormData.passport.expiryDate.toISOString()
                : managerFormData.passport.expiryDate
              : null,
            verified: managerFormData.passport.verified || false,
          };
        }

        await addManagerMutation.mutateAsync({
          clientId,
          data: managerData,
        });
        setManagerFormData({ name: "", documentType: "PASSPORT" });
        setManagerFile(null);
        setIsPartnerManager(false);
        setSelectedPartnerId(null);
        setShowManagerForm(false);
        setShowPartnerCopyDialog(false);
      } catch (error) {
        console.error("Add manager error:", error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to add manager",
          type: "error",
        });
      }
      return;
    }

    // Handle document upload case
    if (!managerFile) {
      toast({
        title: "Error",
        description: "Please upload a Passport or Emirates ID document",
        type: "error",
      });
      return;
    }

    try {
      // Upload the document first
      const category =
        managerFormData.documentType === "PASSPORT"
          ? "PASSPORT_MANAGER"
          : "EMIRATES_ID_MANAGER";

      setProcessingManagerDocument(true);
      await uploadMutation.mutateAsync({
        clientId,
        category,
        file: managerFile,
        personId: undefined, // Will be set after manager is created
      });

      // Wait a bit for processing to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Poll for processing completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      let processedDocument = null;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const clientData = await queryClient.fetchQuery({
          queryKey: ["client", clientId],
        });

        const documents = clientData?.data?.documents || [];
        // Find the most recently uploaded document of this category
        const categoryDocs = documents
          .filter((doc) => doc.category === category)
          .sort(
            (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
          );

        processedDocument = categoryDocs[0];

        if (processedDocument?.processingStatus === "COMPLETED") {
          break;
        }
        if (processedDocument?.processingStatus === "FAILED") {
          throw new Error("Document processing failed");
        }
        attempts++;
      }

      if (
        !processedDocument ||
        processedDocument.processingStatus !== "COMPLETED"
      ) {
        throw new Error("Document processing timed out. Please try again.");
      }

      // Extract data from processed document
      const extractedData = processedDocument.extractedData || {};
      const extractedName =
        extractedData.name?.value ||
        extractedData.name ||
        managerFormData.name ||
        "";

      if (!extractedName) {
        toast({
          title: "Warning",
          description:
            "Could not extract name from document. Please add manager manually.",
          type: "warning",
        });
        setProcessingManagerDocument(false);
        setShowManagerForm(false);
        setManagerFile(null);
        setIsPartnerManager(false);
        setSelectedPartnerId(null);
        setManagerFormData({ name: "", documentType: "PASSPORT" });
        return;
      }

      // Prepare manager data with extracted information
      const managerData = { name: extractedName.trim() };

      // Add passport data if it's a passport document
      if (
        managerFormData.documentType === "PASSPORT" &&
        extractedData.passportNumber
      ) {
        managerData.passport = {
          number:
            extractedData.passportNumber.value ||
            extractedData.passportNumber ||
            null,
          issueDate:
            extractedData.issueDate?.value || extractedData.issueDate || null,
          expiryDate:
            extractedData.expiryDate?.value || extractedData.expiryDate || null,
          verified: false,
        };
      }

      // Add Emirates ID data if it's an Emirates ID document
      if (
        managerFormData.documentType === "EMIRATES_ID" &&
        extractedData.idNumber
      ) {
        managerData.emiratesId = {
          number:
            extractedData.idNumber.value || extractedData.idNumber || null,
          issueDate:
            extractedData.issueDate?.value || extractedData.issueDate || null,
          expiryDate:
            extractedData.expiryDate?.value || extractedData.expiryDate || null,
          verified: false,
        };
      }

      // Create the manager
      const managerResponse = await addManagerMutation.mutateAsync({
        clientId,
        data: managerData,
      });

      // Link the document to the newly created manager
      if (processedDocument?._id && managerResponse?.data?.managers) {
        const newManager = managerResponse.data.managers.find(
          (m) => m.name === extractedName.trim()
        );
        if (newManager?._id) {
          try {
            const { clientsApi } = await import("@/api/clients");
            await clientsApi.assignDocument(
              clientId,
              processedDocument._id,
              newManager._id
            );
          } catch (assignError) {
            console.error("Failed to link document to manager:", assignError);
            // Don't fail the whole operation, just log the error
          }
        }
      }

      // Refetch to ensure sync
      await queryClient.invalidateQueries({ queryKey: ["client", clientId] });

      setManagerFormData({ name: "", documentType: "PASSPORT" });
      setManagerFile(null);
      setIsPartnerManager(false);
      setSelectedPartnerId(null);
      setProcessingManagerDocument(false);
      setShowManagerForm(false);
      setShowPartnerCopyDialog(false);

      toast({
        title: "Success",
        description:
          "Manager added successfully with extracted data from document",
        type: "success",
      });
    } catch (error) {
      console.error("Add manager error:", error);
      setProcessingManagerDocument(false);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to add manager",
        type: "error",
      });
    }
  };

  const handleCopyFromPartner = (partner) => {
    // Set up the new integrated flow
    setIsPartnerManager(true);
    setSelectedPartnerId(partner._id);

    // Copy partner data, ensuring dates are properly handled
    const copyEmiratesId = partner.emiratesId
      ? {
          number: partner.emiratesId.number || null,
          issueDate: partner.emiratesId.issueDate || null,
          expiryDate: partner.emiratesId.expiryDate || null,
          verified: partner.emiratesId.verified || false,
        }
      : null;

    const copyPassport = partner.passport
      ? {
          number: partner.passport.number || null,
          issueDate: partner.passport.issueDate || null,
          expiryDate: partner.passport.expiryDate || null,
          verified: partner.passport.verified || false,
        }
      : null;

    setManagerFormData({
      name: partner.name || "",
      emiratesId: copyEmiratesId,
      passport: copyPassport,
    });
    setShowPartnerCopyDialog(false);
    setShowManagerForm(true);
  };

  const handleSkipCopy = () => {
    setManagerFormData({ name: "", documentType: "PASSPORT" });
    setManagerFile(null);
    setShowPartnerCopyDialog(false);
    setShowManagerForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Company Details Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Details
          </h3>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Document
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Upload Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  File
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COMPANY_DOCUMENT_CATEGORIES.map((category) => {
                const document = getDocumentForCategory(category.value);
                const key = category.value;
                const isUploading =
                  uploadingCategory === category.value && !uploadingPersonId;

                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-900">
                          {category.label}
                        </span>
                        {category.required && (
                          <span className="text-[10px] text-red-500">*</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-gray-700">
                        {document?.uploadedAt
                          ? formatDateDDMonthYear(document.uploadedAt)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {document ? (
                        getProcessingStatusIcon(document.processingStatus)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {document ? (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-gray-400" />
                          {document.url ? (
                            <button
                              onClick={() => handleViewDocument(document)}
                              className="text-xs text-blue-600 underline cursor-pointer hover:text-blue-800 truncate max-w-[150px]"
                              title={document.name}
                            >
                              {document.name}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-700 truncate max-w-[150px]">
                              {document.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No file</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          ref={(el) => (fileInputRefs.current[key] = el)}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, category.value)}
                        />
                        {!document ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileSelect(category.value)}
                            disabled={isUploading}
                            className="h-7 px-2 text-xs"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </>
                            )}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReprocess(document)}
                              disabled={reprocessingDocumentId === document._id}
                              title="Reprocess document"
                              className="h-7 w-7"
                            >
                              {reprocessingDocumentId === document._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {document.processingStatus === "COMPLETED" &&
                              document.uploadStatus !== "VERIFIED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerify(document._id)}
                                  disabled={verifyMutation.isPending}
                                  title="Verify document"
                                  className="h-7 px-2 text-xs"
                                >
                                  {verifyMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Verify
                                    </>
                                  )}
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(document._id)}
                              disabled={deleteMutation.isPending}
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete document"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partners Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Partners
          </h3>
          <Button size="sm" onClick={() => setShowPartnerForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Partner
          </Button>
        </div>
        {partners.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-xs text-gray-500">No partners added yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Passport
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Emirates ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partners.map((partner) => {
                  const passportKey = `PASSPORT_PARTNER_${partner._id}`;
                  const emiratesIdKey = `EMIRATES_ID_PARTNER_${partner._id}`;
                  const isUploadingPassport =
                    uploadingCategory === "PASSPORT_PARTNER" &&
                    uploadingPersonId === partner._id;
                  const isUploadingEmiratesId =
                    uploadingCategory === "EMIRATES_ID_PARTNER" &&
                    uploadingPersonId === partner._id;

                  const passportDoc = documents.find(
                    (doc) =>
                      doc.category === "PASSPORT_PARTNER" &&
                      (!doc.assignedToPerson ||
                        doc.assignedToPerson?.toString() ===
                          partner._id?.toString())
                  );
                  const emiratesIdDoc = documents.find(
                    (doc) =>
                      doc.category === "EMIRATES_ID_PARTNER" &&
                      (!doc.assignedToPerson ||
                        doc.assignedToPerson?.toString() ===
                          partner._id?.toString())
                  );

                  return (
                    <tr key={partner._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-900">
                            {partner.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <input
                          ref={(el) =>
                            (fileInputRefs.current[passportKey] = el)
                          }
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleFileChange(e, "PASSPORT_PARTNER", partner._id)
                          }
                        />
                        <DocumentCell
                          document={passportDoc}
                          isUploading={isUploadingPassport}
                          onUpload={() =>
                            handleFileSelect("PASSPORT_PARTNER", partner._id)
                          }
                          onView={() => handleViewDocument(passportDoc)}
                          onReprocess={() => handleReprocess(passportDoc)}
                          onVerify={() => handleVerify(passportDoc._id)}
                          onDelete={() => handleDelete(passportDoc._id)}
                          reprocessingDocumentId={reprocessingDocumentId}
                          verifyMutation={verifyMutation}
                          deleteMutation={deleteMutation}
                        />
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <input
                          ref={(el) =>
                            (fileInputRefs.current[emiratesIdKey] = el)
                          }
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleFileChange(
                              e,
                              "EMIRATES_ID_PARTNER",
                              partner._id
                            )
                          }
                        />
                        <DocumentCell
                          document={emiratesIdDoc}
                          isUploading={isUploadingEmiratesId}
                          onUpload={() =>
                            handleFileSelect("EMIRATES_ID_PARTNER", partner._id)
                          }
                          onView={() => handleViewDocument(emiratesIdDoc)}
                          onReprocess={() => handleReprocess(emiratesIdDoc)}
                          onVerify={() => handleVerify(emiratesIdDoc._id)}
                          onDelete={() => handleDelete(emiratesIdDoc._id)}
                          reprocessingDocumentId={reprocessingDocumentId}
                          verifyMutation={verifyMutation}
                          deleteMutation={deleteMutation}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Managers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Managers
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setIsPartnerManager(false);
              setSelectedPartnerId(null);
              setShowManagerForm(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Manager
          </Button>
        </div>
        {managers.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-xs text-gray-500">No managers added yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Passport
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                    Emirates ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {managers.map((manager) => {
                  // Check if manager is linked to a partner
                  const linkedPartner = manager.linkedPartnerId
                    ? partners.find(
                        (p) =>
                          p._id?.toString() ===
                          manager.linkedPartnerId?.toString()
                      )
                    : null;

                  // If linked to partner, use partner's documents; otherwise use manager's documents
                  const passportDoc = linkedPartner
                    ? documents.find(
                        (doc) =>
                          doc.category === "PASSPORT_PARTNER" &&
                          (!doc.assignedToPerson ||
                            doc.assignedToPerson?.toString() ===
                              linkedPartner._id?.toString())
                      )
                    : documents.find(
                        (doc) =>
                          doc.category === "PASSPORT_MANAGER" &&
                          (!doc.assignedToPerson ||
                            doc.assignedToPerson?.toString() ===
                              manager._id?.toString())
                      );

                  const emiratesIdDoc = linkedPartner
                    ? documents.find(
                        (doc) =>
                          doc.category === "EMIRATES_ID_PARTNER" &&
                          (!doc.assignedToPerson ||
                            doc.assignedToPerson?.toString() ===
                              linkedPartner._id?.toString())
                      )
                    : documents.find(
                        (doc) =>
                          doc.category === "EMIRATES_ID_MANAGER" &&
                          (!doc.assignedToPerson ||
                            doc.assignedToPerson?.toString() ===
                              manager._id?.toString())
                      );

                  const passportKey = `PASSPORT_MANAGER_${manager._id}`;
                  const emiratesIdKey = `EMIRATES_ID_MANAGER_${manager._id}`;
                  const isUploadingPassport =
                    uploadingCategory === "PASSPORT_MANAGER" &&
                    uploadingPersonId === manager._id;
                  const isUploadingEmiratesId =
                    uploadingCategory === "EMIRATES_ID_MANAGER" &&
                    uploadingPersonId === manager._id;

                  return (
                    <tr key={manager._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-900">
                            {manager.name}
                          </span>
                          {linkedPartner && (
                            <Link
                              className="h-3.5 w-3.5 text-blue-600"
                              title="Linked to partner"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        {linkedPartner ? (
                          // Show partner's document (read-only, no upload)
                          <DocumentCell
                            document={passportDoc}
                            isUploading={false}
                            onUpload={null}
                            onView={() => handleViewDocument(passportDoc)}
                            onReprocess={() => handleReprocess(passportDoc)}
                            onVerify={() => handleVerify(passportDoc?._id)}
                            onDelete={null}
                            reprocessingDocumentId={reprocessingDocumentId}
                            verifyMutation={verifyMutation}
                            deleteMutation={deleteMutation}
                          />
                        ) : (
                          <>
                            <input
                              ref={(el) =>
                                (fileInputRefs.current[passportKey] = el)
                              }
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleFileChange(
                                  e,
                                  "PASSPORT_MANAGER",
                                  manager._id
                                )
                              }
                            />
                            <DocumentCell
                              document={passportDoc}
                              isUploading={isUploadingPassport}
                              onUpload={() =>
                                handleFileSelect(
                                  "PASSPORT_MANAGER",
                                  manager._id
                                )
                              }
                              onView={() => handleViewDocument(passportDoc)}
                              onReprocess={() => handleReprocess(passportDoc)}
                              onVerify={() => handleVerify(passportDoc?._id)}
                              onDelete={() => handleDelete(passportDoc?._id)}
                              reprocessingDocumentId={reprocessingDocumentId}
                              verifyMutation={verifyMutation}
                              deleteMutation={deleteMutation}
                            />
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        {linkedPartner ? (
                          // Show partner's document (read-only, no upload)
                          <DocumentCell
                            document={emiratesIdDoc}
                            isUploading={false}
                            onUpload={null}
                            onView={() => handleViewDocument(emiratesIdDoc)}
                            onReprocess={() => handleReprocess(emiratesIdDoc)}
                            onVerify={() => handleVerify(emiratesIdDoc?._id)}
                            onDelete={null}
                            reprocessingDocumentId={reprocessingDocumentId}
                            verifyMutation={verifyMutation}
                            deleteMutation={deleteMutation}
                          />
                        ) : (
                          <>
                            <input
                              ref={(el) =>
                                (fileInputRefs.current[emiratesIdKey] = el)
                              }
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleFileChange(
                                  e,
                                  "EMIRATES_ID_MANAGER",
                                  manager._id
                                )
                              }
                            />
                            <DocumentCell
                              document={emiratesIdDoc}
                              isUploading={isUploadingEmiratesId}
                              onUpload={() =>
                                handleFileSelect(
                                  "EMIRATES_ID_MANAGER",
                                  manager._id
                                )
                              }
                              onView={() => handleViewDocument(emiratesIdDoc)}
                              onReprocess={() => handleReprocess(emiratesIdDoc)}
                              onVerify={() => handleVerify(emiratesIdDoc?._id)}
                              onDelete={() => handleDelete(emiratesIdDoc?._id)}
                              reprocessingDocumentId={reprocessingDocumentId}
                              verifyMutation={verifyMutation}
                              deleteMutation={deleteMutation}
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Partner Dialog */}
      <Dialog open={showPartnerForm} onOpenChange={setShowPartnerForm}>
        <DialogContent className="sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle>Add Partner</DialogTitle>
            <DialogDescription>
              Upload a Passport or Emirates ID document. The system will extract
              the name and other details automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="partner-document-type"
                className="text-sm font-medium text-gray-700"
              >
                Document Type *
              </label>
              <select
                id="partner-document-type"
                value={partnerFormData.documentType}
                onChange={(e) =>
                  setPartnerFormData({
                    ...partnerFormData,
                    documentType: e.target.value,
                  })
                }
                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={processingPartnerDocument}
              >
                <option value="PASSPORT">Passport</option>
                <option value="EMIRATES_ID">Emirates ID</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="partner-file"
                className="text-sm font-medium text-gray-700"
              >
                Upload Document *
              </label>
              <input
                id="partner-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setPartnerFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={processingPartnerDocument}
              />
              {partnerFile && (
                <p className="text-xs text-gray-600">
                  Selected: {partnerFile.name}
                </p>
              )}
            </div>
            {processingPartnerDocument && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing document and extracting data...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPartnerForm(false);
                setPartnerFormData({ name: "", documentType: "PASSPORT" });
                setPartnerFile(null);
                setProcessingPartnerDocument(false);
              }}
              disabled={processingPartnerDocument}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddPartner}
              disabled={
                addPartnerMutation.isPending ||
                processingPartnerDocument ||
                !partnerFile
              }
            >
              {processingPartnerDocument ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : addPartnerMutation.isPending ? (
                "Adding..."
              ) : (
                "Add Partner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manager Dialog */}
      <Dialog open={showManagerForm} onOpenChange={setShowManagerForm}>
        <DialogContent className="sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
            <DialogDescription>
              {isPartnerManager && selectedPartnerId
                ? "Select a partner to copy their information. No document upload needed."
                : managerFormData.emiratesId || managerFormData.passport
                ? "Review the manager information copied from partner."
                : "Upload a Passport or Emirates ID document. The system will extract the name and other details automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Is Partner? Checkbox */}
            {partners.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPartnerManager}
                    onChange={(e) => {
                      setIsPartnerManager(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedPartnerId(null);
                        setManagerFormData({
                          name: "",
                          documentType: "PASSPORT",
                        });
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Is this manager also a partner?
                  </span>
                </label>

                {isPartnerManager && (
                  <div className="space-y-2 ml-6">
                    <label
                      htmlFor="partner-select"
                      className="text-sm font-medium text-gray-700"
                    >
                      Select Partner *
                    </label>
                    <select
                      id="partner-select"
                      value={selectedPartnerId || ""}
                      onChange={(e) => {
                        const partnerId = e.target.value;
                        setSelectedPartnerId(partnerId);
                        if (partnerId) {
                          const selectedPartner = partners.find(
                            (p) => p._id === partnerId
                          );
                          if (selectedPartner) {
                            const copyEmiratesId = selectedPartner.emiratesId
                              ? {
                                  number:
                                    selectedPartner.emiratesId.number || null,
                                  issueDate:
                                    selectedPartner.emiratesId.issueDate ||
                                    null,
                                  expiryDate:
                                    selectedPartner.emiratesId.expiryDate ||
                                    null,
                                  verified:
                                    selectedPartner.emiratesId.verified ||
                                    false,
                                }
                              : null;

                            const copyPassport = selectedPartner.passport
                              ? {
                                  number:
                                    selectedPartner.passport.number || null,
                                  issueDate:
                                    selectedPartner.passport.issueDate || null,
                                  expiryDate:
                                    selectedPartner.passport.expiryDate || null,
                                  verified:
                                    selectedPartner.passport.verified || false,
                                }
                              : null;

                            setManagerFormData({
                              name: selectedPartner.name || "",
                              emiratesId: copyEmiratesId,
                              passport: copyPassport,
                            });
                          }
                        }
                      }}
                      className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a partner...</option>
                      {partners.map((partner) => (
                        <option key={partner._id} value={partner._id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {isPartnerManager && selectedPartnerId ? (
              // Show form for copied partner data
              <div className="space-y-2">
                <label
                  htmlFor="manager-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Manager Name *
                </label>
                <input
                  id="manager-name"
                  type="text"
                  value={managerFormData.name}
                  onChange={(e) =>
                    setManagerFormData({
                      ...managerFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter manager name"
                />
              </div>
            ) : managerFormData.emiratesId || managerFormData.passport ? (
              // Show form for copied partner data (from old flow)
              <div className="space-y-2">
                <label
                  htmlFor="manager-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Manager Name *
                </label>
                <input
                  id="manager-name"
                  type="text"
                  value={managerFormData.name}
                  onChange={(e) =>
                    setManagerFormData({
                      ...managerFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter manager name"
                />
              </div>
            ) : (
              // Show document upload form
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="manager-document-type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Document Type *
                  </label>
                  <select
                    id="manager-document-type"
                    value={managerFormData.documentType}
                    onChange={(e) =>
                      setManagerFormData({
                        ...managerFormData,
                        documentType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={processingManagerDocument}
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="EMIRATES_ID">Emirates ID</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="manager-file"
                    className="text-sm font-medium text-gray-700"
                  >
                    Upload Document *
                  </label>
                  <input
                    id="manager-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setManagerFile(e.target.files?.[0] || null)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={processingManagerDocument}
                  />
                  {managerFile && (
                    <p className="text-xs text-gray-600">
                      Selected: {managerFile.name}
                    </p>
                  )}
                </div>
                {processingManagerDocument && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing document and extracting data...</span>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowManagerForm(false);
                setManagerFormData({ name: "", documentType: "PASSPORT" });
                setManagerFile(null);
                setIsPartnerManager(false);
                setSelectedPartnerId(null);
                setProcessingManagerDocument(false);
              }}
              disabled={processingManagerDocument}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddManager}
              disabled={
                addManagerMutation.isPending ||
                processingManagerDocument ||
                (!managerFile && !managerFormData.name) ||
                (isPartnerManager && !selectedPartnerId)
              }
            >
              {processingManagerDocument ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : addManagerMutation.isPending ? (
                "Adding..."
              ) : (
                "Add Manager"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Copy Dialog */}
      <Dialog
        open={showPartnerCopyDialog}
        onOpenChange={setShowPartnerCopyDialog}
      >
        <DialogContent className="sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle>Is any partner the same as manager?</DialogTitle>
            <DialogDescription className="text-xs">
              Select a partner to copy their information, or click "No" to add a
              new manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {partners.map((partner) => (
              <Button
                key={partner._id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleCopyFromPartner(partner)}
              >
                <User className="h-4 w-4 mr-2" />
                {partner.name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipCopy}
              size="sm"
            >
              No, Add New Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extracted Data Dialog */}
      {showExtractedDataDialog && extractedData && (
        <ExtractedDataDialog
          document={currentDocument}
          extractedData={extractedData}
          onClose={() => {
            setShowExtractedDataDialog(false);
            setCurrentDocument(null);
            setExtractedData(null);
          }}
          onUpdate={handleExtractedDataUpdate}
        />
      )}
    </div>
  );
};

// Extracted Data Dialog Component
const ExtractedDataDialog = ({
  document,
  extractedData,
  onClose,
  onUpdate,
}) => {
  const initialFormData = useMemo(() => {
    const data = {};
    if (extractedData) {
      Object.keys(extractedData).forEach((key) => {
        if (key === "_partners" || key === "_managerName") {
          return;
        }
        if (extractedData[key]?.value !== undefined) {
          data[key] = extractedData[key].value;
        } else if (
          typeof extractedData[key] !== "object" &&
          extractedData[key] !== null
        ) {
          data[key] = extractedData[key];
        }
      });
    }
    return data;
  }, [extractedData]);

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleSubmit = async () => {
    await onUpdate({
      businessInfo: formData,
    });
  };

  const renderField = (key, label, type = "text") => {
    const value = formData[key] || "";
    return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        {type === "date" ? (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) =>
              setFormData({ ...formData, [key]: e.target.value })
            }
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [key]: e.target.value })
            }
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Extracted Data - {document?.category?.replace(/_/g, " ")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review and edit the extracted data. Click OK to update the
            corresponding fields.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {[
            "TRADE_LICENSE",
            "VAT_CERTIFICATE",
            "CORPORATE_TAX_CERTIFICATE",
          ].includes(document?.category) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">
                Business Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {extractedData.licenseNumber &&
                  renderField("licenseNumber", "License Number")}
                {extractedData.licenseStartDate &&
                  renderField("licenseStartDate", "License Start Date", "date")}
                {extractedData.licenseExpiryDate &&
                  renderField(
                    "licenseExpiryDate",
                    "License Expiry Date",
                    "date"
                  )}
                {extractedData.tradeName &&
                  renderField("tradeName", "Trade Name")}
                {extractedData.businessName &&
                  renderField("businessName", "Business Name")}
                {extractedData.emirate && renderField("emirate", "Emirate")}
                {extractedData.vatNumber &&
                  renderField("vatNumber", "VAT Number")}
                {extractedData.vatRegistrationDate &&
                  renderField(
                    "vatRegistrationDate",
                    "VAT Registration Date",
                    "date"
                  )}
                {extractedData.corporateTaxNumber &&
                  renderField("corporateTaxNumber", "Corporate Tax Number")}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} size="sm">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

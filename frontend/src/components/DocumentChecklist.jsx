import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Loader2, Eye, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import {
  useDocumentUpload,
  useDocumentProcess,
  useDocumentVerify,
  useDocumentDelete,
} from '@/api/queries/clientQueries';

const DOCUMENT_CATEGORIES = [
  { value: 'TRADE_LICENSE', label: 'Trade License', required: true },
  { value: 'VAT_CERTIFICATE', label: 'VAT Certificate', required: true },
  { value: 'CORPORATE_TAX_CERTIFICATE', label: 'Corporate Tax Certificate', required: true },
  { value: 'EMIRATES_ID_PARTNER', label: 'Emirates ID (Partners)', required: false },
  { value: 'PASSPORT_PARTNER', label: 'Passport (Partners)', required: false },
  { value: 'EMIRATES_ID_MANAGER', label: 'Emirates ID (Manager)', required: false },
  { value: 'PASSPORT_MANAGER', label: 'Passport (Manager)', required: false },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'VERIFIED':
      return <Badge variant="success">Verified</Badge>;
    case 'UPLOADED':
      return <Badge variant="info">Uploaded</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
};

const getProcessingBadge = (status) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'PROCESSING':
      return (
        <Badge variant="info" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case 'FAILED':
      return <Badge variant="error">Failed</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="outline">Not Processed</Badge>;
  }
};

export const DocumentChecklist = ({ clientId, documents = [] }) => {
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const fileInputRefs = useRef({});

  const uploadMutation = useDocumentUpload();
  const processMutation = useDocumentProcess();
  const verifyMutation = useDocumentVerify();
  const deleteMutation = useDocumentDelete();

  const handleFileSelect = (category) => {
    const input = fileInputRefs.current[category];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = async (e, category) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategory(category);
    try {
      await uploadMutation.mutateAsync({
        clientId,
        category,
        file,
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingCategory(null);
      e.target.value = ''; // Reset input
    }
  };

  const handleProcess = async (documentId) => {
    try {
      await processMutation.mutateAsync({ clientId, documentId });
    } catch (error) {
      console.error('Process error:', error);
    }
  };

  const handleVerify = async (documentId) => {
    try {
      await verifyMutation.mutateAsync({ clientId, documentId, verifiedFields: [] });
    } catch (error) {
      console.error('Verify error:', error);
    }
  };

  const handleDelete = async (documentId) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync({ clientId, documentId });
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const getDocumentForCategory = (category) => {
    return documents.find((doc) => doc.category === category);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-semibold text-gray-700">Document Category</th>
              <th className="text-left p-3 font-semibold text-gray-700">Upload Status</th>
              <th className="text-left p-3 font-semibold text-gray-700">Processing Status</th>
              <th className="text-left p-3 font-semibold text-gray-700">File</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENT_CATEGORIES.map((category) => {
              const document = getDocumentForCategory(category.value);
              const isUploading = uploadingCategory === category.value;

              return (
                <tr key={category.value} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{category.label}</span>
                      {category.required && (
                        <span className="text-xs text-red-500">*</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {document ? getStatusBadge(document.uploadStatus) : <Badge variant="warning">Pending</Badge>}
                  </td>
                  <td className="p-3">
                    {document ? getProcessingBadge(document.processingStatus) : <Badge variant="outline">-</Badge>}
                    {document?.extractedData && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                        <Sparkles className="h-3 w-3" />
                        <span>AI Extracted</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {document ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{document.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {!document ? (
                        <>
                          <input
                            ref={(el) => (fileInputRefs.current[category.value] = el)}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, category.value)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileSelect(category.value)}
                            disabled={isUploading || uploadMutation.isPending}
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
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(document.url, '_blank')}
                            title="View document"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {document.processingStatus === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcess(document._id)}
                              disabled={processMutation.isPending}
                              title="Process document with AI"
                            >
                              {processMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Process
                                </>
                              )}
                            </Button>
                          )}
                          {document.processingStatus === 'COMPLETED' &&
                            document.uploadStatus !== 'VERIFIED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerify(document._id)}
                                disabled={verifyMutation.isPending}
                                title="Verify document"
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
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(document._id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete document"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
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
  );
};


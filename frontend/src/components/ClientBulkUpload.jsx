import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Upload, FileText, Download, Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/ui/badge';

export const ClientBulkUpload = ({ open, onOpenChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: (file) =>
      clientsApi.bulkUploadClients(file, (progress) => {
        setUploadProgress(progress);
      }),
    onSuccess: (data) => {
      const results = data.data || data;
      setUploadResults(results);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      
      if (results.success > 0) {
        toast({
          title: 'Upload Successful',
          description: `Successfully created ${results.success} client(s)`,
          type: 'success',
        });
      }
      
      if (results.failed > 0 || results.skipped > 0) {
        toast({
          title: 'Upload Completed with Issues',
          description: `${results.success} succeeded, ${results.failed} failed, ${results.skipped} skipped`,
          type: 'warning',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.message || 'Failed to upload CSV file',
        type: 'destructive',
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a CSV file',
          type: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setUploadResults(null);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
        type: 'destructive',
      });
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const template = `Client Name,Package name,Status,Emara Tax User Name,Password,VAT Return Month
Example Client 1,Accounting,Active,user1@example.com,Password123,Feb May Aug Nov
Example Client 2,Zero,Active,user2@example.com,Password456,Jan Apr Jul Oct
Example Client 3,VAT,Not Active,user3@example.com,Password789,Mar Jun Sep Dec`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResults(null);
    setUploadProgress(0);
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const isUploading = uploadMutation.isPending;
  const hasResults = uploadResults !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Clients</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple clients at once. Duplicate clients will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          {!hasResults && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center transition-colors hover:border-indigo-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : 'Click to select CSV file or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  CSV format: Client Name, Package name, Status, Emara Tax User Name, Password, VAT Return Month
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-indigo-600">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                    <span className="text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                )}
              </div>

              {/* Download Template */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Need a template?</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">Success</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{uploadResults.success}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold text-red-900">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{uploadResults.failed}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-semibold text-yellow-900">Skipped</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">{uploadResults.skipped}</p>
                </div>
              </div>

              {/* Errors List */}
              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full"
                  >
                    {showErrors ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide Errors ({uploadResults.errors.length})
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show Errors ({uploadResults.errors.length})
                      </>
                    )}
                  </Button>
                  {showErrors && (
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      <div className="space-y-2">
                        {uploadResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="p-2 bg-white rounded border border-gray-200 text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                Row {error.row}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{error.clientName}</p>
                                <p className="text-red-600 mt-0.5">{error.error}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {hasResults ? (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


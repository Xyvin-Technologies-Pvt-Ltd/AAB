import { useState } from "react";
import { Edit2, Trash2, User, FileText } from "lucide-react";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  useDeletePartner,
  useDeleteManager,
} from "@/api/queries/clientQueries";

export const PartnersManagers = ({
  clientId,
  partners = [],
  managers = [],
  documents = [],
}) => {
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const deletePartnerMutation = useDeletePartner();
  const deleteManagerMutation = useDeleteManager();

  const handleEdit = (person, role) => {
    setEditingPerson(person);
    setEditingRole(role);
    setShowEditDialog(true);
  };

  // Get documents linked to a person
  const getPersonDocuments = (personId, role) => {
    const passportCategory =
      role === "PARTNER" ? "PASSPORT_PARTNER" : "PASSPORT_MANAGER";
    const emiratesIdCategory =
      role === "PARTNER" ? "EMIRATES_ID_PARTNER" : "EMIRATES_ID_MANAGER";

    return {
      passport: documents.find(
        (doc) =>
          doc.category === passportCategory &&
          (!doc.assignedToPerson ||
            doc.assignedToPerson?.toString() === personId?.toString())
      ),
      emiratesId: documents.find(
        (doc) =>
          doc.category === emiratesIdCategory &&
          (!doc.assignedToPerson ||
            doc.assignedToPerson?.toString() === personId?.toString())
      ),
    };
  };

  const handleDelete = async (personId, role) => {
    try {
      if (role === "PARTNER") {
        await deletePartnerMutation.mutateAsync({ clientId, personId });
      } else {
        await deleteManagerMutation.mutateAsync({ clientId, personId });
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleViewDocument = (document) => {
    if (document?.url) {
      window.open(document.url, "_blank");
    }
  };

  const personDocs = editingPerson
    ? getPersonDocuments(editingPerson._id, editingRole)
    : null;

  // Component to render document row with filename and action
  const DocumentRow = ({ document, label, onView }) => {
    if (!document) {
      return (
        <div className="flex items-center py-1 px-2 text-xs text-gray-400">
          <span>{label}: -</span>
        </div>
      );
    }

    return (
      <div className="flex items-center py-1 px-2 hover:bg-gray-50 rounded">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-600 w-20 flex-shrink-0">
            {label}:
          </span>
          {document.url ? (
            <button
              onClick={() => onView(document)}
              className="text-xs text-blue-600 underline cursor-pointer hover:text-blue-800 truncate"
              title={document.name}
            >
              {document.name}
            </button>
          ) : (
            <span
              className="text-xs text-gray-900 truncate"
              title={document.name}
            >
              {document.name}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Partners Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Partners</h2>
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
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {partners.map((partner) => {
                  const personDocs = getPersonDocuments(partner._id, "PARTNER");
                  return (
                    <tr key={partner._id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-900">
                            {partner.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="space-y-0.5">
                          <DocumentRow
                            document={personDocs.passport}
                            label="Passport"
                            onView={handleViewDocument}
                          />
                          <DocumentRow
                            document={personDocs.emiratesId}
                            label="Emirates ID"
                            onView={handleViewDocument}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(partner, "PARTNER")}
                            className="h-7 w-7"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete ${partner.name}?`)) {
                                handleDelete(partner._id, "PARTNER");
                              }
                            }}
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
          <h2 className="text-base font-bold text-gray-900">Managers</h2>
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
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {managers.map((manager) => {
                  const personDocs = getPersonDocuments(manager._id, "MANAGER");
                  return (
                    <tr key={manager._id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-900">
                            {manager.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="space-y-0.5">
                          <DocumentRow
                            document={personDocs.passport}
                            label="Passport"
                            onView={handleViewDocument}
                          />
                          <DocumentRow
                            document={personDocs.emiratesId}
                            label="Emirates ID"
                            onView={handleViewDocument}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(manager, "MANAGER")}
                            className="h-7 w-7"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete ${manager.name}?`)) {
                                handleDelete(manager._id, "MANAGER");
                              }
                            }}
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Dialog - Shows document links */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Edit {editingPerson?.name} -{" "}
              {editingRole === "PARTNER" ? "Partner" : "Manager"}
            </DialogTitle>
            <DialogDescription>
              View and manage documents linked to this{" "}
              {editingRole?.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          {personDocs && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Passport Document
                </h3>
                {personDocs.passport ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {personDocs.passport.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDocument(personDocs.passport)}
                      className="h-8 w-8"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No passport document uploaded
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Emirates ID Document
                </h3>
                {personDocs.emiratesId ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {personDocs.emiratesId.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDocument(personDocs.emiratesId)}
                      className="h-8 w-8"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No Emirates ID document uploaded
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Extracted Information
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  {editingPerson?.emiratesId && (
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Emirates ID:</span>{" "}
                      {editingPerson.emiratesId.number || "N/A"}
                      {editingPerson.emiratesId.expiryDate && (
                        <span className="ml-2">
                          (Expires:{" "}
                          {new Date(
                            editingPerson.emiratesId.expiryDate
                          ).toLocaleDateString()}
                          )
                        </span>
                      )}
                    </div>
                  )}
                  {editingPerson?.passport && (
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Passport:</span>{" "}
                      {editingPerson.passport.number || "N/A"}
                      {editingPerson.passport.expiryDate && (
                        <span className="ml-2">
                          (Expires:{" "}
                          {new Date(
                            editingPerson.passport.expiryDate
                          ).toLocaleDateString()}
                          )
                        </span>
                      )}
                    </div>
                  )}
                  {!editingPerson?.emiratesId && !editingPerson?.passport && (
                    <p className="text-xs text-gray-500">
                      No extracted information available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { invoicesApi } from "@/api/invoices";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import {
  ArrowLeft,
  Edit2,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { LoaderWithText } from "@/components/Loader";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/currencyFormat";
import { formatTimeFromSeconds } from "@/utils/dateFormat";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

const defaultLineItem = () => ({ description: "", quantity: 1, rate: 0, amount: 0 });

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [editLineItems, setEditLineItems] = useState([]);
  const [editIssueDate, setEditIssueDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTaxRate, setEditTaxRate] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editTimeEntryIds, setEditTimeEntryIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editSuggestedHourlyRate, setEditSuggestedHourlyRate] = useState(200);

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });
  const { data: unbilledData } = useQuery({
    queryKey: ["invoices", "unbilled-time-entries", invoiceData?.data?.clientId?._id || invoiceData?.data?.clientId],
    queryFn: () => invoicesApi.getUnbilledTimeEntries(invoiceData?.data?.clientId?._id || invoiceData?.data?.clientId),
    enabled: !!invoiceData?.data && editMode && !!invoiceData.data.clientId,
  });

  const invoice = invoiceData?.data;
  const clients = clientsData?.data?.clients || [];
  const unbilledEntries = unbilledData?.data ?? [];
  const unbilledArray = Array.isArray(unbilledEntries) ? unbilledEntries : [];
  const currentTimeEntryIds = (invoice?.timeEntries || []).map((e) => (typeof e === "object" && e?._id ? e._id : e));
  const allTimeEntryOptions = [...(invoice?.timeEntries || []), ...unbilledArray].filter(
    (e, i, arr) => arr.findIndex((x) => (x._id || x) === (e._id || e)) === i
  );

  const linkedEntriesInEdit = useMemo(
    () => allTimeEntryOptions.filter((e) => editTimeEntryIds.includes(e._id || e)),
    [allTimeEntryOptions, editTimeEntryIds]
  );
  const totalHoursLinkedInEdit = useMemo(() => {
    const totalSeconds = linkedEntriesInEdit.reduce((sum, e) => sum + (e.minutesSpent || 0), 0);
    return totalSeconds / 3600;
  }, [linkedEntriesInEdit]);
  const editSuggestedChargeFromRate = totalHoursLinkedInEdit * (Number(editSuggestedHourlyRate) || 0);
  const editSuggestedChargeFromEmployees = useMemo(
    () =>
      linkedEntriesInEdit.reduce((sum, e) => {
        const hours = (e.minutesSpent || 0) / 3600;
        const emp = e.employeeId;
        const hourly =
          emp?.hourlyRate ??
          (emp?.monthlyWorkingHours > 0 && emp?.monthlyCost != null
            ? emp.monthlyCost / emp.monthlyWorkingHours
            : 0);
        return sum + hours * hourly;
      }, 0),
    [linkedEntriesInEdit]
  );

  const startEdit = () => {
    if (!invoice) return;
    setEditLineItems(
      (invoice.lineItems || []).length > 0
        ? invoice.lineItems.map((item) => ({
            description: item.description || "",
            quantity: item.quantity ?? 1,
            rate: item.rate ?? 0,
            amount: item.amount ?? 0,
          }))
        : [defaultLineItem()]
    );
    setEditIssueDate(invoice.issueDate ? format(new Date(invoice.issueDate), "yyyy-MM-dd") : "");
    setEditDueDate(invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "");
    setEditTaxRate(invoice.taxRate ?? 0);
    setEditDiscount(invoice.discount ?? 0);
    setEditNotes(invoice.notes || "");
    setEditTimeEntryIds(currentTimeEntryIds);
    setEditMode(true);
  };

  const updateEditLineItem = (index, field, value) => {
    setEditLineItems((prev) => {
      const next = prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      });
      return next;
    });
  };

  const addEditLineItem = () => setEditLineItems((prev) => [...prev, defaultLineItem()]);
  const removeEditLineItem = (idx) => {
    setEditLineItems((prev) => (prev.length <= 1 ? [defaultLineItem()] : prev.filter((_, i) => i !== idx)));
  };

  const applyEditSuggestionToFirstLine = () => {
    const amount =
      editSuggestedChargeFromRate > 0 ? editSuggestedChargeFromRate : editSuggestedChargeFromEmployees;
    if (amount <= 0 || totalHoursLinkedInEdit <= 0) return;
    const rate =
      (Number(editSuggestedHourlyRate) || 0) ||
      (editSuggestedChargeFromEmployees / totalHoursLinkedInEdit) ||
      0;
    setEditLineItems((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        description: next[0].description || "Professional services (based on time entries)",
        quantity: Math.round(totalHoursLinkedInEdit * 100) / 100,
        rate: Math.round(rate * 100) / 100,
        amount: Math.round(amount * 100) / 100,
      };
      return next;
    });
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => invoicesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setEditMode(false);
      toast({ title: "Success", description: "Invoice updated", type: "success" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update invoice",
        type: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => invoicesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Success", description: "Status updated", type: "success" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        type: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setShowDeleteConfirm(false);
      navigate("/invoices");
      toast({ title: "Success", description: "Invoice deleted", type: "success" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete invoice",
        type: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    const validLines = editLineItems.filter(
      (item) => (item.description || "").trim() && (Number(item.amount) || 0) >= 0
    );
    if (validLines.length === 0) {
      toast({ title: "Validation", description: "At least one line item required", type: "destructive" });
      return;
    }
    updateMutation.mutate({
      lineItems: validLines.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      timeEntries: editTimeEntryIds,
      issueDate: editIssueDate ? new Date(editIssueDate).toISOString() : undefined,
      dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      taxRate: Number(editTaxRate) || 0,
      discount: Number(editDiscount) || 0,
      notes: editNotes.trim(),
    });
  };

  if (isLoading || !invoice) {
    return (
      <AppLayout>
        <div className="py-12">
          <LoaderWithText text={isLoading ? "Loading invoice..." : "Invoice not found"} />
        </div>
      </AppLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
  const isDraft = invoice.status === "DRAFT";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <p className="text-gray-600 mt-1">
                {invoice.clientId?.name || "—"} ·{" "}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDraft && !editMode && (
              <>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
            {invoice.status === "DRAFT" && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => statusMutation.mutate("SENT")}
                disabled={statusMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Mark as Sent
              </Button>
            )}
            {invoice.status === "SENT" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => statusMutation.mutate("PAID")}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
            )}
            {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => statusMutation.mutate("CANCELLED")}
                disabled={statusMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel invoice
              </Button>
            )}
          </div>
        </div>

        <Card className="p-6">
          {!editMode ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Client</p>
                  <p className="font-medium text-gray-900">{invoice.clientId?.name || "—"}</p>
                  {invoice.clientId?.email && (
                    <p className="text-sm text-gray-600">{invoice.clientId.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Issue date</p>
                  <p className="font-medium text-gray-900">
                    {invoice.issueDate ? format(new Date(invoice.issueDate), "dd MMM yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Due date</p>
                  <p className="font-medium text-gray-900">
                    {invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "—"}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(invoice.lineItems || []).map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description || "—"}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity ?? 0}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">{formatCurrency(item.rate ?? 0)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-6">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {(invoice.taxRate || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({invoice.taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                  )}
                  {(invoice.discount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium">-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {(invoice.timeEntries || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Linked time entries</h3>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {invoice.timeEntries.map((entry) => {
                      const e = typeof entry === "object" ? entry : { _id: entry };
                      return (
                        <div
                          key={e._id}
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700"
                        >
                          <span>
                            {e.date && format(new Date(e.date), "dd MMM yyyy")} —{" "}
                            {e.taskId?.name || e.miscellaneousDescription || "—"} —{" "}
                            {e.employeeId?.name || "—"}
                          </span>
                          <span className="font-mono text-gray-600">
                            {formatTimeFromSeconds(e.minutesSpent, true)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Edit invoice</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue date</label>
                  <input
                    type="date"
                    value={editIssueDate}
                    onChange={(e) => setEditIssueDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editTaxRate}
                    onChange={(e) => setEditTaxRate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {linkedEntriesInEdit.length > 0 && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Potential charge suggestion</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Total hours (linked)</p>
                      <p className="text-lg font-semibold text-gray-900">{totalHoursLinkedInEdit.toFixed(2)} h</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">Suggested rate (AED/hr)</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={editSuggestedHourlyRate}
                        onChange={(e) => setEditSuggestedHourlyRate(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Suggested charge</p>
                      <p className="text-lg font-semibold text-indigo-700">
                        {formatCurrency(editSuggestedChargeFromRate)}
                      </p>
                    </div>
                    {editSuggestedChargeFromEmployees > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">From employee cost</p>
                        <p className="text-lg font-semibold text-gray-700">
                          {formatCurrency(editSuggestedChargeFromEmployees)}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={applyEditSuggestionToFirstLine}>
                    Use suggestion as first line item
                  </Button>
                </div>
              )}

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Line items</label>
                  <Button variant="outline" size="sm" onClick={addEditLineItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add row
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Description</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 w-24">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 w-28">Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 w-28">Amount</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editLineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateEditLineItem(index, "description", e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateEditLineItem(index, "quantity", e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateEditLineItem(index, "rate", e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateEditLineItem(index, "amount", e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeEditLineItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Linked time entries</label>
                <p className="text-xs text-gray-500 mb-2">
                  Time entries are shown on the invoice for reference. Changing them here only affects which entries are
                  linked; totals are from line items above.
                </p>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {allTimeEntryOptions.map((entry) => {
                    const entryId = entry._id || entry;
                    const isSelected = editTimeEntryIds.includes(entryId);
                    return (
                      <label
                        key={entryId}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setEditTimeEntryIds((prev) =>
                              isSelected ? prev.filter((x) => x !== entryId) : [...prev, entryId]
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {entry.date && format(new Date(entry.date), "dd MMM yyyy")} —{" "}
                          {entry.taskId?.name || entry.miscellaneousDescription || "—"} —{" "}
                          {entry.employeeId?.name || "—"} — {formatTimeFromSeconds(entry.minutesSpent, true)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this draft invoice? Linked time entries will be unlinked and can be
              used in another invoice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

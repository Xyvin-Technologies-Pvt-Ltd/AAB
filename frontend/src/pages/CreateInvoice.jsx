import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { invoicesApi } from "@/api/invoices";
import { clientsApi } from "@/api/clients";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { LoaderWithText } from "@/components/Loader";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/currencyFormat";
import { formatTimeFromSeconds } from "@/utils/dateFormat";
import { format } from "date-fns";

const defaultLineItem = () => ({ description: "", quantity: 1, rate: 0, amount: 0 });

export const CreateInvoice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState([]);
  const [lineItems, setLineItems] = useState([defaultLineItem()]);
  const [issueDate, setIssueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return format(d, "yyyy-MM-dd");
  });
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [suggestedHourlyRate, setSuggestedHourlyRate] = useState(200);

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });

  const { data: unbilledData, isLoading: loadingUnbilled } = useQuery({
    queryKey: ["invoices", "unbilled-time-entries", clientId],
    queryFn: () => invoicesApi.getUnbilledTimeEntries(clientId),
    enabled: !!clientId,
  });

  const clients = clientsData?.data?.clients || [];
  const unbilledEntries = unbilledData?.data ?? [];
  const unbilledArray = Array.isArray(unbilledEntries) ? unbilledEntries : [];

  const toggleTimeEntry = (id) => {
    setSelectedTimeEntryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllTimeEntries = () => {
    if (selectedTimeEntryIds.length === unbilledArray.length) {
      setSelectedTimeEntryIds([]);
    } else {
      setSelectedTimeEntryIds(unbilledArray.map((e) => e._id));
    }
  };

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => {
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

  const addLineItem = () => setLineItems((prev) => [...prev, defaultLineItem()]);
  const removeLineItem = (index) => {
    setLineItems((prev) => (prev.length <= 1 ? [defaultLineItem()] : prev.filter((_, i) => i !== index)));
  };

  const applySuggestionToFirstLine = () => {
    const amount = suggestedChargeFromRate > 0 ? suggestedChargeFromRate : suggestedChargeFromEmployees;
    if (amount <= 0) return;
    setLineItems((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        description: next[0].description || "Professional services (based on time entries)",
        quantity: Math.round(totalHoursFromEntries * 100) / 100,
        rate: (Number(suggestedHourlyRate) || 0) || (suggestedChargeFromEmployees / totalHoursFromEntries) || 0,
        amount: Math.round(amount * 100) / 100,
      };
      return next;
    });
  };

  const { subtotal, taxAmount, total } = useMemo(() => {
    const sub = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const tax = (sub * (Number(taxRate) || 0)) / 100;
    const tot = Math.max(0, sub + tax - (Number(discount) || 0));
    return { subtotal: sub, taxAmount: tax, total: tot };
  }, [lineItems, taxRate, discount]);

  const selectedEntries = useMemo(
    () => unbilledArray.filter((e) => selectedTimeEntryIds.includes(e._id)),
    [unbilledArray, selectedTimeEntryIds]
  );
  const totalHoursFromEntries = useMemo(() => {
    const totalSeconds = selectedEntries.reduce((sum, e) => sum + (e.minutesSpent || 0), 0);
    return totalSeconds / 3600;
  }, [selectedEntries]);
  const suggestedChargeFromRate = totalHoursFromEntries * (Number(suggestedHourlyRate) || 0);
  const suggestedChargeFromEmployees = useMemo(() => {
    return selectedEntries.reduce((sum, e) => {
      const hours = (e.minutesSpent || 0) / 3600;
      const emp = e.employeeId;
      const hourly =
        emp?.hourlyRate ??
        (emp?.monthlyWorkingHours > 0 && emp?.monthlyCost != null
          ? emp.monthlyCost / emp.monthlyWorkingHours
          : 0);
      return sum + hours * hourly;
    }, 0);
  }, [selectedEntries]);

  const createMutation = useMutation({
    mutationFn: (payload) => invoicesApi.create(payload),
    onSuccess: (res) => {
      const inv = res?.data;
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      if (inv?._id) navigate(`/invoices/${inv._id}`);
      toast({
        title: "Success",
        description: "Invoice created successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create invoice",
        type: "destructive",
      });
    },
  });

  const handleSubmit = (status) => {
    if (!clientId) {
      toast({ title: "Validation", description: "Please select a client", type: "destructive" });
      return;
    }
    const validLines = lineItems.filter(
      (item) => (item.description || "").trim() && (Number(item.amount) || 0) >= 0
    );
    if (validLines.length === 0) {
      toast({ title: "Validation", description: "Add at least one line item with description and amount", type: "destructive" });
      return;
    }
    if (!issueDate || !dueDate) {
      toast({ title: "Validation", description: "Issue date and due date are required", type: "destructive" });
      return;
    }
    const payload = {
      clientId,
      lineItems: validLines.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      timeEntries: selectedTimeEntryIds,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      taxRate: Number(taxRate) || 0,
      discount: Number(discount) || 0,
      notes: notes.trim(),
      status: status === "SENT" ? "SENT" : "DRAFT",
    };
    createMutation.mutate(payload);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-gray-600 mt-1">Select a client, attach time entries, and add line items</p>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setSelectedTimeEntryIds([]);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {clientId && (
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Unbilled time entries (optional)</label>
                {unbilledArray.length > 0 && (
                  <Button variant="outline" size="sm" onClick={selectAllTimeEntries}>
                    {selectedTimeEntryIds.length === unbilledArray.length ? "Deselect all" : "Select all"}
                  </Button>
                )}
              </div>
              {loadingUnbilled ? (
                <LoaderWithText text="Loading time entries..." />
              ) : unbilledArray.length === 0 ? (
                <p className="text-sm text-gray-500">No unbilled time entries for this client.</p>
              ) : (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {unbilledArray.map((entry) => (
                    <label
                      key={entry._id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTimeEntryIds.includes(entry._id)}
                        onChange={() => toggleTimeEntry(entry._id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 flex-1">
                        {entry.date && format(new Date(entry.date), "dd MMM yyyy")} —{" "}
                        {entry.taskId?.name || entry.miscellaneousDescription || "—"} —{" "}
                        {entry.employeeId?.name || "—"} — {formatTimeFromSeconds(entry.minutesSpent, true)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedEntries.length > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Potential charge suggestion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Total hours (selected)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {totalHoursFromEntries.toFixed(2)} h
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">Suggested rate (AED/hr)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={suggestedHourlyRate}
                    onChange={(e) => setSuggestedHourlyRate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Suggested charge (rate × hours)</p>
                  <p className="text-lg font-semibold text-indigo-700">
                    {formatCurrency(suggestedChargeFromRate)}
                  </p>
                </div>
                {suggestedChargeFromEmployees > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Based on employee cost</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {formatCurrency(suggestedChargeFromEmployees)}
                    </p>
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={applySuggestionToFirstLine}>
                Use suggestion as first line item
              </Button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Line items *</label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
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
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          placeholder="Description"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, "rate", e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(index, "amount", e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => removeLineItem(index)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (amount)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Payment terms, instructions..."
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleSubmit("DRAFT")}
              disabled={createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit("SENT")}
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? "Creating..." : "Create & Send"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/invoices")}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

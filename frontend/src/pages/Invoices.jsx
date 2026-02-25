import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { invoicesApi } from "@/api/invoices";
import { clientsApi } from "@/api/clients";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Plus, Filter, FileText } from "lucide-react";
import { LoaderWithText } from "@/components/Loader";
import { Pagination } from "@/components/Pagination";
import { formatCurrency } from "@/utils/currencyFormat";
import { format } from "date-fns";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

export const Invoices = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    clientId: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", filters, page],
    queryFn: () =>
      invoicesApi.getAll({
        page,
        limit,
        clientId: filters.clientId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });

  const invoices = invoicesData?.data?.invoices || [];
  const pagination = invoicesData?.data?.pagination;
  const clients = clientsData?.data?.clients || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">Create and manage client invoices</p>
          </div>
          <Button onClick={() => navigate("/invoices/create")} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Card>
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {(filters.clientId || filters.status || filters.startDate || filters.endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    clientId: "",
                    status: "",
                    startDate: "",
                    endDate: "",
                  })
                }
              >
                Clear filters
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={filters.clientId}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, clientId: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All clients</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || "Unnamed"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, status: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, startDate: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, endDate: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-12">
              <LoaderWithText text="Loading invoices..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Issue date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Due date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          No invoices found. Create your first invoice to get started.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const clientName = inv.clientId?.name ?? "—";
                        const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                        return (
                          <tr
                            key={inv._id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/invoices/${inv._id}`)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{clientName}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {inv.issueDate ? format(new Date(inv.issueDate), "dd MMM yyyy") : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(inv.total)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
                              >
                                {config.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/invoices/${inv._id}`);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <Pagination pagination={pagination} onPageChange={setPage} />
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

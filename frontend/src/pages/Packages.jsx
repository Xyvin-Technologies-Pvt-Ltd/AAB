import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { packagesApi } from '@/api/packages';
import { Card } from '@/ui/card';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { LoaderWithText } from '@/components/Loader';

export const Packages = () => {
  const navigate = useNavigate();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll({ limit: 100 }),
  });

  const packages = packagesData?.data?.packages || [];

  const handleRowClick = (pkg) => {
    if (pkg.clientId?._id || pkg.clientId) {
      const clientId = typeof pkg.clientId === 'object' ? pkg.clientId._id : pkg.clientId;
      navigate(`/clients/${clientId}`);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Packages</h1>
          <p className="text-xs text-gray-600 mt-0.5">View all client packages</p>
        </div>

        {isLoading ? (
          <Card>
            <div className="p-12">
              <LoaderWithText text="Loading packages..." />
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Monthly Revenue
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-2 py-8 text-center">
                        <p className="text-xs text-gray-500">No packages found</p>
                      </td>
                    </tr>
                  ) : (
                    packages.map((pkg) => (
                      <tr
                        key={pkg._id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(pkg)}
                      >
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{pkg.name}</div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-xs text-gray-600">{pkg.clientId?.name || '-'}</div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-xs text-gray-600">{pkg.type}</div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-xs text-gray-600">
                            {pkg.monthlyRevenue?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              pkg.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : pkg.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {pkg.status}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};


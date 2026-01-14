import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? [];

  // 🔹 Filter state (syncs with backend)
  const { data, setData, get, processing } = useForm({
    order_id: filters.order_id || '',
    status: filters.status || '',
    from: filters.from || '',
    to: filters.to || '',
  });

  const submitFilters = (e) => {
    e.preventDefault();
    get(route('payments.index'), {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const resetFilters = () => {
    setData({
      order_id: '',
      status: '',
      from: '',
      to: '',
    });

    get(route('payments.index'), {
      preserveScroll: true,
      preserveState: false,
    });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Payments" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Payments</h1>

        {/* 🔍 Filters */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-5 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Order ID
            </label>
            <input
              type="text"
              value={data.order_id}
              onChange={(e) => setData('order_id', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
              placeholder="ORD-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={data.status}
              onChange={(e) => setData('status', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            >
              <option value="">All</option>
              <option value="finished">Finished</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={data.from}
              onChange={(e) => setData('from', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              value={data.to}
              onChange={(e) => setData('to', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={processing}
              className="w-full rounded bg-indigo-600 text-white py-2 text-sm hover:bg-indigo-700"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded border py-2 text-sm hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </form>

        {/* 📋 Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="12" className="px-4 py-6 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              )}

              {rows.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{payment.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {payment.order_id}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ${Number(payment.amount).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium
                        ${
                          payment.status === 'finished'
                            ? 'bg-green-100 text-green-700'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {payment.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {new Date(payment.created_at).toLocaleString('sv-SE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {payments.links?.length > 1 && (
          <>
            <div className="mt-6 flex justify-center gap-1 flex-wrap">
              {payments.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url ?? '#'}
                  preserveScroll
                  className={`px-3 py-1 text-sm rounded border
                    ${
                      link.active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }
                    ${!link.url && 'opacity-50 cursor-not-allowed'}
                  `}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </div>

            <p className="mt-3 text-sm text-gray-600 text-center">
              Page {payments.current_page} of {payments.last_page}
            </p>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const page = usePage()

  /* Filters (sync with backend) */
  const { data, setData, get, processing } = useForm({
    order_id: filters.order_id || '',
    status: filters.status || '',
    from: filters.from || '',
    to: filters.to || '',
  })
  const { csrf_token } = usePage().props

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('payments.index'), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  const resetFilters = () => {
    setData({
      order_id: '',
      status: '',
      from: '',
      to: '',
    })

    get(route('payments.index'), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  /* EXPORT */
  const exportPayments = async (format) => {
    const response = await fetch(route('payments.export'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf_token,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        from: data.from,
        to: data.to,
        format,
      }),
    })

    const result = await response.json()
    console.log(result);
  }



  return (
    <AuthenticatedLayout>
      <Head title="Payments" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          Payments
        </h1>

        {/* SUMMARY + EXPORT */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportPayments('csv')}
            className="rounded bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => exportPayments('xlsx')}
            className="rounded bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
          >
            Export XLSX
          </button>

          <button
            type="button"
            onClick={() => exportPayments('json')}
            className="rounded bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
          >
            Export JSON
          </button>
        </div>

        {/* FILTERS */}
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

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Provider</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              )}

              {rows.map(payment => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{payment.id}</td>
                  <td className="px-4 py-3 font-medium">{payment.order_id}</td>
                  <td className="px-4 py-3 font-medium">${payment.price}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium
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
                  <td className="px-4 py-3 font-medium">
                    {payment.provider}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
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
  )
}

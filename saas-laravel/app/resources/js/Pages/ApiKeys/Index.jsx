import { useForm, Head, Link, usePage, router } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Plus, SlidersHorizontal, RotateCcw, Key } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ApiKeys({ keys, filters = {} }) {
  const { t } = useTranslation()
  const { flash } = usePage().props
  const rows = keys.data ?? []

  const { data, setData, get, processing } = useForm({
    hash: filters.hash || '',
    environment: filters.environment || '',
    status: filters.status || '',
  })

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('api-keys.index'), { preserveScroll: true })
  }

  const resetFilters = () => {
    setData({ hash: '', environment: '', status: '' })
    router.get(route('api-keys.index'), {}, {
      preserveScroll: true,
      preserveState: false,
    })
  }

  const generateKey = () => {
    router.post(route('api-keys.store'), {}, {
      preserveScroll: true,
    })
  }

  return (
    <AuthenticatedLayout>
      <Head title={t('apiKeys.title')} />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t('apiKeys.title')}</h1>
          <button
            type="button"
            onClick={generateKey}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} />
            {t('apiKeys.generate')}
          </button>
        </div>

        {flash?.generated_api_key && (
          <div className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <div className="font-medium">{t('apiKeys.generatedTitle')}</div>
            <div className="mt-2 break-all font-mono text-xs">
              {flash.generated_api_key}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-4 items-end"
        >
          <input
            type="text"
            placeholder={t('apiKeys.filters.hash')}
            value={data.hash}
            onChange={(e) => setData('hash', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <select
            value={data.environment}
            onChange={(e) => setData('environment', e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="">{t('apiKeys.filters.allEnvironments')}</option>
            <option value="test">{t('common.badges.test')}</option>
            <option value="live">{t('common.badges.live')}</option>
          </select>

          <select
            value={data.status}
            onChange={(e) => setData('status', e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="">{t('apiKeys.filters.allStatuses')}</option>
            <option value="active">{t('common.badges.active')}</option>
            <option value="inactive">{t('common.badges.expired')}</option>
          </select>

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <SlidersHorizontal size={14} strokeWidth={2} />
              {t('common.actions.filter')}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={14} strokeWidth={2} />
              {t('common.actions.reset')}
            </button>
          </div>
        </form>

        {/* SUMMARY */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            {t('apiKeys.table.showing', { from: keys.from ?? 0, to: keys.to ?? 0, total: keys.total })}
          </div>

          <div>
            {t('apiKeys.table.page', { current: keys.current_page, last: keys.last_page })}
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">{t('apiKeys.table.keyHash')}</th>
                <th className="px-4 py-3 text-left">{t('apiKeys.table.environment')}</th>
                <th className="px-4 py-3 text-left">{t('apiKeys.table.status')}</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Key size={32} strokeWidth={1.25} />
                      <span className="text-sm font-medium">{t('apiKeys.table.noKeys')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((key) => (
                  <tr key={key.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      {key.hash}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold capitalize
                          ${
                            key.environment === 'live'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                      >
                        {key.environment === 'live' ? t('common.badges.live') : t('common.badges.test')}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium
                          ${
                            key.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {key.status === 'active' ? t('common.badges.active') : t('common.badges.expired')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {keys.links?.length > 1 && (
          <div className="flex justify-center gap-1 flex-wrap">
            {keys.links.map((link, index) => (
              <Link
                key={index}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 text-sm rounded border
                  ${
                    link.active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white hover:bg-gray-100'
                  }
                  ${!link.url && 'opacity-50 cursor-not-allowed'}
                `}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}

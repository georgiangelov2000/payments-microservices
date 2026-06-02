import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, router, useForm, usePage } from '@inertiajs/react'

function StatusPill({ done }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
        done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {done ? 'Ready' : 'Pending'}
    </span>
  )
}

export default function Onboarding({
  subscription,
  apiKeys,
  providers,
  gatewayPublicEndpoint,
}) {
  const { flash } = usePage().props
  const hasApiKey = apiKeys.length > 0
  const providerOptions = providers.map((provider) => provider.alias)

  const { data, setData, post, processing, errors } = useForm({
    api_key: flash?.generated_api_key || '',
    provider: providerOptions[0] || 'stripe',
  })

  const generateApiKey = () => {
    router.post(route('onboarding.api-key'), {}, { preserveScroll: true })
  }

  const submitTestPayment = (event) => {
    event.preventDefault()
    post(route('onboarding.test-payment'), { preserveScroll: true })
  }

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold text-gray-800">
          Merchant Onboarding
        </h2>
      }
    >
      <Head title="Onboarding" />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Account</h3>
              <StatusPill done />
            </div>
            <p className="mt-2 text-sm text-gray-600">Merchant user is registered.</p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Subscription</h3>
              <StatusPill done={Boolean(subscription)} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {subscription
                ? `${subscription.name} · $${subscription.monthly_fee}/mo`
                : 'No active plan'}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">API Key</h3>
              <StatusPill done={hasApiKey} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {hasApiKey ? `${apiKeys.length} key(s) created` : 'Generate one gateway key.'}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Providers</h3>
              <StatusPill done={providers.length > 0} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {providers.map((provider) => provider.name).join(', ') || 'No providers'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gateway API Key</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Generate a key for merchant-to-gateway requests.
                </p>
              </div>
              <button
                type="button"
                onClick={generateApiKey}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Generate key
              </button>
            </div>

            {flash?.generated_api_key && (
              <div className="mt-4 rounded border border-green-200 bg-green-50 p-4">
                <div className="text-sm font-medium text-green-900">New API key</div>
                <div className="mt-2 break-all font-mono text-xs text-green-950">
                  {flash.generated_api_key}
                </div>
              </div>
            )}

            <div className="mt-4 rounded bg-gray-50 p-4">
              <div className="text-xs font-medium uppercase text-gray-500">Payment endpoint</div>
              <div className="mt-2 break-all font-mono text-sm text-gray-900">
                POST {gatewayPublicEndpoint}
              </div>
            </div>

            {subscription && (
              <div className="mt-4 rounded bg-gray-50 p-4">
                <div className="text-xs font-medium uppercase text-gray-500">Current billing period</div>
                <div className="mt-2 text-sm text-gray-900">
                  {subscription.current_period_transactions} transactions · ${subscription.current_period_volume}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Plan includes {subscription.included_transactions} monthly transactions, then {subscription.transaction_fee_percent}% + ${subscription.transaction_fee_fixed} per transaction.
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-white p-5">
            <h3 className="text-lg font-semibold text-gray-900">Create Test Payment</h3>
            <form onSubmit={submitTestPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">API key</label>
                <input
                  type="text"
                  value={data.api_key}
                  onChange={(event) => setData('api_key', event.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 text-sm"
                  placeholder="Paste generated key"
                />
                {errors.api_key && <p className="mt-1 text-sm text-red-600">{errors.api_key}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <select
                  value={data.provider}
                  onChange={(event) => setData('provider', event.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 text-sm"
                >
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
                {errors.provider && <p className="mt-1 text-sm text-red-600">{errors.provider}</p>}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                Create sandbox checkout
              </button>
            </form>

            {flash?.test_payment && (
              <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-900">
                  Payment #{flash.test_payment.payment_id} created
                </div>
                <a
                  href={flash.test_payment.payment_url}
                  className="mt-2 block break-all font-mono text-xs text-blue-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {flash.test_payment.payment_url}
                </a>
              </div>
            )}

            {flash?.test_payment_error && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
                <div className="text-sm font-medium text-red-900">Payment test failed</div>
                <div className="mt-2 break-all font-mono text-xs text-red-800">
                  {flash.test_payment_error}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

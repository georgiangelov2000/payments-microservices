
import i18n from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, useForm } from '@inertiajs/react'

export default function Form() {
  const { data, setData, post, processing, errors, reset } = useForm({
    subject: '',
    message: '',
  })

  const submit = (e) => {
    e.preventDefault()
    post(route('support.store'), {
      onSuccess: () => reset(),
    })
  }

  return (
    <AuthenticatedLayout>
      <Head title={i18n.t('generated.contacts_Form.contactSupport')} />

      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">{i18n.t('generated.contacts_Form.contactSupport')}</h1>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={submit} className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{i18n.t('generated.contacts_Form.subject')}</label>
              <input
                type="text"
                value={data.subject}
                onChange={e => setData('subject', e.target.value)}
                className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder={i18n.t('generated.contacts_Form.shortSummaryOfYourQuestion')}
              />
              {errors.subject && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.subject}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{i18n.t('generated.contacts_Form.message')}</label>
              <textarea
                rows="5"
                value={data.message}
                onChange={e => setData('message', e.target.value)}
                className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder={i18n.t('generated.contacts_Form.describeYourIssueOrQuestionInDetail')}
              />
              {errors.message && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={processing}
                className={`px-4 py-2 rounded text-white font-medium
                  ${
                    processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {processing ? i18n.t('generated.common.sending') : i18n.t('generated.common.sendMessage')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

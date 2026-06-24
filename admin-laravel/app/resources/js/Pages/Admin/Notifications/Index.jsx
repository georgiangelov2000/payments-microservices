import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { fmtDate } from '@/utils';
import { Mail, Save } from 'lucide-react';

import i18n from '@/i18n';
function StatusPill({ value }) {
    const styles = {
        sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        failed: 'border-red-200 bg-red-50 text-red-700',
        pending: 'border-amber-200 bg-amber-50 text-amber-700',
        skipped: 'border-slate-200 bg-slate-50 text-slate-600',
    };

    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${styles[value] ?? styles.pending}`}>{value}</span>;
}

function TemplateForm({ template, label }) {
    const { data, setData, put, processing } = useForm({
        enabled: template.enabled,
        subject: template.subject,
        body: template.body,
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                put(route('admin.notifications.templates.update', template.event_type), { preserveScroll: true });
            }}
            className="rounded-lg border border-slate-200 bg-white p-4"
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="font-mono text-xs text-slate-400">{template.event_type}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={data.enabled} onChange={(e) => setData('enabled', e.target.checked)} />{i18n.t('generated.notifications_Index.enabled')}</label>
            </div>
            <input value={data.subject} onChange={(e) => setData('subject', e.target.value)} className="mt-3 w-full rounded-lg border-slate-300 text-sm" />
            <textarea value={data.body} onChange={(e) => setData('body', e.target.value)} rows="5" className="mt-2 w-full rounded-lg border-slate-300 font-mono text-xs" />
            <button disabled={processing} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                <Save size={13} />{i18n.t('generated.notifications_Index.saveTemplate')}</button>
        </form>
    );
}

export default function AdminNotificationsIndex({ settings, events, templates, deliveries }) {
    const defaultEvents = Object.entries(settings.default_events ?? {}).filter(([, enabled]) => enabled).map(([event]) => event);
    const { data, setData, put, processing } = useForm({
        enabled: settings.enabled,
        max_recipients: settings.max_recipients,
        retry_attempts: settings.retry_attempts,
        default_events: defaultEvents,
    });

    const toggleDefaultEvent = (event) => setData(
        'default_events',
        data.default_events.includes(event)
            ? data.default_events.filter((item) => item !== event)
            : [...data.default_events, event],
    );

    return (
        <AdminLayout title={i18n.t('generated.notifications_Index.emailNotifications')}>
            <Head title={i18n.t('generated.notifications_Index.emailNotifications')} />

            <div className="space-y-6 p-6">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('admin.notifications.settings.update'), { preserveScroll: true });
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">{i18n.t('generated.notifications_Index.emailNotificationControls')}</h1>
                            <p className="mt-1 text-sm text-slate-500">{i18n.t('generated.notifications_Index.globalDefaultsApplyToNewMerchantNotificationSettings')}</p>
                        </div>
                        <button disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            <Save size={15} />{i18n.t('generated.notifications_Index.saveDefaults')}</button>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <input type="checkbox" checked={data.enabled} onChange={(e) => setData('enabled', e.target.checked)} />{i18n.t('generated.notifications_Index.emailNotificationsEnabledGlobally')}</label>
                        <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.maxRecipients')}</span>
                            <input type="number" min="1" max="20" value={data.max_recipients} onChange={(e) => setData('max_recipients', e.target.value)} className="w-full rounded-lg border-slate-300 text-sm" />
                        </label>
                        <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.retryAttempts')}</span>
                            <input type="number" min="1" max="10" value={data.retry_attempts} onChange={(e) => setData('retry_attempts', e.target.value)} className="w-full rounded-lg border-slate-300 text-sm" />
                        </label>
                    </div>
                    <div className="mt-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.defaultEventsForNewMerchants')}</p>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {Object.entries(events).map(([event, label]) => (
                                <label key={event} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                                    <span>{label}</span>
                                    <input type="checkbox" checked={data.default_events.includes(event)} onChange={() => toggleDefaultEvent(event)} />
                                </label>
                            ))}
                        </div>
                    </div>
                </form>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-slate-900">{i18n.t('generated.notifications_Index.emailTemplates')}</h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                        {templates.map((template) => (
                            <TemplateForm key={template.id} template={template} label={events[template.event_type] ?? template.event_type} />
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">{i18n.t('generated.notifications_Index.deliveryLogs')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.merchant')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.event')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.payment')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.recipient')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.status')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.sent')}</th>
                                    <th className="px-4 py-3">{i18n.t('generated.notifications_Index.failure')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(deliveries.data ?? []).map((delivery) => (
                                    <tr key={delivery.id} className="border-t border-slate-100">
                                        <td className="px-4 py-3">{delivery.merchant?.name ?? '—'}<div className="text-xs text-slate-400">{delivery.merchant?.email}</div></td>
                                        <td className="px-4 py-3 font-mono text-xs">{delivery.event_type}</td>
                                        <td className="px-4 py-3">{delivery.order_id ?? delivery.payment_id ?? '—'}</td>
                                        <td className="px-4 py-3">{delivery.recipient_email}</td>
                                        <td className="px-4 py-3"><StatusPill value={delivery.status} /></td>
                                        <td className="px-4 py-3 text-slate-500">{fmtDate(delivery.sent_at ?? delivery.created_at)}</td>
                                        <td className="px-4 py-3 text-xs text-red-600">{delivery.failure_reason ?? '—'}</td>
                                    </tr>
                                ))}
                                {(deliveries.data ?? []).length === 0 && (
                                    <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-400"><Mail className="mx-auto mb-2" size={28} />{i18n.t('generated.notifications_Index.noEmailDeliveriesYet')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

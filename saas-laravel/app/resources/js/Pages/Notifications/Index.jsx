import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { fmtDate } from '@/utils';
import { Mail, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

import i18n from '@/i18n';
function StatusPill({ value }) {
    const styles = {
        sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        failed: 'border-red-200 bg-red-50 text-red-700',
        pending: 'border-amber-200 bg-amber-50 text-amber-700',
        skipped: 'border-slate-200 bg-slate-50 text-slate-600',
    };

    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${styles[value] ?? styles.pending}`}>
            {value}
        </span>
    );
}

export default function NotificationsIndex({ settings, recipients, preferences, events, global, deliveries }) {
    const { data, setData, put, processing, errors } = useForm({
        enabled: settings.enabled,
        environment_scope: settings.environment_scope,
        pending_threshold_minutes: settings.pending_threshold_minutes,
        minimum_amount: settings.minimum_amount ?? '',
        recipients: recipients.map((recipient) => recipient.email),
        events: Object.entries(preferences).filter(([, enabled]) => enabled).map(([event]) => event),
    });

    const addRecipient = () => setData('recipients', [...data.recipients, '']);
    const updateRecipient = (index, value) => {
        const next = [...data.recipients];
        next[index] = value;
        setData('recipients', next);
    };
    const removeRecipient = (index) => setData('recipients', data.recipients.filter((_, i) => i !== index));
    const toggleEvent = (event) => setData(
        'events',
        data.events.includes(event) ? data.events.filter((item) => item !== event) : [...data.events, event],
    );

    const submit = (e) => {
        e.preventDefault();
        put(route('notifications.update'), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={i18n.t('generated.notifications_Index.emailNotifications')} />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">{i18n.t('generated.notifications_Index.emailNotifications')}</h1>
                        <p className="mt-1 text-sm text-slate-500">{i18n.t('generated.notifications_Index.configurePaymentAndRoutingEmailAlertsForYour')}</p>
                    </div>
                    {!global.enabled && (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            <AlertCircle size={15} />{i18n.t('generated.notifications_Index.disabledGloballyByAdmin')}</div>
                    )}
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    <section className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-slate-900">{i18n.t('generated.notifications_Index.accountSettings')}</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                    <input type="checkbox" checked={data.enabled} onChange={(e) => setData('enabled', e.target.checked)} />{i18n.t('generated.notifications_Index.enableEmailNotifications')}</label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.environment')}</span>
                                    <select value={data.environment_scope} onChange={(e) => setData('environment_scope', e.target.value)} className="w-full rounded-lg border-slate-300 text-sm">
                                        <option value="both">{i18n.t('generated.notifications_Index.both')}</option>
                                        <option value="test">Test</option>
                                        <option value="live">Live</option>
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.pendingOlderThan')}</span>
                                    <input type="number" min="1" value={data.pending_threshold_minutes} onChange={(e) => setData('pending_threshold_minutes', e.target.value)} className="w-full rounded-lg border-slate-300 text-sm" />
                                    <span className="mt-1 block text-xs text-slate-400">{i18n.t('generated.notifications_Index.minutes')}</span>
                                </label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.notifications_Index.minimumAmount')}</span>
                                    <input type="number" min="0" step="0.01" value={data.minimum_amount} onChange={(e) => setData('minimum_amount', e.target.value)} className="w-full rounded-lg border-slate-300 text-sm" placeholder={i18n.t('generated.notifications_Index.noMinimum')} />
                                </label>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-900">{i18n.t('generated.notifications_Index.recipients')}</h2>
                                <button type="button" onClick={addRecipient} disabled={data.recipients.length >= global.max_recipients} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                                    <Plus size={13} />{i18n.t('generated.notifications_Index.add')}</button>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{i18n.t('generated.notifications_Index.maximum')}{' '}{global.max_recipients}{' '}{i18n.t('generated.notifications_Index.recipientEmailAddresses')}</p>
                            <div className="mt-4 space-y-2">
                                {data.recipients.map((email, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input value={email} onChange={(e) => updateRecipient(index, e.target.value)} className="flex-1 rounded-lg border-slate-300 text-sm" placeholder={i18n.t('generated.notifications_Index.alertsExampleCom')} />
                                        <button type="button" onClick={() => removeRecipient(index)} className="rounded-lg border border-slate-200 px-3 text-slate-500 hover:bg-slate-50">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {errors.recipients && <p className="mt-2 text-xs text-red-600">{errors.recipients}</p>}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-slate-900">{i18n.t('generated.notifications_Index.events')}</h2>
                            <div className="mt-4 space-y-2">
                                {Object.entries(events).map(([event, label]) => (
                                    <label key={event} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                                        <span>{label}</span>
                                        <input type="checkbox" checked={data.events.includes(event)} onChange={() => toggleEvent(event)} />
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={processing} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                            <Save size={15} />{i18n.t('generated.notifications_Index.saveSettings')}</button>
                    </aside>
                </form>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">{i18n.t('generated.notifications_Index.deliveryHistory')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
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
                                        <td className="px-4 py-3 font-mono text-xs">{delivery.event_type}</td>
                                        <td className="px-4 py-3">
                                            {delivery.payment_id ? <Link className="text-indigo-600 hover:text-indigo-800" href={route('payments.show', delivery.payment_id)}>{delivery.order_id ?? delivery.payment_id}</Link> : '—'}
                                        </td>
                                        <td className="px-4 py-3">{delivery.recipient_email}</td>
                                        <td className="px-4 py-3"><StatusPill value={delivery.status} /></td>
                                        <td className="px-4 py-3 text-slate-500">{fmtDate(delivery.sent_at ?? delivery.created_at)}</td>
                                        <td className="px-4 py-3 text-xs text-red-600">{delivery.failure_reason ?? '—'}</td>
                                    </tr>
                                ))}
                                {(deliveries.data ?? []).length === 0 && (
                                    <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400"><Mail className="mx-auto mb-2" size={28} />{i18n.t('generated.notifications_Index.noEmailDeliveriesYet')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/Badge';
import {
    Webhook, Plus, Trash2, Play, CheckCircle2, XCircle,
    Clock, ExternalLink, AlertTriangle, Code2, ScrollText,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtDate } from '@/utils';

import i18n from '@/i18n';
// ─────────────────────────────────────────────────────────────────────────────
// Signing secret verification snippet
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_SNIPPET = `// Node.js — verify PayFlow webhook signature
const crypto = require('crypto');

function verifySignature(payload, sigHeader, secret) {
  const [tPart, vPart] = sigHeader.split(',');
  const timestamp = tPart.replace('t=', '');
  const sig = vPart.replace('v1=', '');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payload}\`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Add webhook form
// ─────────────────────────────────────────────────────────────────────────────

function AddWebhookForm({ availableEvents, onClose }) {
    const form = useForm({
        url:         '',
        description: '',
        events:      ['payment.succeeded', 'payment.failed'],
    });

    const toggle = (event) => {
        const next = form.data.events.includes(event)
            ? form.data.events.filter(e => e !== event)
            : [...form.data.events, event];
        form.setData('events', next);
    };

    const submit = (e) => {
        e.preventDefault();
        form.post(route('webhooks.store'), {
            onSuccess: () => { form.reset(); onClose(); },
        });
    };

    return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={15} strokeWidth={2} className="text-indigo-600" />{i18n.t('generated.webhooks_Index.addWebhookEndpoint')}</h3>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{i18n.t('generated.webhooks_Index.endpointUrl')}</label>
                    <input
                        type="url"
                        value={form.data.url}
                        onChange={e => form.setData('url', e.target.value)}
                        placeholder="https://your-server.com/webhooks/payflow"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                    />
                    {form.errors.url && <p className="mt-1 text-xs text-red-600">{form.errors.url}</p>}
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{i18n.t('generated.webhooks_Index.descriptionOptional')}</label>
                    <input
                        type="text"
                        value={form.data.description}
                        onChange={e => form.setData('description', e.target.value)}
                        placeholder={i18n.t('generated.webhooks_Index.eGProductionOrderFulfillment')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">{i18n.t('generated.webhooks_Index.subscribeToEvents')}</label>
                    <div className="flex flex-wrap gap-2">
                        {availableEvents.map(ev => (
                            <button
                                key={ev}
                                type="button"
                                onClick={() => toggle(ev)}
                                className={[
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    form.data.events.includes(ev)
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600',
                                ].join(' ')}
                            >
                                {ev}
                            </button>
                        ))}
                    </div>
                    {form.errors.events && <p className="mt-1 text-xs text-red-600">{form.errors.events}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.url || !form.data.events.length}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {form.processing ? i18n.t('generated.common.saving') : i18n.t('generated.common.saveEndpoint')}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >{i18n.t('common.actions.cancel')}</button>
                </div>
            </form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook row
// ─────────────────────────────────────────────────────────────────────────────

function WebhookRow({ webhook }) {
    const [deleting, setDeleting] = useState(false);
    const [testing, setTesting]   = useState(false);

    const del = () => {
        if (!confirm('Delete this webhook endpoint?')) return;
        setDeleting(true);
        router.delete(route('webhooks.destroy', webhook.id), {
            onFinish: () => setDeleting(false),
        });
    };

    const test = () => {
        setTesting(true);
        router.post(route('webhooks.test', webhook.id), {}, {
            onFinish: () => setTesting(false),
        });
    };

    const successRate = webhook.deliveries_count > 0
        ? Math.round(webhook.delivered_count / webhook.deliveries_count * 100)
        : null;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <a
                            href={webhook.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-sm font-medium text-indigo-600 hover:underline truncate"
                        >
                            {webhook.url}
                            <ExternalLink size={12} strokeWidth={1.75} className="shrink-0" />
                        </a>
                        <Badge variant={webhook.active ? 'success' : 'default'}>
                            {webhook.active ? i18n.t('generated.common.active') : i18n.t('generated.common.inactive')}
                        </Badge>
                    </div>
                    {webhook.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{webhook.description}</p>
                    )}
                </div>

                <div className="flex gap-1.5 shrink-0">
                    <button
                        onClick={test}
                        disabled={testing}
                        title={i18n.t('generated.webhooks_Index.sendTestPing')}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <Play size={12} strokeWidth={2} />
                        {testing ? i18n.t('generated.common.sending') : i18n.t('generated.common.test')}
                    </button>
                    <button
                        onClick={del}
                        disabled={deleting}
                        title={i18n.t('generated.webhooks_Index.deleteWebhook')}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                        <Trash2 size={12} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Events */}
            <div className="flex flex-wrap gap-1.5">
                {(webhook.events || []).map(ev => (
                    <span key={ev} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 font-mono">
                        {ev}
                    </span>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {webhook.delivered_count}{i18n.t('generated.webhooks_Index.delivered')}</span>
                <span className="flex items-center gap-1">
                    <AlertTriangle size={12} className="text-amber-500" />
                    {webhook.deliveries_count - webhook.delivered_count} failed
                </span>
                {successRate !== null && (
                    <span className={successRate >= 90 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                        {successRate}{i18n.t('generated.webhooks_Index.successRate')}</span>
                )}
                {webhook.last_used_at && (
                    <span className="flex items-center gap-1 ml-auto">
                        <Clock size={12} />{i18n.t('generated.webhooks_Index.lastDelivery')}{fmtDate(webhook.last_used_at)}
                    </span>
                )}
                <span className="font-mono text-slate-400">{webhook.secret_hint}</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function WebhooksIndex({ webhooks, availableEvents }) {
    const [showForm, setShowForm] = useState(false);
    const [showSnippet, setShowSnippet] = useState(false);
    const [showEvents, setShowEvents] = useState(false);
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Webhook size={20} strokeWidth={1.75} className="text-indigo-600" />{i18n.t('common.nav.webhooks')}</h2>
                    <div className="flex gap-2">
                        <Link
                            href={route('webhooks.logs')}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <ScrollText size={13} strokeWidth={2} />{i18n.t('generated.webhooks_Index.deliveryLogs')}</Link>
                        <button
                            onClick={() => setShowSnippet(s => !s)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <Code2 size={13} strokeWidth={2} />{i18n.t('generated.webhooks_Index.verifySignature')}</button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                            <Plus size={13} strokeWidth={2.5} />{i18n.t('generated.webhooks_Index.addEndpoint')}</button>
                    </div>
                </div>
            }
        >
            <Head title={i18n.t('common.nav.webhooks')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-5 max-w-4xl mx-auto">

                {/* Flash messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 size={15} strokeWidth={2} />
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                        <XCircle size={15} strokeWidth={2} />
                        {flash.error}
                    </div>
                )}

                {/* How it works banner */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-700 mb-1">{i18n.t('generated.webhooks_Index.howWebhooksWork')}</p>
                    <p>{i18n.t('generated.webhooks_Index.payflowSendsASigned')}{' '}<code className="rounded bg-slate-200 px-1 text-xs">POST</code>{i18n.t('generated.webhooks_Index.requestToYourEndpointWhenAPaymentEvent')}<code className="rounded bg-slate-200 px-1 text-xs">X-PayFlow-Signature</code>{i18n.t('generated.webhooks_Index.headerWithAnHmacSha256SignatureYouCan')}</p>
                </div>

                {/* Events reference */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowEvents(v => !v)}
                        className="w-full px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{i18n.t('generated.webhooks_Index.eventReference')}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{i18n.t('generated.webhooks_Index.allEventsShareTheSamePayloadShape')}</span>
                            {showEvents ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                        </div>
                    </button>

                    {showEvents && (
                        <>
                        <div className="divide-y divide-slate-100">
                            <div className="px-5 py-4 flex gap-4">
                                <div className="w-44 shrink-0">
                                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-700">
                                        payment.created
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{i18n.t('generated.webhooks_Index.paymentSessionOpened')}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{i18n.t('generated.webhooks_Index.firedAsSoonAsANewPaymentIs')}<em>{i18n.t('generated.webhooks_Index.awaitingPayment')}</em>{i18n.t('generated.webhooks_Index.inYourSystem')}</p>
                                    <p className="mt-1 text-[11px] text-slate-400 font-mono">data.status = "created"</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 flex gap-4">
                                <div className="w-44 shrink-0">
                                    <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-700">
                                        payment.succeeded
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{i18n.t('generated.webhooks_Index.paymentCapturedSuccessfully')}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{i18n.t('generated.webhooks_Index.firedWhenTheProviderConfirmsTheChargeWas')}<code className="rounded bg-slate-100 px-1">payment.created</code>{i18n.t('generated.webhooks_Index.alone')}</p>
                                    <p className="mt-1 text-[11px] text-slate-400 font-mono">data.status = "succeeded"  ·  data.amount and data.currency are set</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 flex gap-4">
                                <div className="w-44 shrink-0">
                                    <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-mono text-xs font-medium text-red-600">
                                        payment.failed
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{i18n.t('generated.webhooks_Index.paymentDeclinedByProvider')}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{i18n.t('generated.webhooks_Index.firedWhenTheProviderDeclinesTheChargeInsufficient')}</p>
                                    <p className="mt-1 text-[11px] text-slate-400 font-mono">data.status = "failed"</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 flex gap-4">
                                <div className="w-44 shrink-0">
                                    <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-600">
                                        payment.cancelled
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{i18n.t('generated.webhooks_Index.customerAbandonedCheckout')}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{i18n.t('generated.webhooks_Index.firedWhenTheCustomerClicksCancelOrNavigates')}</p>
                                    <p className="mt-1 text-[11px] text-slate-400 font-mono">data.status = "cancelled"</p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 bg-slate-900 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-700">
                                <span className="text-xs font-medium text-slate-400">{i18n.t('generated.webhooks_Index.examplePayloadAllEvents')}</span>
                            </div>
                            <pre className="px-5 py-4 text-xs text-slate-300 overflow-x-auto leading-relaxed">{`{
  "id": "019eaccb-1234-...",
  "event": "payment.succeeded",
  "created_at": "2026-06-09T14:32:13.000Z",
  "data": {
    "payment_id": "019eaccb-...",
    "order_id": "1001",
    "status": "succeeded",
    "amount": 149.99,
    "currency": "USD",
    "provider_reference": "cs_test_a1B2c3...",
    "environment": "test",
    "created_at": "2026-06-09T14:31:00.000Z"
  }
}`}</pre>
                        </div>
                        </>
                    )}
                </div>

                {/* Signature verification snippet */}
                {showSnippet && (
                    <div className="rounded-xl border border-slate-200 bg-slate-900 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                            <span className="text-xs font-medium text-slate-400">{i18n.t('generated.webhooks_Index.signatureVerificationNodeJs')}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(VERIFY_SNIPPET); toast.success('Copied!'); }}
                                className="text-xs text-slate-400 hover:text-white transition-colors"
                            >{i18n.t('common.actions.copy')}</button>
                        </div>
                        <pre className="px-4 py-4 text-xs text-slate-300 overflow-x-auto leading-relaxed">{VERIFY_SNIPPET}</pre>
                    </div>
                )}

                {/* Add form */}
                {showForm && (
                    <AddWebhookForm availableEvents={availableEvents} onClose={() => setShowForm(false)} />
                )}

                {/* Webhooks list */}
                {webhooks.length === 0 && !showForm ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
                        <Webhook size={36} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600">{i18n.t('generated.webhooks_Index.noWebhookEndpointsYet')}</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">{i18n.t('generated.webhooks_Index.addAnEndpointToReceiveRealTimePayment')}</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >{i18n.t('generated.webhooks_Index.addYourFirstEndpoint')}</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {webhooks.map(w => <WebhookRow key={w.id} webhook={w} />)}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

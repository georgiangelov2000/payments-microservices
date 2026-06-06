import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProviderBrand from '@/Components/ProviderBrand';
import { CheckCircle2, AlertTriangle, XCircle, Save, Plus, Trash2, FlaskConical } from 'lucide-react';

function aliases(providers) {
    return providers.map((provider) => provider.alias);
}

function providerLabel(providers, alias) {
    return providers.find((provider) => provider.alias === alias)?.name || alias;
}

export default function RoutingIndex({ environment, providers, configuration, rules, health, sandboxBehaviors = {} }) {
    const { flash } = usePage().props;
    const providerAliases = aliases(providers);

    const configForm = useForm({
        environment,
        enabled: configuration.enabled,
        strategy: configuration.strategy || 'priority',
        priority_chain: configuration.priority_chain?.length ? configuration.priority_chain : providerAliases,
        failover_chain: configuration.failover_chain?.length ? configuration.failover_chain : providerAliases,
        weighted_distribution: configuration.weighted_distribution || Object.fromEntries(providerAliases.map((alias) => [alias, 0])),
    });

    const ruleForm = useForm({
        environment,
        name: '',
        provider_alias: providerAliases[0] || '',
        priority: 100,
        enabled: true,
        conditions: {
            country: '',
            currency: '',
            payment_method: '',
            card_type: '',
            recurring: '',
            min_amount: '',
            max_amount: '',
        },
    });

    const submitConfig = (event) => {
        event.preventDefault();
        configForm.put(route('routing.update'), { preserveScroll: true });
    };

    const submitRule = (event) => {
        event.preventDefault();
        const conditions = Object.fromEntries(
            Object.entries(ruleForm.data.conditions).filter(([, value]) => value !== '' && value !== null)
        );
        ruleForm.transform((data) => ({ ...data, conditions })).post(route('routing.rules.store'), {
            preserveScroll: true,
            onSuccess: () => ruleForm.reset('name', 'priority', 'conditions'),
        });
    };

    const setWeight = (alias, value) => {
        configForm.setData('weighted_distribution', {
            ...configForm.data.weighted_distribution,
            [alias]: Number(value),
        });
    };

    // Sandbox simulation state
    const [sandboxState, setSandboxState] = useState(() => {
        const init = {};
        providers.forEach(p => {
            init[p.alias] = sandboxBehaviors[p.alias] ?? { mode: 'off', fail_rate: 30 };
        });
        return init;
    });
    const [sandboxSaving, setSandboxSaving] = useState(false);

    const setSandboxMode = (alias, mode) => {
        setSandboxState(prev => ({ ...prev, [alias]: { ...prev[alias], mode } }));
    };
    const setSandboxRate = (alias, rate) => {
        setSandboxState(prev => ({ ...prev, [alias]: { ...prev[alias], fail_rate: Number(rate) } }));
    };

    const saveSandbox = (e) => {
        e.preventDefault();
        setSandboxSaving(true);
        router.put(route('routing.sandbox.update'), {
            environment,
            sandbox_behaviors: sandboxState,
        }, {
            preserveScroll: true,
            onFinish: () => setSandboxSaving(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Payment Routing" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Payment Routing</h1>
                        <p className="mt-1 text-sm text-gray-500">Configure provider priority, failover, weights, rules, and sandbox/live behavior.</p>
                    </div>
                    <div className="flex gap-2">
                        {['test', 'live'].map((mode) => (
                            <Link
                                key={mode}
                                href={route('routing.index', { environment: mode })}
                                className={[
                                    'rounded border px-3 py-2 text-sm font-medium capitalize',
                                    environment === mode ? 'border-indigo-600 bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50',
                                ].join(' ')}
                            >
                                {mode}
                            </Link>
                        ))}
                    </div>
                </div>

                {flash?.status && (
                    <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{flash.status}</div>
                )}

                <section className="grid gap-4 md:grid-cols-3">
                    {providers.map((provider) => {
                        const state = health?.[provider.alias];
                        const status = state?.status || 'healthy';
                        return (
                            <div key={provider.id} className="rounded-lg border bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <ProviderBrand alias={provider.alias} label={provider.name} status={status} />
                                    <span className={[
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                                        status === 'healthy'  ? 'bg-green-100 text-green-700'  :
                                        status === 'degraded' ? 'bg-amber-100 text-amber-700'  :
                                                                'bg-red-100 text-red-700',
                                    ].join(' ')}>
                                        {status === 'healthy'
                                            ? <CheckCircle2 size={12} strokeWidth={2} />
                                            : status === 'degraded'
                                            ? <AlertTriangle size={12} strokeWidth={2} />
                                            : <XCircle size={12} strokeWidth={2} />}
                                        {status}
                                    </span>
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Failures</dt>
                                        <dd className="font-medium">{state?.consecutive_failures ?? 0}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Timeouts</dt>
                                        <dd className="font-medium">{state?.timeout_count ?? 0}</dd>
                                    </div>
                                </dl>
                            </div>
                        );
                    })}
                </section>

                <form onSubmit={submitConfig} className="rounded-lg border bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Routing policy</h2>
                            <p className="text-sm text-gray-500">Changes apply to {environment} transactions only.</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={configForm.data.enabled}
                                onChange={(event) => configForm.setData('enabled', event.target.checked)}
                                className="rounded border-gray-300 text-indigo-600"
                            />
                            Enabled
                        </label>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium">Strategy</span>
                            <select
                                value={configForm.data.strategy}
                                onChange={(event) => configForm.setData('strategy', event.target.value)}
                                className="mt-1 w-full rounded border-gray-300 text-sm"
                            >
                                <option value="priority">Priority routing</option>
                                <option value="weighted">Weighted distribution</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium">Provider priority order</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {configForm.data.priority_chain.map((alias) => (
                                    <ProviderBrand key={alias} alias={alias} label={providerLabel(providers, alias)} variant="compact" />
                                ))}
                            </div>
                            <input
                                value={configForm.data.priority_chain.join(', ')}
                                onChange={(event) => configForm.setData('priority_chain', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                className="mt-1 w-full rounded border-gray-300 text-sm"
                            />
                        </label>

                        <label className="block lg:col-span-2">
                            <span className="text-sm font-medium">Failover chain</span>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {configForm.data.failover_chain.map((alias, index) => (
                                    <div key={`${alias}-${index}`} className="flex items-center gap-2">
                                        {index > 0 && <span className="text-xs text-gray-400">→</span>}
                                        <ProviderBrand alias={alias} label={providerLabel(providers, alias)} variant="compact" />
                                    </div>
                                ))}
                            </div>
                            <input
                                value={configForm.data.failover_chain.join(', ')}
                                onChange={(event) => configForm.setData('failover_chain', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                className="mt-1 w-full rounded border-gray-300 text-sm"
                            />
                        </label>
                    </div>

                    <div className="mt-5 rounded border border-gray-200">
                        <div className="border-b bg-gray-50 px-4 py-3 text-sm font-medium">Weighted distribution</div>
                        <div className="grid gap-4 p-4 md:grid-cols-2">
                            {providerAliases.map((alias) => (
                                <label key={alias} className="block">
                                    <ProviderBrand alias={alias} label={providerLabel(providers, alias)} variant="compact" />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={configForm.data.weighted_distribution?.[alias] ?? 0}
                                        onChange={(event) => setWeight(alias, event.target.value)}
                                        className="mt-1 w-full rounded border-gray-300 text-sm"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <button disabled={configForm.processing} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                            <Save size={14} strokeWidth={2} />
                            Save routing policy
                        </button>
                    </div>
                </form>

                <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                    <form onSubmit={submitRule} className="rounded-lg border bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">New conditional rule</h2>
                        <div className="mt-4 space-y-3">
                            <input value={ruleForm.data.name} onChange={(e) => ruleForm.setData('name', e.target.value)} placeholder="Rule name" className="w-full rounded border-gray-300 text-sm" />
                            <select value={ruleForm.data.provider_alias} onChange={(e) => ruleForm.setData('provider_alias', e.target.value)} className="w-full rounded border-gray-300 text-sm">
                                {providerAliases.map((alias) => <option key={alias} value={alias}>{providerLabel(providers, alias)}</option>)}
                            </select>
                            <ProviderBrand alias={ruleForm.data.provider_alias} label={providerLabel(providers, ruleForm.data.provider_alias)} variant="compact" />
                            <input type="number" value={ruleForm.data.priority} onChange={(e) => ruleForm.setData('priority', Number(e.target.value))} className="w-full rounded border-gray-300 text-sm" />
                            {['country', 'currency', 'payment_method', 'card_type', 'min_amount', 'max_amount'].map((field) => (
                                <input
                                    key={field}
                                    value={ruleForm.data.conditions[field]}
                                    onChange={(e) => ruleForm.setData('conditions', { ...ruleForm.data.conditions, [field]: e.target.value })}
                                    placeholder={field.replace('_', ' ')}
                                    className="w-full rounded border-gray-300 text-sm"
                                />
                            ))}
                            <select
                                value={ruleForm.data.conditions.recurring}
                                onChange={(e) => ruleForm.setData('conditions', { ...ruleForm.data.conditions, recurring: e.target.value })}
                                className="w-full rounded border-gray-300 text-sm"
                            >
                                <option value="">Any recurrence</option>
                                <option value="1">Recurring only</option>
                                <option value="0">One-time only</option>
                            </select>
                        </div>
                        <button disabled={ruleForm.processing} className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                            <Plus size={14} strokeWidth={2.5} />
                            Add rule
                        </button>
                    </form>

                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="border-b px-5 py-4">
                            <h2 className="text-lg font-semibold">Conditional rules</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Priority</th>
                                        <th className="px-4 py-3">Rule</th>
                                        <th className="px-4 py-3">Provider</th>
                                        <th className="px-4 py-3">Conditions</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rules.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="px-4 py-3">{rule.priority}</td>
                                            <td className="px-4 py-3 font-medium">{rule.name}</td>
                                            <td className="px-4 py-3">
                                                <ProviderBrand alias={rule.provider_alias} label={providerLabel(providers, rule.provider_alias)} variant="compact" />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{JSON.stringify(rule.conditions || {})}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => router.delete(route('routing.rules.destroy', rule.id), { preserveScroll: true })}
                                                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 size={13} strokeWidth={2} />
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {rules.length === 0 && (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No conditional rules configured.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ── Sandbox Simulation (test mode only) ── */}
                {environment === 'test' && providers.length > 0 && (
                    <form onSubmit={saveSandbox} className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FlaskConical size={18} strokeWidth={1.75} className="text-amber-600" />
                                    <h2 className="text-lg font-semibold text-amber-900">Sandbox Simulation</h2>
                                </div>
                                <p className="mt-1 text-sm text-amber-700">
                                    Force providers to fail or timeout in <strong>test mode</strong> so you can verify your failover logic works correctly. Has no effect in live mode.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={sandboxSaving}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                            >
                                <Save size={14} strokeWidth={2} />
                                {sandboxSaving ? 'Saving…' : 'Save sandbox config'}
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {providers.map(provider => {
                                const state = sandboxState[provider.alias] ?? { mode: 'off', fail_rate: 30 };
                                return (
                                    <div key={provider.alias} className="rounded-xl border border-amber-200 bg-white p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold capitalize text-slate-800">{provider.name || provider.alias}</span>
                                            {state.mode !== 'off' && (
                                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                                                    Simulating
                                                </span>
                                            )}
                                        </div>

                                        {/* Mode selector */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {[
                                                { value: 'off',           label: 'Normal',        desc: 'Real provider calls' },
                                                { value: 'force_fail',    label: 'Force Fail',    desc: 'Always return 502' },
                                                { value: 'force_timeout', label: 'Force Timeout', desc: 'Always timeout' },
                                                { value: 'random_fail',   label: 'Random Fail',   desc: 'Fail at set rate' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setSandboxMode(provider.alias, opt.value)}
                                                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                                                        state.mode === opt.value
                                                            ? opt.value === 'off'
                                                                ? 'border-green-400 bg-green-50 ring-1 ring-green-400'
                                                                : 'border-red-400 bg-red-50 ring-1 ring-red-400'
                                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                                >
                                                    <p className="text-xs font-semibold text-slate-800">{opt.label}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Fail rate slider (only for random_fail) */}
                                        {state.mode === 'random_fail' && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs font-semibold text-red-700">Failure rate</label>
                                                    <span className="text-sm font-bold text-red-700">{state.fail_rate ?? 30}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={state.fail_rate ?? 30}
                                                    onChange={e => setSandboxRate(provider.alias, e.target.value)}
                                                    className="w-full accent-red-500"
                                                />
                                                <div className="flex justify-between text-[10px] text-red-400 mt-0.5">
                                                    <span>0% (never)</span>
                                                    <span>100% (always)</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-4 text-xs text-amber-600">
                            Tip: Set Stripe to "Force Fail" and save — your next test payment will automatically failover to PayPal. Watch it happen in the payment timeline.
                        </p>
                    </form>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

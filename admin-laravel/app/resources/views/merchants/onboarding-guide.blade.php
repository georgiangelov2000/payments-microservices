<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <title>{{ __('messages.onboarding.title') }}</title>
    <style>
        @page { margin: 32px 36px 42px; }
        html, body { background: #ffffff; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 9.5px; line-height: 1.48; }
        h1 { margin: 0; font-size: 24px; color: #111827; }
        h2 { margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #c7d2fe; color: #3730a3; font-size: 15px; }
        h3 { margin: 12px 0 5px; font-size: 11px; color: #312e81; }
        p { margin: 4px 0 8px; }
        ul, ol { margin: 5px 0 9px 18px; padding: 0; }
        li { margin: 2px 0; }
        table { width: 100%; margin: 7px 0 11px; border-collapse: collapse; }
        th { padding: 6px 7px; background: #eef2ff; border: 1px solid #c7d2fe; text-align: left; color: #3730a3; font-size: 8.5px; }
        td { padding: 6px 7px; border: 1px solid #e2e8f0; vertical-align: top; }
        code, pre { font-family: DejaVu Sans Mono, monospace; }
        pre { margin: 6px 0 10px; padding: 9px; border: 1px solid #dbeafe; border-radius: 5px; background: #f8fafc; color: #1e293b; font-size: 7.8px; line-height: 1.42; white-space: pre-wrap; word-wrap: break-word; }
        .brand { margin-bottom: 22px; padding: 13px 16px; border-radius: 8px; background: #0f172a; color: white; }
        .brand-mark { display: inline-block; margin-right: 8px; color: #818cf8; font-size: 21px; font-weight: bold; vertical-align: middle; }
        .brand-name { font-size: 17px; font-weight: bold; vertical-align: middle; }
        .subtitle { margin-top: 4px; color: #cbd5e1; font-size: 9px; }
        .meta { margin: 10px 0 16px; padding: 10px 12px; border-left: 4px solid #6366f1; background: #f8fafc; }
        .notice { margin: 8px 0 11px; padding: 8px 10px; border: 1px solid #fde68a; border-radius: 5px; background: #fffbeb; color: #92400e; }
        .success { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
        .muted { color: #64748b; }
        .mono { font-family: DejaVu Sans Mono, monospace; font-size: 8px; word-break: break-all; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 8px; background: #e0e7ff; color: #3730a3; font-size: 7.5px; }
        .checklist { list-style: none; margin-left: 0; }
        .checklist li:before { content: "☐ "; color: #4f46e5; font-size: 11px; }
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; }
        .footer { position: fixed; right: 0; bottom: -26px; left: 0; color: #94a3b8; text-align: center; font-size: 7.5px; }
    </style>
</head>
<body>
    @php
        $merchantStatus = is_object($merchant->status) && method_exists($merchant->status, 'label')
            ? $merchant->status->label()
            : (string) $merchant->status;
    @endphp
    <div class="footer">{{ __('messages.onboarding.confidential_footer') }}</div>

    <div class="brand">
        <span class="brand-mark">↯</span>
        <span class="brand-name">PayFlow</span>
        <div class="subtitle">{{ __('messages.onboarding.brand_subtitle') }}</div>
    </div>

    <h1>{{ __('messages.onboarding.title') }}</h1>
    <div class="meta">
        <strong>{{ $merchant->company_name ?: $merchant->name }}</strong><br>
        {{ __('messages.onboarding.merchant_id') }}: <span class="mono">{{ $merchant->id }}</span><br>
        {{ __('messages.onboarding.generated_at') }}: {{ $generatedAt->format('Y-m-d H:i T') }}
    </div>

    <p>{{ __('messages.onboarding.introduction') }}</p>

    <h2>1. {{ __('messages.onboarding.account.title') }}</h2>
    <table>
        <tr>
            <th>{{ __('messages.onboarding.account.portal') }}</th>
            <td class="mono">{{ $merchantPortalUrl }}</td>
        </tr>
        <tr>
            <th>{{ __('messages.onboarding.account.login') }}</th>
            <td>{{ $merchant->email }}</td>
        </tr>
        <tr>
            <th>{{ __('messages.onboarding.account.status') }}</th>
            <td>{{ __('messages.onboarding.statuses.'.$merchantStatus) }}</td>
        </tr>
    </table>
    <div class="notice">
        <strong>{{ __('messages.onboarding.security.title') }}</strong>
        {{ __('messages.onboarding.security.login_note') }}
    </div>

    <h2>2. {{ __('messages.onboarding.environments.title') }}</h2>
    <table>
        <thead>
            <tr>
                <th>{{ __('messages.onboarding.environments.environment') }}</th>
                <th>{{ __('messages.onboarding.environments.api_base_url') }}</th>
                <th>{{ __('messages.onboarding.environments.key_type') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($environments as $environment)
                <tr>
                    <td>{{ $environment['name'] }}</td>
                    <td class="mono">{{ $environment['api_base_url'] }}</td>
                    <td><span class="badge">{{ $environment['key_environment'] }}</span></td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <p class="muted">{{ __('messages.onboarding.environments.note') }}</p>

    <h2>3. {{ __('messages.onboarding.credentials.title') }}</h2>
    @if ($apiKeys->isEmpty())
        <div class="notice">{{ __('messages.onboarding.credentials.no_keys') }}</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>{{ __('messages.onboarding.credentials.name') }}</th>
                    <th>{{ __('messages.onboarding.environments.environment') }}</th>
                    <th>{{ __('messages.onboarding.credentials.prefix') }}</th>
                    <th>{{ __('messages.onboarding.account.status') }}</th>
                    <th>{{ __('messages.onboarding.credentials.scopes') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($apiKeys as $apiKey)
                    @php
                        $apiKeyStatus = is_object($apiKey->status) && method_exists($apiKey->status, 'label')
                            ? $apiKey->status->label()
                            : (string) $apiKey->status;
                    @endphp
                    <tr>
                        <td>{{ $apiKey->name }}</td>
                        <td>{{ $apiKey->environment }}</td>
                        <td class="mono">{{ $apiKey->key_prefix }}…</td>
                        <td>{{ __('messages.onboarding.statuses.'.$apiKeyStatus) }}</td>
                        <td class="mono">{{ implode(', ', $apiKey->scopes ?: []) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <div class="notice">
        <strong>{{ __('messages.onboarding.security.title') }}</strong>
        {{ __('messages.onboarding.credentials.secret_note') }}
    </div>

    <h3>{{ __('messages.onboarding.credentials.authentication') }}</h3>
    <p>{{ __('messages.onboarding.credentials.authentication_note') }}</p>
    <pre>x-api-key: YOUR_API_KEY
Content-Type: application/json
Accept: application/json</pre>

    <h2>4. {{ __('messages.onboarding.endpoints.title') }}</h2>
    <table>
        <thead>
            <tr>
                <th>{{ __('messages.onboarding.endpoints.method') }}</th>
                <th>{{ __('messages.onboarding.endpoints.path') }}</th>
                <th>{{ __('messages.onboarding.endpoints.purpose') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>POST</td><td class="mono">/payments</td><td>{{ __('messages.onboarding.endpoints.create') }}</td></tr>
            <tr><td>GET</td><td class="mono">/payments?page=1&amp;limit=20</td><td>{{ __('messages.onboarding.endpoints.list') }}</td></tr>
            <tr><td>GET</td><td class="mono">/payments/{payment_id}/show</td><td>{{ __('messages.onboarding.endpoints.show') }}</td></tr>
            <tr><td>GET</td><td class="mono">/payments/{payment_id}/tracking</td><td>{{ __('messages.onboarding.endpoints.tracking') }}</td></tr>
        </tbody>
    </table>

    <div class="page-break"></div>
    <h2>5. {{ __('messages.onboarding.examples.title') }}</h2>
    <h3>{{ __('messages.onboarding.examples.request') }}</h3>
    <pre>curl --request POST \
  --url "{{ $environments[0]['api_base_url'] }}/payments" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  --header "x-api-key: YOUR_TEST_API_KEY" \
  --data '{
    "order_id": 100001,
    "price": 49.99,
    "currency": "USD",
    "environment": "test",
    "channel": "web",
    "locale": "en-US",
    "metadata": {
      "cart_reference": "CART-100001"
    }
  }'</pre>
    <p class="muted">{{ __('messages.onboarding.examples.provider_note') }}</p>

    <h3>{{ __('messages.onboarding.examples.response') }}</h3>
    <pre>{
  "payment_id": "019...",
  "status": "pending",
  "provider": "stripe",
  "routing_strategy": "priority",
  "routing_candidates": ["stripe", "paypal"],
  "provider_reference": "cs_test_...",
  "payment_url": "https://checkout.example/...",
  "message": null
}</pre>

    <h3>{{ __('messages.onboarding.examples.lookup') }}</h3>
    <pre>curl --request GET \
  --url "{{ $environments[0]['api_base_url'] }}/payments/PAYMENT_ID/show" \
  --header "Accept: application/json" \
  --header "x-api-key: YOUR_TEST_API_KEY"</pre>

    <h2>6. {{ __('messages.onboarding.providers.title') }}</h2>
    @if ($providerCredentials->isEmpty())
        <div class="notice">{{ __('messages.onboarding.providers.none') }}</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>{{ __('messages.onboarding.providers.provider') }}</th>
                    <th>{{ __('messages.onboarding.environments.environment') }}</th>
                    <th>{{ __('messages.onboarding.account.status') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($providerCredentials as $credential)
                    <tr>
                        <td>{{ $credential->display_name ?: ($credential->provider ? $credential->provider->name : '—') }}</td>
                        <td>{{ $credential->environment }}</td>
                        <td>{{ __('messages.onboarding.statuses.'.(string) $credential->status) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <p>{{ __('messages.onboarding.providers.routing_note') }}</p>

    <h2>7. {{ __('messages.onboarding.webhooks.title') }}</h2>
    <ol>
        <li>{{ __('messages.onboarding.webhooks.step_endpoint') }}</li>
        <li>{{ __('messages.onboarding.webhooks.step_events') }}</li>
        <li>{{ __('messages.onboarding.webhooks.step_secret') }}</li>
        <li>{{ __('messages.onboarding.webhooks.step_test') }}</li>
    </ol>
    <p>{{ __('messages.onboarding.webhooks.events') }}: <span class="mono">payment.created, payment.succeeded, payment.failed, payment.pending</span></p>
    <p>{{ __('messages.onboarding.webhooks.headers') }}:</p>
    <pre>Content-Type: application/json
X-PayFlow-Event: payment.succeeded
X-PayFlow-Signature: t=TIMESTAMP,v1=HMAC_SHA256_SIGNATURE</pre>
    <p>{{ __('messages.onboarding.webhooks.signature') }}</p>
    <pre>expected_signature = HMAC_SHA256(webhook_secret, timestamp + "." + raw_request_body)</pre>
    <p class="muted">{{ __('messages.onboarding.webhooks.response_note') }}</p>

    <h2>8. {{ __('messages.onboarding.errors.title') }}</h2>
    <table>
        <thead>
            <tr>
                <th>HTTP</th>
                <th>{{ __('messages.onboarding.errors.code') }}</th>
                <th>{{ __('messages.onboarding.errors.action') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>401</td><td class="mono">unauthorized / invalid api key</td><td>{{ __('messages.onboarding.errors.unauthorized') }}</td></tr>
            <tr><td>403</td><td class="mono">route_not_allowed</td><td>{{ __('messages.onboarding.errors.route') }}</td></tr>
            <tr><td>403</td><td class="mono">provider_not_allowed</td><td>{{ __('messages.onboarding.errors.provider') }}</td></tr>
            <tr><td>422</td><td class="mono">validation error</td><td>{{ __('messages.onboarding.errors.validation') }}</td></tr>
            <tr><td>502</td><td class="mono">payments_unreachable</td><td>{{ __('messages.onboarding.errors.unreachable') }}</td></tr>
            <tr><td>503</td><td class="mono">payments_unavailable</td><td>{{ __('messages.onboarding.errors.unavailable') }}</td></tr>
        </tbody>
    </table>
    <p class="muted">{{ __('messages.onboarding.errors.idempotency') }}</p>

    <h2>9. {{ __('messages.onboarding.testing.title') }}</h2>
    <ol>
        <li>{{ __('messages.onboarding.testing.test_key') }}</li>
        <li>{{ __('messages.onboarding.testing.create_payment') }}</li>
        <li>{{ __('messages.onboarding.testing.redirect') }}</li>
        <li>{{ __('messages.onboarding.testing.verify') }}</li>
        <li>{{ __('messages.onboarding.testing.webhook') }}</li>
        <li>{{ __('messages.onboarding.testing.negative') }}</li>
    </ol>

    <h2>10. {{ __('messages.onboarding.go_live.title') }}</h2>
    <ul class="checklist">
        <li>{{ __('messages.onboarding.go_live.account') }}</li>
        <li>{{ __('messages.onboarding.go_live.provider') }}</li>
        <li>{{ __('messages.onboarding.go_live.live_key') }}</li>
        <li>{{ __('messages.onboarding.go_live.urls') }}</li>
        <li>{{ __('messages.onboarding.go_live.webhook') }}</li>
        <li>{{ __('messages.onboarding.go_live.errors') }}</li>
        <li>{{ __('messages.onboarding.go_live.monitoring') }}</li>
        <li>{{ __('messages.onboarding.go_live.acceptance') }}</li>
    </ul>

    <h2>11. {{ __('messages.onboarding.support.title') }}</h2>
    <p>{{ __('messages.onboarding.support.instructions') }}</p>
    <table>
        <tr>
            <th>{{ __('messages.onboarding.support.email') }}</th>
            <td>{{ $supportEmail }}</td>
        </tr>
        @if ($supportUrl)
            <tr>
                <th>{{ __('messages.onboarding.support.portal') }}</th>
                <td class="mono">{{ $supportUrl }}</td>
            </tr>
        @endif
    </table>
    <div class="notice success">{{ __('messages.onboarding.support.final_note') }}</div>
</body>
</html>

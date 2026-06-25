<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $notification['headline'] ?? 'PayFlow notification' }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
        {{ $notification['summary'] ?? '' }}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9">
        <tr>
            <td align="center" style="padding:40px 16px">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06)">
                    <tr>
                        <td style="background:#0f172a;padding:22px 32px">
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td>
                                        <a href="{{ $notification['dashboard_url'] ?? '#' }}" style="display:inline-block;color:#ffffff;text-decoration:none">
                                            <span style="display:inline-block;margin-right:9px;color:#818cf8;font-size:22px;font-weight:800;vertical-align:middle">↯</span>
                                            <span style="font-size:20px;font-weight:750;letter-spacing:-0.4px;vertical-align:middle">PayFlow</span>
                                        </a>
                                    </td>
                                    <td align="right">
                                        <span style="display:inline-block;padding:5px 9px;border:1px solid #334155;border-radius:999px;color:#cbd5e1;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
                                            {{ $notification['environment'] ?: __('messages.notifications.email.not_available') }}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 32px 30px">
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td width="54" valign="top">
                                        <div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;background:{{ $notification['tone']['soft'] }};border:1px solid {{ $notification['tone']['border'] }};color:{{ $notification['tone']['accent'] }};font-size:21px;font-weight:800">
                                            {{ $notification['tone']['icon'] }}
                                        </div>
                                    </td>
                                    <td valign="top">
                                        <p style="margin:0 0 6px;color:{{ $notification['tone']['accent'] }};font-size:11px;font-weight:750;letter-spacing:0.08em;text-transform:uppercase">
                                            {{ $notification['eyebrow'] }}
                                        </p>
                                        <h1 style="margin:0;color:#0f172a;font-size:24px;font-weight:750;line-height:1.28;letter-spacing:-0.45px">
                                            {{ $notification['headline'] }}
                                        </h1>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 26px;color:#475569;font-size:15px;line-height:1.65">
                                {{ $notification['summary'] }}
                            </p>

                            @if ($bodyText)
                                <div style="margin:0 0 24px;padding:14px 16px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;color:#334155;font-size:14px;line-height:1.6">
                                    {!! nl2br(e($bodyText)) !!}
                                </div>
                            @endif

                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:26px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                                <tr>
                                    <td colspan="2" style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
                                        <span style="color:#64748b;font-size:11px;font-weight:750;letter-spacing:0.07em;text-transform:uppercase">
                                            {{ __('messages.notifications.email.payment_details') }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:38%">
                                        {{ __('messages.notifications.email.order') }}
                                    </td>
                                    <td align="right" style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700">
                                        #{{ $notification['order_id'] }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">
                                        {{ __('messages.notifications.email.amount') }}
                                    </td>
                                    <td align="right" style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:16px;font-weight:750">
                                        {{ $notification['amount'] }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">
                                        {{ __('messages.notifications.email.status') }}
                                    </td>
                                    <td align="right" style="padding:15px 16px;border-bottom:1px solid #f1f5f9">
                                        <span style="display:inline-block;padding:4px 9px;border-radius:999px;background:{{ $notification['tone']['soft'] }};border:1px solid {{ $notification['tone']['border'] }};color:{{ $notification['tone']['accent'] }};font-size:11px;font-weight:750">
                                            {{ $notification['status_label'] }}
                                        </span>
                                    </td>
                                </tr>
                                @if ($notification['provider'])
                                    <tr>
                                        <td style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">
                                            {{ __('messages.notifications.email.provider') }}
                                        </td>
                                        <td align="right" style="padding:15px 16px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700">
                                            {{ $notification['provider'] }}
                                        </td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:15px 16px;color:#64748b;font-size:13px">
                                        {{ __('messages.notifications.email.updated') }}
                                    </td>
                                    <td align="right" style="padding:15px 16px;color:#334155;font-size:12px;font-weight:600">
                                        {{ $notification['occurred_at'] }}
                                    </td>
                                </tr>
                            </table>

                            <table cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="border-radius:9px;background:#4f46e5">
                                        <a href="{{ $notification['payment_url'] }}" style="display:inline-block;padding:12px 19px;color:#ffffff;font-size:14px;font-weight:750;text-decoration:none;border-radius:9px">
                                            {{ __('messages.notifications.email.view_payment') }} &nbsp;→
                                        </a>
                                    </td>
                                    <td width="12"></td>
                                    <td>
                                        <a href="{{ $notification['notifications_url'] }}" style="display:inline-block;padding:11px 16px;color:#4f46e5;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #c7d2fe;border-radius:9px;background:#eef2ff">
                                            {{ __('messages.notifications.email.manage_alerts') }}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:26px 0 0;color:#94a3b8;font-size:11px;line-height:1.55">
                                {{ __('messages.notifications.email.payment_id') }}:
                                <a href="{{ $notification['payment_url'] }}" style="color:#6366f1;text-decoration:underline;text-decoration-color:#c7d2fe;word-break:break-all">{{ $notification['payment_id'] }}</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
                            <p style="margin:0 0 6px;color:#64748b;font-size:12px;line-height:1.5">
                                {{ __('messages.notifications.email.footer_reason') }}
                                <a href="{{ $notification['notifications_url'] }}" style="color:#4f46e5;font-weight:700;text-decoration:none">{{ __('messages.notifications.email.notification_settings') }}</a>.
                            </p>
                            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5">
                                {{ __('messages.notifications.email.footer_security') }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

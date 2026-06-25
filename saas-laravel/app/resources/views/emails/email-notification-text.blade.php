{{ $notification['headline'] ?? 'PayFlow notification' }}

{{ $notification['summary'] ?? '' }}

@if ($bodyText)
{{ $bodyText }}

@endif
{{ __('messages.notifications.email.order') }}: #{{ $notification['order_id'] ?? '' }}
{{ __('messages.notifications.email.payment_id') }}: {{ $notification['payment_id'] ?? '' }}
{{ __('messages.notifications.email.amount') }}: {{ $notification['amount'] ?? '' }}
{{ __('messages.notifications.email.status') }}: {{ $notification['status_label'] ?? '' }}
@if (!empty($notification['provider']))
{{ __('messages.notifications.email.provider') }}: {{ $notification['provider'] }}
@endif
{{ __('messages.notifications.email.updated') }}: {{ $notification['occurred_at'] ?? '' }}

{{ __('messages.notifications.email.view_payment') }}: {{ $notification['payment_url'] ?? '' }}
{{ __('messages.notifications.email.manage_alerts') }}: {{ $notification['notifications_url'] ?? '' }}

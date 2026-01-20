<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentLogController extends Controller
{
    /**
     * List logs for a payment
     *
     * GET /api/v1/payments/{payment}/logs
     */
    public function index(Request $request, Payment $payment)
    {
        $logs = $payment->logs()
            ->latest()
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'payment_id' => $log->payment_id,

                'event_type' => $log->event_type,
                'event_type_label' => $log->event_type->label(),

                'status' => $log->status === 0 ? 'success' : 'failed',

                'message' => $log->message,
                'payload' => $log->payload,

                'created_at' => $log->created_at,
            ]);

        return response()->json($logs);
    }
}

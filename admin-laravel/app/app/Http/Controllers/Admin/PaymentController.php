<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexMerchantPaymentsRequest;
use App\Http\Requests\Admin\IndexPaymentsRequest;
use App\Services\PaymentService;
use Inertia\Inertia;
use Inertia\Response;

final class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
    ) {}

    public function index(IndexPaymentsRequest $request): Response
    {
        $filters = $request->validated();

        return Inertia::render('Admin/Payments/Index', [
            'filters' => $filters,
            'payments' => $this->payments->paginate($filters),
        ]);
    }

    public function merchants(IndexMerchantPaymentsRequest $request): Response
    {
        $filters = $request->validated();

        return Inertia::render('Admin/Payments/Merchants', [
            'filters' => $filters,
            'activity' => $this->payments->merchantActivity($filters),
        ]);
    }
}

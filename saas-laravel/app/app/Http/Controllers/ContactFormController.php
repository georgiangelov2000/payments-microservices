<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ContactFormController extends Controller
{
    public function index()
    {
        return inertia('Contacts/Form');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        // Here you would typically handle the support request,
        // such as saving it to the database or sending an email.

        return redirect()->route('support.index')->with('success', 'Your message has been sent successfully!');
    }
}

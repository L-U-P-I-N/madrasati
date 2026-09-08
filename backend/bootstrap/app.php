<?php

use App\Http\Middleware\EnsureModulePermission;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // مصادقة بالرموز (Bearer) فقط — لا جلسات ولا CSRF،
        // فالواجهة تطبيق Next.js منفصل يحمل الرمز في ترويسة Authorization.
        $middleware->alias([
            'can.module' => EnsureModulePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

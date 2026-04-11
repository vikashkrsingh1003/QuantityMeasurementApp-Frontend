import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/measurement-dashboard/measurement-dashboard.component')
        .then(m => m.MeasurementDashboardComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history-page/history-page.component')
        .then(m => m.HistoryPageComponent),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./components/auth/auth.component')
        .then(m => m.AuthComponent),
  },
  {
    /**
     * Spring Security's OAuth2 success handler redirects here after Google login.
     * Configure your backend's success redirect URL to:
     *   http://localhost:4200/oauth2/redirect
     */
    path: 'oauth2/redirect',
    loadComponent: () =>
      import('./components/oauth2-redirect/oauth2-redirect.component')
        .then(m => m.OAuth2RedirectComponent),
  },
  {
    /**
     * Spring Security's OAuth2 success handler redirects here after Google login.
     * Configure your backend's success redirect URL to:
     *   http://localhost:4200/oauth2/callback
     */
    path: 'oauth2/callback',
    loadComponent: () =>
      import('./components/oauth-callback/oauth-callback.component')
        .then(m => m.OAuthCallbackComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';

import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Aces Hockey Hub',
  description: 'Web pro hokejový tým Aces.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HC Aces',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  }
};

export const viewport: Viewport = {
  themeColor: '#ff8000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('aces-theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark', 'theme-aces');
                  document.documentElement.classList.add('light');
                } else if (t === 'dark') {
                  document.documentElement.classList.remove('light', 'theme-aces');
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark', 'theme-aces');
                }
              } catch (e) {}

              try {
                // Ignore uncaught errors thrown by third-party browser extensions (e.g. Urban VPN, password managers)
                if (typeof window !== 'undefined') {
                  window.addEventListener('error', function(event) {
                    if (event.filename && (event.filename.indexOf('chrome-extension://') !== -1 || event.filename.indexOf('moz-extension://') !== -1)) {
                      event.stopImmediatePropagation();
                    }
                  }, true);
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    if (reason && reason.stack && (reason.stack.indexOf('chrome-extension://') !== -1 || reason.stack.indexOf('moz-extension://') !== -1)) {
                      event.stopImmediatePropagation();
                    }
                  }, true);
                }
              } catch (e) {}

              try {
                if (typeof MutationObserver !== 'undefined') {
                  var obs = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked' && m.target && m.target.removeAttribute) {
                        m.target.removeAttribute('bis_skin_checked');
                      }
                    }
                  });
                  obs.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked']
                  });
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          <ThemeProvider>
            <PwaRegister />
            {children}
            <Toaster />
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function UpdateBanner() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Get the service worker registration
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setRegistration(reg);
          
          // Check if there's already an update waiting
          if (reg.waiting) {
            setShowUpdateBanner(true);
          }

          // Listen for new service worker waiting to activate
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is installed but waiting
                  setShowUpdateBanner(true);
                }
              });
            }
          });
        }
      });

      // Listen for controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to get the latest version
        window.location.reload();
      });

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_COMPLETE') {
          console.log('[UpdateBanner] Update complete, version:', event.data.version);
        }
      });

      // Periodically check for updates (every 60 seconds)
      const intervalId = setInterval(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update();
          }
        });
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg"
      data-testid="banner-update-available"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <RefreshCw className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                New Update Available
              </p>
              <p className="text-sm text-primary-foreground/80">
                A new version is ready. Refresh to get the latest features and improvements.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleUpdate}
              variant="secondary"
              size="sm"
              data-testid="button-update-now"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-dismiss-update"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

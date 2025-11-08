import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Download, Smartphone } from "lucide-react";
import { setupInstallPrompt, isPWA } from "@/lib/registerServiceWorker";

export function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isPWA()) {
      return;
    }

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      return;
    }

    // Setup install prompt listener
    setupInstallPrompt((event) => {
      setInstallPrompt(event);
      setShowPrompt(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    installPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the prompt
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt || isPWA()) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 border-primary/20 bg-card/95 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">Install Lead Manager</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Install our app for quick access and offline functionality
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="flex-1"
              data-testid="button-install-pwa"
            >
              <Download className="w-4 h-4 mr-1" />
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              data-testid="button-dismiss-pwa"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

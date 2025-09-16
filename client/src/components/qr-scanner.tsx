import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function QRScanner({ onScan, onError, className = "" }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      // Initialize Html5Qrcode
      html5QrCode.current = new Html5Qrcode("qr-scanner");

      // Start scanning
      await html5QrCode.current.start(
        { facingMode: "environment" }, // Use back camera if available
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText, decodedResult) => {
          console.log("QR Code scanned:", decodedText);
          onScan(decodedText);
          stopScanning();
          toast({
            title: "QR Code Scanned",
            description: "Hall ticket verified successfully",
          });
        },
        (errorMessage) => {
          // Handle scan error silently - this fires constantly during scanning
          console.debug("QR scan error:", errorMessage);
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      setError(errorMessage);
      setIsScanning(false);
      onError?.(errorMessage);
      toast({
        title: "Scanner Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    if (html5QrCode.current && isScanning) {
      try {
        await html5QrCode.current.stop();
        await html5QrCode.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        html5QrCode.current = null;
        setIsScanning(false);
      }
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Scanner Container */}
      <div className="relative">
        <div
          id="qr-scanner"
          ref={scannerRef}
          className={`qr-scanner mx-auto ${isScanning ? 'border-primary border-solid' : ''}`}
          data-testid="qr-scanner-container"
        >
          {!isScanning && (
            <div className="text-center">
              <i className="fas fa-qrcode text-4xl text-primary mb-2"></i>
              <p className="text-muted-foreground text-sm mb-4">Click "Start QR Scanner" to begin camera scanning</p>
              <div className="w-12 h-12 border-2 border-primary rounded-lg mx-auto opacity-50"></div>
            </div>
          )}
        </div>

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-primary rounded-lg">
              <div className="relative w-full h-full">
                {/* Corner guides */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="text-center space-y-2">
        {!isScanning ? (
          <Button 
            onClick={startScanning}
            className="bg-primary text-primary-foreground"
            data-testid="button-start-scanning"
          >
            <i className="fas fa-camera mr-2"></i>Start QR Scanner
          </Button>
        ) : (
          <Button 
            onClick={stopScanning}
            variant="outline"
            data-testid="button-stop-scanning"
          >
            <i className="fas fa-stop mr-2"></i>Stop Scanner
          </Button>
        )}
        
        {isScanning && (
          <p className="text-sm text-muted-foreground">
            <i className="fas fa-info-circle mr-1"></i>
            Point camera at QR code to scan
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
            <div>
              <p className="text-red-700 text-sm font-medium">Scanner Error</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              <Button 
                size="sm" 
                className="mt-2" 
                onClick={() => {
                  setError(null);
                  startScanning();
                }}
                data-testid="button-retry-scanner"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      {!isScanning && !error && (
        <div className="bg-muted rounded-lg p-3 text-center">
          <h4 className="text-sm font-medium text-foreground mb-2">
            <i className="fas fa-info-circle text-blue-500 mr-1"></i>
            How to scan
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Click "Start QR Scanner" to begin</li>
            <li>• Hold your hall ticket QR code in front of camera</li>
            <li>• Keep the code within the scanning frame</li>
            <li>• Wait for automatic detection</li>
          </ul>
        </div>
      )}
    </div>
  );
}

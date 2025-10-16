import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import WebcamMonitor from "@/components/webcam-monitor";
import FaceDetection from "@/components/face-detection";
import { useWebcam } from "@/hooks/useWebcam";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { Html5Qrcode } from "html5-qrcode";

interface HallTicketData {
  id: string;
  examName: string;
  studentName: string;
  rollNumber: string;
  examDate: string;
  duration: number;
  studentIdBarcode?: string;
}

export default function IdentityVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hallTicketData, setHallTicketData] = useState<HallTicketData | null>(null);
  const [verificationStep, setVerificationStep] = useState<'barcode' | 'camera' | 'photo' | 'document' | 'complete'>('barcode');
  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [manualBarcodeEntry, setManualBarcodeEntry] = useState(false);
  const [manualBarcodeValue, setManualBarcodeValue] = useState("");
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const barcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentVerificationStatus, setDocumentVerificationStatus] = useState<'pending' | 'verifying' | 'verified' | 'failed'>('pending');
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Test mode detection for bypassing camera/verification - ONLY in explicit development
  const TEST_MODE = import.meta.env.NODE_ENV === 'development' ||
                   import.meta.env.VITE_TEST_MODE === 'true' || 
                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const { stream, isActive: cameraActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useWebcam();
  const { faceDetected, confidence } = useFaceDetection(stream);

  useEffect(() => {
    // Get hall ticket data from localStorage
    const storedData = localStorage.getItem("hallTicketData");
    if (!storedData) {
      toast({
        title: "No Hall Ticket Data",
        description: "Please complete authentication first",
        variant: "destructive",
      });
      setLocation("/student/auth");
      return;
    }
    
    try {
      setHallTicketData(JSON.parse(storedData));
    } catch (error) {
      toast({
        title: "Invalid Data",
        description: "Please complete authentication again",
        variant: "destructive",
      });
      setLocation("/student/auth");
    }
  }, [setLocation, toast]);

  // Check if barcode verification is required, skip if not
  useEffect(() => {
    if (hallTicketData && !hallTicketData.studentIdBarcode) {
      // No barcode required, skip to camera step
      setVerificationStep('camera');
      setBarcodeScanned(true);
    }
  }, [hallTicketData]);

  // Auto-start camera when component loads - only after barcode verification is complete
  useEffect(() => {
    if (barcodeScanned) {
      startCamera();
    }
  }, [barcodeScanned, startCamera]);

  // Initialize barcode scanner when needed
  useEffect(() => {
    const shouldShowScanner = hallTicketData?.studentIdBarcode && !barcodeScanned && !manualBarcodeEntry;
    
    if (shouldShowScanner && !barcodeScanning) {
      const initScanner = async () => {
        try {
          setBarcodeScanning(true);
          const scanner = new Html5Qrcode("barcode-reader");
          barcodeScannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // Barcode detected
              scanner.stop().then(() => {
                setBarcodeScanning(false);
                handleBarcodeValidation(decodedText);
              }).catch(console.error);
            },
            undefined
          );
        } catch (error) {
          console.error("Error starting barcode scanner:", error);
          setBarcodeScanning(false);
          toast({
            title: "Scanner Error",
            description: "Could not start barcode scanner. Please use manual entry.",
            variant: "destructive",
          });
        }
      };

      initScanner();
    }

    // Cleanup scanner on unmount or when manual entry is selected
    return () => {
      const scanner = barcodeScannerRef.current;
      if (scanner) {
        // Always clear the DOM element, regardless of stop() success
        scanner.stop()
          .catch((err) => {
            // Scanner might already be stopped, that's ok
            console.log("Scanner stop:", err?.message || "Already stopped");
          })
          .finally(() => {
            // Always clear the DOM element to release resources
            try {
              scanner.clear();
              setBarcodeScanning(false);
            } catch (error) {
              console.error("Error clearing scanner:", error);
            }
          });
      }
    };
  }, [hallTicketData, barcodeScanned, manualBarcodeEntry, barcodeScanning, toast]);

  // Camera error bypass for test mode and auto-verification
  useEffect(() => {
    if (TEST_MODE && cameraError && cameraError.includes('NotFoundError')) {
      toast({
        title: "Test Mode Active",
        description: "Camera not available - using test mode bypass",
        variant: "default",
      });
      
      // Auto-trigger verification if document is already uploaded and camera fails
      if (documentUploaded && documentVerificationStatus === 'verified') {
        setTimeout(() => {
          console.log("Auto-triggering verification due to no camera in test mode");
          performAIVerification();
        }, 2000);
      }
    }
  }, [TEST_MODE, cameraError, documentUploaded, documentVerificationStatus, toast]);

  const handleBarcodeValidation = (barcode: string) => {
    if (!hallTicketData?.studentIdBarcode) {
      // No barcode required, proceed
      setBarcodeScanned(true);
      setVerificationStep('camera');
      return;
    }

    if (barcode.trim() === hallTicketData.studentIdBarcode.trim()) {
      // Barcode matches
      setScannedBarcode(barcode);
      setBarcodeScanned(true);
      setVerificationStep('camera');
      toast({
        title: "Barcode Verified",
        description: "Student ID barcode verified successfully",
      });
    } else {
      // Barcode mismatch
      toast({
        title: "Invalid ID Verification",
        description: "The scanned barcode does not match your student ID. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcodeValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter your student ID barcode",
        variant: "destructive",
      });
      return;
    }
    handleBarcodeValidation(manualBarcodeValue);
  };

  const switchToManualEntry = async () => {
    // Always clear the DOM element, regardless of stop() success
    const scanner = barcodeScannerRef.current;
    if (scanner) {
      await scanner.stop()
        .catch((err) => {
          // Scanner might already be stopped, that's ok
          console.log("Scanner stop:", err?.message || "Already stopped");
        })
        .finally(() => {
          // Always clear the DOM element to release resources
          try {
            scanner.clear();
            setBarcodeScanning(false);
          } catch (error) {
            console.error("Error clearing scanner:", error);
          }
        });
    }
    setManualBarcodeEntry(true);
  };

  const switchToScanner = async () => {
    setManualBarcodeEntry(false);
    // Scanner will auto-initialize via useEffect
  };

  const handleCapturePhoto = async () => {
    try {
      const photoData = await capturePhoto();
      if (photoData) {
        setCapturedPhoto(photoData);
        setVerificationStep('document');
        toast({
          title: "Photo Captured",
          description: "Photo captured successfully. Please upload your ID document.",
        });
      }
    } catch (error) {
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const validateDocument = (file: File): { isValid: boolean; message: string } => {
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Please upload a valid image file (JPEG, PNG, or WebP)' };
    }
    
    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, message: 'File size must be less than 5MB' };
    }
    
    // File name validation (basic)
    if (file.name.length > 100) {
      return { isValid: false, message: 'File name is too long' };
    }
    
    return { isValid: true, message: 'Valid document format' };
  };

  const analyzeDocument = async (file: File): Promise<{ quality: 'good' | 'poor' | 'acceptable'; issues: string[] }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const issues: string[] = [];
        let quality: 'good' | 'poor' | 'acceptable' = 'good';
        
        // In development mode, be more lenient with requirements for testing
        const isDevelopment = import.meta.env.NODE_ENV === 'development' || import.meta.env.DEV;
        
        // Check image dimensions (relaxed for development)
        const minWidth = isDevelopment ? 200 : 400;
        const minHeight = isDevelopment ? 150 : 300;
        
        if (img.width < minWidth || img.height < minHeight) {
          if (isDevelopment) {
            issues.push('Low resolution image (acceptable for testing)');
            quality = 'acceptable';
          } else {
            issues.push('Image resolution is too low');
            quality = 'poor';
          }
        } else if (img.width < 800 || img.height < 600) {
          issues.push('Consider using a higher resolution image');
          quality = 'acceptable';
        }
        
        // Check aspect ratio (relaxed for development)
        const aspectRatio = img.width / img.height;
        const minRatio = isDevelopment ? 0.8 : 1.3;
        const maxRatio = isDevelopment ? 3.0 : 2.0;
        
        if (aspectRatio < minRatio || aspectRatio > maxRatio) {
          if (isDevelopment) {
            issues.push('Aspect ratio is non-standard (acceptable for testing)');
            if (quality === 'good') quality = 'acceptable';
          } else {
            issues.push('Image aspect ratio doesn\'t match typical ID cards');
            if (quality === 'good') quality = 'acceptable';
          }
        }
        
        URL.revokeObjectURL(url);
        resolve({ quality, issues });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ quality: 'poor', issues: ['Failed to analyze image'] });
      };
      
      img.src = url;
    });
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate document format
    const validation = validateDocument(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid Document",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    
    setDocumentVerificationStatus('verifying');
    
    try {
      // Create preview and wait for it to complete
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setDocumentPreview(preview);
      
      // Analyze document quality
      const analysis = await analyzeDocument(file);
      
      if (analysis.quality === 'poor') {
        setDocumentVerificationStatus('failed');
        setDocumentFile(null);
        setDocumentUploaded(false);
        toast({
          title: "Document Quality Issues",
          description: `Please upload a clearer image. Issues: ${analysis.issues.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      // Now set the file after all checks pass
      setDocumentFile(file);
      setDocumentUploaded(true);
      setDocumentVerificationStatus('verified');
      
      let message = "ID document uploaded successfully!";
      if (analysis.issues.length > 0) {
        message += ` Note: ${analysis.issues.join(', ')}`;
      }
      
      toast({
        title: "Document Uploaded",
        description: message,
      });
      
    } catch (error) {
      setDocumentVerificationStatus('failed');
      setDocumentFile(null);
      setDocumentUploaded(false);
      toast({
        title: "Verification Failed",
        description: "Failed to process the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const retryDocumentUpload = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
    setDocumentVerificationStatus('pending');
    setDocumentUploaded(false);
  };

  const bypassCameraForTesting = () => {
    setCapturedPhoto("test-mode-photo");
    setVerificationStep('document');
    toast({
      title: "Test Mode Bypass",
      description: "Camera verification bypassed for testing",
      variant: "default",
    });
    
    // Auto-trigger verification if document is already uploaded
    if (documentUploaded && documentVerificationStatus === 'verified') {
      setTimeout(() => {
        console.log("Auto-triggering AI verification after camera bypass");
        performAIVerification();
      }, 1000);
    }
  };

  const bypassDocumentForTesting = () => {
    setDocumentUploaded(true);
    setDocumentVerificationStatus('verified');
    setVerificationStep('complete');
    toast({
      title: "Test Mode Bypass",
      description: "Document verification bypassed for testing",
      variant: "default",
    });
  };

  // AI verification function with proper error handling
  const performAIVerification = async () => {
    if (!hallTicketData) {
      toast({
        title: "Error",
        description: "Hall ticket data missing",
        variant: "destructive",
      });
      return;
    }

    if (!documentFile || !documentPreview) {
      toast({
        title: "Error", 
        description: "Please upload your ID document first",
        variant: "destructive",
      });
      setDocumentVerificationStatus('failed');
      return;
    }

    if (!capturedPhoto) {
      toast({
        title: "Error",
        description: "Please capture your photo first",
        variant: "destructive",
      });
      return;
    }

    try {
      setDocumentVerificationStatus('verifying');
      setVerificationResult(null);
      
      console.log("Starting AI verification...");
      
      // Convert document file to base64
      const documentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1]; // Remove data:image/... prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(documentFile);
      });

      // Extract base64 from photo (remove data URL prefix if present)
      const photoBase64 = capturedPhoto.includes(',') ? capturedPhoto.split(',')[1] : capturedPhoto;

      const requestData = {
        idCardImage: documentBase64,
        selfieImage: photoBase64,
        expectedName: hallTicketData.studentName,
        expectedIdNumber: hallTicketData.rollNumber,
        hallTicketId: hallTicketData.id
      };

      console.log("Calling verification API...");
      
      const response = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Verification failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Verification result:", result);

      setVerificationResult(result);

      // Proceed if backend confirms documents are valid
      if (result.isValid) {
        setDocumentVerificationStatus('verified');
        setVerificationStep('complete');
        
        const confidencePercent = result.confidence ? Math.round(result.confidence * 100) : 85;
        const message = result.reasons?.[0] || `Identity verified with ${confidencePercent}% confidence. You can now start your exam.`;
        
        toast({
          title: "Verification Complete! ✅",
          description: message,
        });
      } else {
        setDocumentVerificationStatus('failed');
        toast({
          title: "Verification Failed",
          description: result.reasons?.join('. ') || "Identity verification failed. Please check your documents and try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Verification error:", error);
      setDocumentVerificationStatus('failed');
      
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify identity. Please try manual verification.",
        variant: "destructive",
      });
    }
  };

  // Manual verification - just save the ID for admin review
  const skipToManualVerification = async () => {
    if (!hallTicketData) {
      toast({
        title: "Error",
        description: "Hall ticket data missing",
        variant: "destructive",
      });
      return;
    }

    if (!documentFile || !documentPreview) {
      toast({
        title: "Error",
        description: "Please upload your ID document first",
        variant: "destructive",
      });
      return;
    }

    try {
      setDocumentVerificationStatus('verifying');
      
      // Convert document file to base64
      const documentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(documentFile);
      });

      // Store the document for manual verification
      const response = await fetch('/api/store-identity-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hallTicketId: hallTicketData.id,
          studentName: hallTicketData.studentName,
          rollNumber: hallTicketData.rollNumber,
          documentImage: documentBase64,
          selfieImage: capturedPhoto || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save document');
      }

      const result = await response.json();
      
      if (result.success) {
        setDocumentVerificationStatus('verified');
        setVerificationStep('complete');
        
        const message = result.stored 
          ? "Your ID has been saved for admin review. You can now start your exam."
          : "Your documents have been received. You can proceed to your exam while we process them.";
        
        toast({
          title: "Documents Saved ✅",
          description: message,
        });
      } else {
        throw new Error('Document storage failed');
      }

    } catch (error) {
      console.error("Manual verification error:", error);
      setDocumentVerificationStatus('failed');
      
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContinueToExam = () => {
    // Store verification completion
    localStorage.setItem("verificationComplete", "true");
    setLocation("/student/exam");
  };

  const getVerificationStatus = (step: string) => {
    switch (step) {
      case 'camera':
        return faceDetected ? 'completed' : cameraActive ? 'active' : 'pending';
      case 'photo':
        return capturedPhoto ? 'completed' : verificationStep === 'photo' ? 'active' : 'pending';
      case 'document':
        return documentUploaded ? 'completed' : verificationStep === 'document' ? 'active' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <i className="fas fa-check-circle text-green-500"></i>;
      case 'active':
        return <i className="fas fa-clock text-yellow-500"></i>;
      default:
        return <i className="fas fa-circle text-gray-400"></i>;
    }
  };

  if (!hallTicketData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-accent flex items-center justify-center p-4">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-10">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/student/auth")} 
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          data-testid="button-back"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back
        </Button>
      </div>
      
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-id-card text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
          <p className="text-white/80 mt-2">Please verify your identity before starting the exam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Process */}
          <div className="space-y-6">
            {/* Barcode Scanning - only show if barcode is required */}
            {hallTicketData?.studentIdBarcode && !barcodeScanned && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <i className="fas fa-barcode text-accent"></i>
                    <span>Scan Student ID Barcode</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted">
                      <i className="fas fa-barcode text-4xl text-muted-foreground mb-4"></i>
                      <p className="font-medium mb-2">Scan or enter your student ID barcode</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        This verifies your identity using your college ID card
                      </p>
                      
                      {!manualBarcodeEntry ? (
                        <div className="space-y-3">
                          <div id="barcode-reader" className="w-full min-h-[250px]"></div>
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={switchToManualEntry}
                              variant="outline"
                              data-testid="button-manual-barcode"
                            >
                              <i className="fas fa-keyboard mr-2"></i>
                              Enter Manually
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Input
                            placeholder="Enter student ID barcode"
                            value={manualBarcodeValue}
                            onChange={(e) => setManualBarcodeValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleManualBarcodeSubmit()}
                            data-testid="input-manual-barcode"
                          />
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={handleManualBarcodeSubmit}
                              className="bg-accent hover:opacity-90"
                              data-testid="button-submit-barcode"
                            >
                              <i className="fas fa-check mr-2"></i>
                              Verify Barcode
                            </Button>
                            <Button
                              onClick={switchToScanner}
                              variant="outline"
                              data-testid="button-scan-barcode"
                            >
                              <i className="fas fa-camera mr-2"></i>
                              Scan Instead
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Live Photo Capture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-video text-accent"></i>
                  <span>Live Photo Capture</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <WebcamMonitor 
                    stream={stream}
                    isActive={cameraActive}
                    error={cameraError}
                    onStartCamera={startCamera}
                    onStopCamera={stopCamera}
                  />
                  <FaceDetection stream={stream} />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        onClick={cameraActive ? handleCapturePhoto : startCamera}
                        disabled={cameraActive && !faceDetected}
                        className="bg-accent hover:opacity-90"
                        data-testid="button-capture-photo"
                      >
                        <i className={`fas ${cameraActive ? 'fa-camera' : 'fa-video'} mr-2`}></i>
                        {cameraActive ? 'Capture Photo' : 'Start Camera'}
                      </Button>
                      {TEST_MODE && (cameraError || !cameraActive) && (
                        <Button
                          onClick={bypassCameraForTesting}
                          variant="outline"
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          data-testid="button-bypass-camera"
                        >
                          <i className="fas fa-forward mr-2"></i>
                          Bypass Camera (Test)
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`status-indicator ${faceDetected ? 'status-online' : 'status-warning'}`}></div>
                      <span className="text-sm text-muted-foreground">
                        {faceDetected ? `Face Detected (${Math.round(confidence * 100)}%)` : 'No Face Detected'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ID Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-id-card text-accent"></i>
                  <span>ID Document Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted">
                  {documentVerificationStatus === 'verified' ? (
                    <div className="text-green-600">
                      <i className="fas fa-check-circle text-3xl mb-4"></i>
                      <p className="font-medium">Document verified successfully</p>
                      {documentPreview && (
                        <div className="mt-4">
                          <img 
                            src={documentPreview} 
                            alt="Uploaded document" 
                            className="max-w-32 max-h-24 object-cover rounded-lg mx-auto border"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{documentFile?.name}</p>
                        </div>
                      )}
                    </div>
                  ) : documentVerificationStatus === 'verifying' ? (
                    <div className="text-blue-600">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="font-medium">Verifying document...</p>
                      <p className="text-sm text-muted-foreground mt-2">Analyzing image quality and format</p>
                      {documentPreview && (
                        <div className="mt-4">
                          <img 
                            src={documentPreview} 
                            alt="Uploaded document" 
                            className="max-w-32 max-h-24 object-cover rounded-lg mx-auto border opacity-75"
                          />
                        </div>
                      )}
                    </div>
                  ) : documentVerificationStatus === 'failed' ? (
                    <div className="text-red-600">
                      <i className="fas fa-exclamation-triangle text-3xl mb-4"></i>
                      <p className="font-medium">Document verification failed</p>
                      <p className="text-sm text-muted-foreground mt-2">Please upload a clearer image</p>
                      {documentPreview && (
                        <div className="mt-4">
                          <img 
                            src={documentPreview} 
                            alt="Uploaded document" 
                            className="max-w-32 max-h-24 object-cover rounded-lg mx-auto border opacity-50"
                          />
                        </div>
                      )}
                      <div className="mt-3 flex gap-2 justify-center">
                        <Button 
                          onClick={retryDocumentUpload}
                          className="bg-primary hover:opacity-90"
                          data-testid="button-retry-document"
                        >
                          <i className="fas fa-redo mr-2"></i>Try Again
                        </Button>
                        {TEST_MODE && (
                          <Button
                            onClick={bypassDocumentForTesting}
                            variant="outline"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            data-testid="button-bypass-document"
                          >
                            <i className="fas fa-forward mr-2"></i>
                            Bypass (Test)
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fas fa-id-card text-3xl text-muted-foreground mb-4"></i>
                      <p className="text-muted-foreground mb-4">
                        Upload your student ID or government-issued ID
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Supported formats: JPEG, PNG, WebP • Max size: 5MB
                      </p>
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleDocumentUpload}
                          className="hidden"
                          id="document-upload"
                          data-testid="input-document-upload"
                        />
                        <label htmlFor="document-upload">
                          <Button asChild className="bg-primary hover:opacity-90">
                            <span>
                              <i className="fas fa-upload mr-2"></i>Choose File
                            </span>
                          </Button>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Information & Progress */}
          <div className="space-y-6">
            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-xl p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <i className="fas fa-user text-white text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{hallTicketData.studentName}</h4>
                      <p className="text-muted-foreground">Hall Ticket: {hallTicketData.id}</p>
                      <p className="text-muted-foreground">Roll: {hallTicketData.rollNumber}</p>
                      <p className="text-muted-foreground">Exam: {hallTicketData.examName}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hall Ticket Verified:</span>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-check-circle text-green-500"></i>
                        <span className="text-green-600 font-medium">Valid</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Photo Match:</span>
                      <div className="flex items-center space-x-2">
                        {capturedPhoto ? (
                          <>
                            <i className="fas fa-check-circle text-green-500"></i>
                            <span className="text-green-600 font-medium">Captured</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-clock text-yellow-500"></i>
                            <span className="text-yellow-600 font-medium">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ID Document:</span>
                      <div className="flex items-center space-x-2">
                        {documentUploaded ? (
                          <>
                            <i className="fas fa-check-circle text-green-500"></i>
                            <span className="text-green-600 font-medium">Verified</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-exclamation-circle text-yellow-500"></i>
                            <span className="text-yellow-600 font-medium">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-check-circle text-green-500"></i>
                      <span className="text-green-800">Hall ticket validated</span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    capturedPhoto 
                      ? 'bg-green-50 border-green-200' 
                      : faceDetected 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(getVerificationStatus('photo'))}
                      <span className={
                        capturedPhoto 
                          ? 'text-green-800' 
                          : faceDetected 
                            ? 'text-yellow-800'
                            : 'text-gray-600'
                      }>
                        Live photo captured
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    documentUploaded 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(getVerificationStatus('document'))}
                      <span className={documentUploaded ? 'text-green-800' : 'text-gray-600'}>
                        ID document verified
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Actions */}
            {capturedPhoto && documentUploaded && verificationStep !== 'complete' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Ready for Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-blue-800">
                    You can verify your identity automatically using AI, or save your documents for manual verification by the admin.
                  </p>
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={performAIVerification}
                      disabled={documentVerificationStatus === 'verifying'}
                      data-testid="button-ai-verify"
                    >
                      <i className="fas fa-robot mr-2"></i>
                      {documentVerificationStatus === 'verifying' ? 'Verifying...' : 'AI Verification (Automatic)'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={skipToManualVerification}
                      disabled={documentVerificationStatus === 'verifying'}
                      data-testid="button-manual-verify"
                    >
                      <i className="fas fa-user-check mr-2"></i>
                      Skip to Manual Verification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Reset verification
                  setCapturedPhoto(null);
                  setDocumentUploaded(false);
                  setDocumentFile(null);
                  setDocumentPreview(null);
                  setDocumentVerificationStatus('pending');
                  setVerificationStep('camera');
                  if (cameraActive) stopCamera();
                }}
                data-testid="button-retry"
              >
                <i className="fas fa-redo mr-2"></i>Retry Verification
              </Button>
              <Button 
                className="flex-1 bg-primary hover:opacity-90"
                disabled={verificationStep !== 'complete'}
                onClick={handleContinueToExam}
                data-testid="button-continue"
              >
                <i className="fas fa-arrow-right mr-2"></i>Continue to Exam
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X, CheckCircle2, ExternalLink, AlertCircle, RefreshCw, QrCode } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (decodedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // Initialize camera list on modal open
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedResult(null);
      setErrorMessage(null);
      return;
    }

    Html5Qrcode.getCameras()
      .then((deviceList) => {
        if (deviceList && deviceList.length > 0) {
          setCameras(deviceList);
          // Prefer back camera if available
          const backCam = deviceList.find((cam) =>
            cam.label.toLowerCase().includes('back') ||
            cam.label.toLowerCase().includes('traseira') ||
            cam.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : deviceList[0].id);
        } else {
          setCameras([]);
        }
      })
      .catch((err) => {
        console.warn('Erro ao obter câmeras:', err);
        setCameras([]);
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId?: string) => {
    setErrorMessage(null);
    setScannedResult(null);

    const camIdToUse = cameraId || selectedCameraId;

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(scannerContainerId);
      } else {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      }

      const cameraConfig = camIdToUse ? { deviceId: { exact: camIdToUse } } : { facingMode: 'environment' };

      await html5QrcodeRef.current.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          handleScanFound(decodedText);
        },
        (error) => {
          // Ignore verbose frame scan errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setIsScanning(false);
      setErrorMessage('Não foi possível acessar a câmera. Verifique se o navegador possui permissão de uso da câmera.');
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        await html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Erro ao parar scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanFound = async (text: string) => {
    await stopScanner();
    setScannedResult(text);
    if (onScanSuccess) {
      onScanSuccess(text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setScannedResult(null);

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-file-temp');
      const decodedText = await html5Qrcode.scanFile(file, true);
      handleScanFound(decodedText);
    } catch (err) {
      console.error('Erro ao ler arquivo QR Code:', err);
      setErrorMessage('Não foi possível reconhecer um QR Code válido na imagem selecionada. Tente outra foto mais nítida.');
    }
  };

  const handleOpenScannedUrl = () => {
    if (!scannedResult) return;
    if (scannedResult.startsWith('http://') || scannedResult.startsWith('https://')) {
      window.location.href = scannedResult;
    } else {
      alert(`Conteúdo do QR Code lido: ${scannedResult}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[--color-primary-600]" />
            <h3 className="font-bold text-slate-800 text-lg">Leitor de QR Code</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => {
                setActiveTab('camera');
                setScannedResult(null);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'camera'
                  ? 'bg-white text-[--color-primary-600] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" /> Câmera
            </button>
            <button
              onClick={() => {
                stopScanner();
                setActiveTab('file');
                setScannedResult(null);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'file'
                  ? 'bg-white text-[--color-primary-600] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" /> Enviar Foto
            </button>
          </div>

          {/* Success Box */}
          {scannedResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">QR Code Lido com Sucesso!</h4>
                <p className="text-xs text-emerald-700 mt-1 break-all font-mono bg-white/70 p-2 rounded-lg border border-emerald-200">
                  {scannedResult}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {scannedResult.startsWith('http') && (
                  <button
                    onClick={handleOpenScannedUrl}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Acessar Link e Sincronizar
                  </button>
                )}
                <button
                  onClick={() => {
                    setScannedResult(null);
                    if (activeTab === 'camera') startScanner();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Escanear outro QR Code
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Camera View */}
          {activeTab === 'camera' && !scannedResult && (
            <div className="space-y-3">
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-slate-200">
                <div id={scannerContainerId} className="w-full h-full" />
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-3">
                    <Camera className="w-10 h-10 text-slate-500 animate-pulse" />
                    <p className="text-xs">
                      Clique abaixo para ativar a câmera e apontar para o QR Code de outro aparelho.
                    </p>
                    <button
                      onClick={() => startScanner()}
                      className="bg-[--color-primary-600] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[--color-primary-700] transition-colors shadow-md"
                    >
                      Ativar Câmera
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Selector */}
              {cameras.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Câmera:</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) startScanner(e.target.value);
                    }}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Câmera ${cam.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isScanning && (
                <div className="flex justify-center">
                  <button
                    onClick={stopScanner}
                    className="text-xs text-slate-500 hover:text-red-600 font-medium py-1"
                  >
                    Pausar Câmera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* File Upload View */}
          {activeTab === 'file' && !scannedResult && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-[--color-primary-500] hover:bg-slate-50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-slate-100 rounded-full text-slate-600">
                  <Upload className="w-6 h-6 text-[--color-primary-600]" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Selecione uma Imagem com QR Code</p>
                <p className="text-xs text-slate-400">Clique para escolher uma imagem da sua galeria ou arquivos</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div id="qr-reader-file-temp" className="hidden" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

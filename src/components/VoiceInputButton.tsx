import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  isRequestingPermission: boolean;
  error: string | null;
  confidence: number;
  onStartListening: () => void;
  onRequestPermission: () => Promise<boolean>;
  disabled?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isListening,
  isSupported,
  permissionStatus,
  isRequestingPermission,
  error,
  confidence,
  onStartListening,
  onRequestPermission,
  disabled = false
}) => {
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const handleClick = async () => {
    if (!isSupported) {
      setShowPermissionGuide(true);
      return;
    }

    if (permissionStatus === 'denied') {
      setShowPermissionGuide(true);
      return;
    }

    if (permissionStatus !== 'granted') {
      const granted = await onRequestPermission();
      if (!granted) {
        setShowPermissionGuide(true);
        return;
      }
    }

    onStartListening();
  };

  const getButtonStyle = () => {
    if (disabled) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    }
    
    if (isListening) {
      return 'bg-red-500 text-white shadow-lg animate-pulse';
    }
    
    if (permissionStatus === 'denied') {
      return 'bg-red-100 text-red-700 hover:bg-red-200';
    }
    
    if (permissionStatus === 'granted') {
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    }
    
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  const getButtonText = () => {
    if (isRequestingPermission) return '許可要求中...';
    if (isListening) return '録音停止';
    if (permissionStatus === 'denied') return '許可が必要';
    if (permissionStatus === 'granted') return '音声入力';
    return '音声入力';
  };

  const getIcon = () => {
    if (isRequestingPermission) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (isListening) {
      return <MicOff className="w-4 h-4" />;
    }
    if (permissionStatus === 'denied') {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <Mic className="w-4 h-4" />;
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={disabled || isRequestingPermission}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${getButtonStyle()}`}
        >
          {getIcon()}
          <span>{getButtonText()}</span>
        </button>

        {/* 録音中のビジュアルフィードバック */}
        {isListening && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        )}

        {/* 信頼度表示 */}
        {isListening && confidence > 0 && (
          <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
            信頼度: {Math.round(confidence * 100)}%
          </div>
        )}
      </div>

      {/* 権限ガイドモーダル */}
      {showPermissionGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Volume2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">音声入力の設定</h3>
            </div>

            {!isSupported ? (
              <div className="space-y-4">
                <p className="text-gray-700">
                  お使いのブラウザは音声入力をサポートしていません。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">対応ブラウザ</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Google Chrome（推奨）</li>
                    <li>• Microsoft Edge</li>
                    <li>• Safari（iOS/macOS）</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700">
                  音声入力を使用するには、マイクへのアクセスを許可してください。
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Chrome / Edge での設定方法</h4>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>アドレスバー左側の🔒または🎤アイコンをクリック</li>
                    <li>「マイク」を「許可」に変更</li>
                    <li>ページを再読み込み</li>
                  </ol>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Safari での設定方法</h4>
                  <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                    <li>アドレスバー左側の「AA」をクリック</li>
                    <li>「このWebサイトの設定」を選択</li>
                    <li>「マイク」を「許可」に変更</li>
                  </ol>
                </div>

                {permissionStatus !== 'denied' && (
                  <button
                    onClick={async () => {
                      const granted = await onRequestPermission();
                      if (granted) {
                        setShowPermissionGuide(false);
                      }
                    }}
                    disabled={isRequestingPermission}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    {isRequestingPermission ? (
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>許可要求中...</span>
                      </div>
                    ) : (
                      'マイクアクセスを許可'
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPermissionGuide(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
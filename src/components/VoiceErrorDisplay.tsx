import React from 'react';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

interface VoiceErrorDisplayProps {
  error: string | null;
  onRetry: () => void;
  onShowHelp: () => void;
}

export const VoiceErrorDisplay: React.FC<VoiceErrorDisplayProps> = ({
  error,
  onRetry,
  onShowHelp
}) => {
  if (!error) return null;

  const isPermissionError = error.includes('許可') || error.includes('拒否');
  const isNetworkError = error.includes('ネットワーク') || error.includes('接続');
  const isHardwareError = error.includes('マイク') && error.includes('見つかりません');

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 mb-2">音声入力エラー</h4>
          <div className="text-sm text-red-700 whitespace-pre-line leading-relaxed">
            {error}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {!isPermissionError && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>再試行</span>
              </button>
            )}
            
            <button
              onClick={onShowHelp}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              <span>詳しい設定方法</span>
            </button>
          </div>

          {/* 追加のヒント */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-xs font-medium text-blue-900 mb-1">💡 ヒント</h5>
            <div className="text-xs text-blue-800">
              {isPermissionError && (
                <p>ブラウザの設定でマイクアクセスを許可してください。設定後はページの再読み込みが必要です。</p>
              )}
              {isNetworkError && (
                <p>インターネット接続を確認し、しばらく時間をおいてから再度お試しください。</p>
              )}
              {isHardwareError && (
                <p>マイクが正しく接続されているか、他のアプリで使用中でないか確認してください。</p>
              )}
              {!isPermissionError && !isNetworkError && !isHardwareError && (
                <p>問題が続く場合は、ブラウザを再起動するか、テキスト入力をご利用ください。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
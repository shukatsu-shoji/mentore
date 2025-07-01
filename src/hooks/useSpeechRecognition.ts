import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionHook {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  isSupported: boolean;
  confidence: number;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  isRequestingPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ブラウザサポートの確認を改善
  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // 権限状態の監視
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (!navigator.permissions) {
      setPermissionStatus('unknown');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(permission.state as any);
      
      // 権限状態の変更を監視
      permission.onchange = () => {
        setPermissionStatus(permission.state as any);
      };
    } catch (error) {
      console.log('Permission API not supported:', error);
      setPermissionStatus('unknown');
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('お使いのブラウザは音声入力をサポートしていません。Chrome、Edge、Safariの最新版をお試しください。');
      return false;
    }

    setIsRequestingPermission(true);
    setError(null);

    try {
      // 明示的にマイクアクセスを要求
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // ストリームを保存（後でクリーンアップ用）
      streamRef.current = stream;
      
      // 権限が取得できた場合
      setPermissionStatus('granted');
      console.log('マイクアクセス許可が取得されました');
      
      return true;
    } catch (error: any) {
      console.error('マイクアクセス要求エラー:', error);
      
      let errorMessage = 'マイクへのアクセスが拒否されました。';
      
      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        errorMessage = `マイクの使用が許可されていません。

【解決方法】
1. ブラウザのアドレスバー左側の🔒または🎤アイコンをクリック
2. 「マイク」を「許可」に変更
3. ページを再読み込みして再度お試しください

【Chrome/Edge】アドレスバー左の🔒 → サイトの設定 → マイク → 許可
【Safari】アドレスバー左のAA → このWebサイトの設定 → マイク → 許可`;
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'マイクが見つかりません。マイクが正しく接続されているか確認してください。';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'マイクが他のアプリケーションで使用中です。他のアプリを閉じてから再度お試しください。';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'マイクの設定に問題があります。ブラウザを再起動してお試しください。';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'セキュリティ上の理由でマイクにアクセスできません。HTTPSサイトでのみ利用可能です。';
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('お使いのブラウザは音声認識をサポートしていません。Chrome、Edge、Safariなどの対応ブラウザをお使いください。');
      return;
    }

    // 既に録音中の場合は停止
    if (isListening) {
      stopListening();
      return;
    }

    setError(null);

    // 権限チェック
    if (permissionStatus === 'denied') {
      setError(`マイクの使用が拒否されています。

【解決方法】
1. ブラウザのアドレスバー左側の🔒または🎤アイコンをクリック
2. 「マイク」を「許可」に変更
3. ページを再読み込みして再度お試しください`);
      return;
    }

    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      // SpeechRecognitionの初期化
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      
      // 設定の最適化
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      // より積極的な音声検出
      if ('webkitSpeechRecognition' in window) {
        recognition.webkitServiceType = 'search';
      }
      
      recognition.onstart = () => {
        console.log('音声認識開始');
        setIsListening(true);
        setError(null);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        // 結果の処理を改善
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcriptText;
            setConfidence(result[0].confidence || 0.8);
            console.log('確定テキスト:', transcriptText);
          }
        }
        
        // 確定したテキストのみを追加
        if (finalTranscript.trim()) {
          setTranscript(prev => {
            const newText = prev + (prev ? ' ' : '') + finalTranscript.trim();
            console.log('更新されたテキスト:', newText);
            return newText;
          });
        }
        
        // 自動停止タイマーをリセット
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            console.log('無音により自動停止');
            recognitionRef.current.stop();
          }
        }, 5000); // 5秒間無音で自動停止
      };
      
      recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error);
        setIsListening(false);
        
        let errorMessage = '音声認識でエラーが発生しました。';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = `音声が検出されませんでした。

【対処方法】
• マイクに近づいて、はっきりと話してください
• 周囲の騒音を減らしてください
• マイクが正しく動作しているか確認してください`;
            break;
          case 'audio-capture':
            errorMessage = `マイクにアクセスできません。

【対処方法】
• マイクが正しく接続されているか確認
• 他のアプリでマイクを使用していないか確認
• ブラウザを再起動してお試しください`;
            break;
          case 'not-allowed':
            setPermissionStatus('denied');
            errorMessage = `マイクの使用が許可されていません。

【解決方法】
1. アドレスバー左の🔒または🎤をクリック
2. 「マイク」を「許可」に変更
3. ページを再読み込み

【Chrome】🔒 → サイトの設定 → マイク → 許可
【Edge】🔒 → このサイトのアクセス許可 → マイク → 許可`;
            break;
          case 'network':
            errorMessage = `ネットワークエラーが発生しました。

【対処方法】
• インターネット接続を確認してください
• しばらく時間をおいて再度お試しください`;
            break;
          case 'service-not-allowed':
            errorMessage = `音声認識サービスが利用できません。

【対処方法】
• ブラウザを最新版に更新してください
• しばらく時間をおいて再度お試しください`;
            break;
          case 'bad-grammar':
            errorMessage = `音声認識の設定に問題があります。

【対処方法】
• ページを再読み込みしてください
• ブラウザのキャッシュをクリアしてください`;
            break;
          case 'language-not-supported':
            errorMessage = '日本語の音声認識がサポートされていません。ブラウザを最新版に更新してください。';
            break;
          default:
            errorMessage = `音声認識エラー: ${event.error}

【対処方法】
• ブラウザを再起動してお試しください
• 問題が続く場合は、別のブラウザをお試しください`;
        }
        
        setError(errorMessage);
      };
      
      recognition.onend = () => {
        console.log('音声認識終了');
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
      
      // 音声認識を開始
      recognition.start();
      
    } catch (error) {
      console.error('音声認識の初期化に失敗:', error);
      setError(`音声認識の初期化に失敗しました。

【対処方法】
• ブラウザを再起動してお試しください
• Chrome、Edge、Safariの最新版をお使いください
• 問題が続く場合は、テキスト入力をご利用ください`);
      setIsListening(false);
    }
  }, [isSupported, isListening, permissionStatus, requestPermission]);

  const stopListening = useCallback(() => {
    console.log('音声認識停止要求');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    console.log('テキストクリア');
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  // クリーンアップの改善
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('音声認識停止エラー:', error);
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ページの可視性変更時の処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isListening) {
        console.log('ページが非表示になったため音声認識を停止');
        stopListening();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isListening, stopListening]);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
    confidence,
    error,
    permissionStatus,
    isRequestingPermission,
    requestPermission
  };
};

// グローバル型定義の拡張
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
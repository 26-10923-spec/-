import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Smartphone, 
  QrCode, 
  Share, 
  PlusSquare, 
  X, 
  Check, 
  Copy, 
  Sparkles, 
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'INSTALL' | 'QR'>('INSTALL');
  const [copied, setCopied] = useState<boolean>(false);
  const [appUrl, setAppUrl] = useState<string>('');

  useEffect(() => {
    // Detect URL
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.href);

      // Detect standalone mode
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      // Listen for Android beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Detect installed
      window.addEventListener('appinstalled', () => {
        setIsStandalone(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
      setShowModal(false);
    } else {
      setShowModal(true);
    }
  };

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Top Floating PWA Status / Action Bar */}
      <div className="flex items-center gap-1.5">
        {isStandalone ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PWA 앱 설치됨</span>
            <span className="sm:hidden">앱 모드</span>
          </div>
        ) : (
          <button
            id="btn-open-pwa-modal"
            onClick={() => {
              setActiveTab('INSTALL');
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 border border-cyan-400/40 transition-all active:scale-95"
            title="스마트폰에 앱으로 설치하기"
          >
            <Smartphone className="w-3.5 h-3.5 animate-bounce" />
            <span>앱 설치</span>
          </button>
        )}

        <button
          id="btn-open-qr-modal"
          onClick={() => {
            setActiveTab('QR');
            setShowModal(true);
          }}
          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title="모바일 접속용 QR 코드 보기"
        >
          <QrCode className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* Main PWA Install & QR Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-4 overflow-hidden"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">PWA 모바일 앱 설치</h3>
                    <p className="text-xs text-slate-400">스마트폰 홈 화면에 추가하여 진짜 앱처럼 즐기세요</p>
                  </div>
                </div>
                <button
                  id="btn-close-pwa-modal"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
                <button
                  id="btn-tab-install"
                  onClick={() => setActiveTab('INSTALL')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'INSTALL'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>설치 가이드</span>
                </button>
                <button
                  id="btn-tab-qr"
                  onClick={() => setActiveTab('QR')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'QR'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR 코드 스캔</span>
                </button>
              </div>

              {/* TAB 1: INSTALL GUIDE */}
              {activeTab === 'INSTALL' && (
                <div className="flex flex-col gap-4 py-1">
                  {/* Android 1-Click Install Button if supported */}
                  {deferredPrompt && (
                    <button
                      id="btn-trigger-native-install"
                      onClick={handleInstallClick}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>지금 즉시 앱으로 설치하기</span>
                    </button>
                  )}

                  {/* iOS Safari Guide */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      iOS (아이폰 / 아이패드 사파리)
                    </div>
                    <ol className="text-xs text-slate-300 flex flex-col gap-2 list-decimal list-inside pl-1 leading-relaxed">
                      <li>
                        하단 툴바의 <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"><Share className="w-3 h-3 text-cyan-400" /> 공유</strong> 버튼을 누릅니다.
                      </li>
                      <li>
                        메뉴를 스크롤하여 <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"><PlusSquare className="w-3 h-3 text-cyan-400" /> 홈 화면에 추가</strong>를 선택합니다.
                      </li>
                      <li>
                        우측 상단의 <strong className="text-cyan-300">추가</strong>를 누르면 홈 화면에 전체 화면 독립 실행형 앱으로 설치됩니다!
                      </li>
                    </ol>
                  </div>

                  {/* Android Chrome Guide */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Android (크롬 / 삼성 인터넷)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      브라우저 우측 상단 <strong>메뉴(⋮)</strong>를 누른 후 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 누르시면 네이티브 앱처럼 설치됩니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-900/50 text-[11px] text-cyan-300/90">
                    <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>설치 후 홈 화면의 아이콘으로 실행하면 주소창 없는 전체 화면으로 실행됩니다.</span>
                  </div>
                </div>
              )}

              {/* TAB 2: QR CODE */}
              {activeTab === 'QR' && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-3.5 bg-white rounded-2xl shadow-xl shadow-cyan-950/40 border-4 border-cyan-500/40">
                    <QRCodeSVG
                      value={appUrl || 'https://localhost:3000'}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-xs text-center text-slate-300 leading-relaxed max-w-xs">
                    스마트폰 기본 카메라로 위 QR 코드를 비추면 모바일 브라우저로 즉시 열립니다.
                  </p>

                  <div className="w-full flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      readOnly
                      value={appUrl}
                      className="flex-1 bg-transparent text-xs text-slate-300 outline-none px-1 truncate font-mono"
                    />
                    <button
                      id="btn-copy-app-url"
                      onClick={handleCopyUrl}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1 border border-slate-700 transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '복사됨' : '복사'}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

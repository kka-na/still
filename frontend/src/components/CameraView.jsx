import { useState, useEffect, useRef, useCallback } from 'react';
import { uploadPhoto, setReference } from '../api';

// Draw image with object-fit: cover semantics onto a canvas context
function drawImageCover(ctx, img, cw, ch) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let dw, dh, dx, dy;
  if (ir > cr) {
    dh = ch; dw = img.naturalWidth * (ch / img.naturalHeight);
    dx = (cw - dw) / 2; dy = 0;
  } else {
    dw = cw; dh = img.naturalHeight * (cw / img.naturalWidth);
    dx = 0; dy = (ch - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

export default function CameraView({ category, onBack, onPhotoTaken }) {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streamReady, setStreamReady] = useState(false);
  const [refImage, setRefImage] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [error, setError] = useState(null);
  const [showRefOptions, setShowRefOptions] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');

  // ─── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setStreamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamReady(true);
    } catch (err) {
      setError('카메라를 시작할 수 없어요. 카메라 권한을 확인해주세요.');
      console.error(err);
    }
  }, []);

  // ─── Load reference image ──────────────────────────────────────────────────
  const loadReference = useCallback(() => {
    if (!category.hasReference) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = `/uploads/${category.id}/reference.jpg?t=${Date.now()}`;
    img.onload = () => setRefImage(img);
    img.onerror = () => setRefImage(null);
  }, [category]);

  useEffect(() => {
    startCamera(facingMode);
    loadReference();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ─── Draw reference overlay ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !refImage || !streamReady) return;

    const draw = () => {
      if (!video.videoWidth) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = overlayOpacity;
      drawImageCover(ctx, refImage, canvas.width, canvas.height);
    };

    // Draw when video metadata loads
    if (video.readyState >= 1) draw();
    video.addEventListener('loadedmetadata', draw);
    return () => video.removeEventListener('loadedmetadata', draw);
  }, [refImage, streamReady, overlayOpacity]);

  // ─── Capture ───────────────────────────────────────────────────────────────
  const capture = async () => {
    if (capturing || !videoRef.current?.videoWidth) return;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      try {
        const fd = new FormData();
        fd.append('photo', blob, 'photo.jpg');
        await uploadPhoto(category.id, fd);

        // Flash effect
        setFlash(true);
        setTimeout(() => setFlash(false), 200);

        const newCount = photoCount + 1;
        setPhotoCount(newCount);

        // If this was the first photo, it auto-becomes reference
        if (!category.hasReference && newCount === 1) {
          category.hasReference = true;
          loadReference();
        }

        onPhotoTaken?.();
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setCapturing(false);
      }
    }, 'image/jpeg', 0.92);
  };

  // ─── Set new reference ─────────────────────────────────────────────────────
  const captureAsReference = async () => {
    if (!videoRef.current?.videoWidth) return;
    setShowRefOptions(false);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const fd = new FormData();
      fd.append('photo', blob, 'reference.jpg');
      try {
        await setReference(category.id, fd);
        category.hasReference = true;
        loadReference();
      } catch (err) {
        console.error('Reference update failed:', err);
      }
    }, 'image/jpeg', 0.92);
  };

  // ─── Flip camera ──────────────────────────────────────────────────────────
  const flipCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // ─── Keyboard shortcut (spacebar) ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.code === 'Space') { e.preventDefault(); capture(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [capturing, photoCount]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 100 }}>

      {/* Flash effect */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, background: 'white', zIndex: 50,
          animation: 'flash 0.2s ease-out', pointerEvents: 'none', opacity: 0
        }} />
      )}

      {/* Camera viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Live video */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }}
        />

        {/* Reference overlay canvas */}
        {category.hasReference && (
          <img
             src={`/uploads/${category.id}/reference.jpg?t=${Date.now()}`}
             style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                poinerEvents: 'none',
                opacity: overlayOpacity,
             }}
          />
        )}

        {/* Viewfinder corners */}
        <ViewfinderCorners />

        {/* First-time hint */}
        {!category.hasReference && streamReady && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(14,12,10,0.75)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(196,149,74,0.3)', borderRadius: 'var(--radius-lg)',
              padding: '16px 24px'
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 6 }}>
                FIRST SHOT
              </p>
              <p style={{ color: 'var(--text-primary)', fontSize: 14 }}>이 사진이 기준 구도로 저장됩니다</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,0.8)'
          }}>
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
              <button className="btn btn-ghost" onClick={onBack}>돌아가기</button>
            </div>
          </div>
        )}

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)'
        }}>
          {/* Back */}
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(255,255,255,0.8)', fontSize: 13, padding: '6px 4px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{category.name}</span>
          </button>

          {/* Shot counter + flip */}
          <div style={{ display: 'flex', align: 'center', gap: 12 }}>
            <div style={{
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
              padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.7)'
            }}>
              +{photoCount}
            </div>
            <button
              onClick={flipCamera}
              style={{ color: 'rgba(255,255,255,0.7)', padding: 6 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px 32px'
      }}>
        {/* Opacity slider (only when reference exists) */}
        {refImage && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                OVERLAY
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(196,149,74,0.8)' }}>
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={overlayOpacity}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setOverlayOpacity(v);
                // Redraw canvas
                const canvas = overlayCanvasRef.current;
                const video = videoRef.current;
                if (canvas && video && refImage) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.globalAlpha = v;
                  drawImageCover(ctx, refImage, canvas.width, canvas.height);
                }
              }}
              style={{ '--track-color': 'rgba(255,255,255,0.12)' }}
            />
          </div>
        )}

        {/* Main shutter row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Reference options */}
          <div style={{ width: 56, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setShowRefOptions(!showRefOptions)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'var(--font-mono)',
                padding: 8, borderRadius: 8, transition: 'color 0.15s',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(196,149,74,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              REF
            </button>
          </div>

          {/* Shutter button */}
          <button
            onClick={capture}
            disabled={capturing || !streamReady}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: capturing ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
              border: '3px solid rgba(255,255,255,0.3)',
              boxShadow: capturing ? 'none' : '0 0 0 6px rgba(255,255,255,0.1)',
              transition: 'all 0.15s ease',
              transform: capturing ? 'scale(0.92)' : 'scale(1)',
              cursor: capturing ? 'default' : 'pointer',
              outline: 'none'
            }}
          />

          {/* Placeholder for symmetry */}
          <div style={{ width: 56 }} />
        </div>

        {/* Spacebar hint */}
        <p style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em'
        }}>
          SPACE 키로도 촬영 가능
        </p>
      </div>

      {/* Reference options popup */}
      {showRefOptions && (
        <div style={{
          position: 'absolute', bottom: 160, left: 20,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)', minWidth: 200, zIndex: 60,
          animation: 'slideUp 0.2s ease'
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em' }}>REFERENCE</p>
          </div>
          <button
            onClick={captureAsReference}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              color: 'var(--text-primary)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            현재 화면을 레퍼런스로 설정
          </button>
          <button
            onClick={() => setShowRefOptions(false)}
            style={{
              width: '100%', padding: '10px 16px', textAlign: 'left',
              color: 'var(--text-muted)', fontSize: 12,
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}

function ViewfinderCorners() {
  const s = { position: 'absolute', width: 24, height: 24 };
  const line = { stroke: 'rgba(196,149,74,0.7)', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' };
  const cornerStyle = { position: 'absolute', width: 24, height: 24 };

  return (
    <>
      {/* Top-left */}
      <div style={{ ...cornerStyle, top: 20, left: 20 }}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M16 2H4a2 2 0 00-2 2v12" {...line}/>
        </svg>
      </div>
      {/* Top-right */}
      <div style={{ ...cornerStyle, top: 20, right: 20 }}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M8 2h12a2 2 0 012 2v12" {...line}/>
        </svg>
      </div>
      {/* Bottom-left */}
      <div style={{ ...cornerStyle, bottom: 20, left: 20 }}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M16 22H4a2 2 0 01-2-2V8" {...line}/>
        </svg>
      </div>
      {/* Bottom-right */}
      <div style={{ ...cornerStyle, bottom: 20, right: 20 }}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M8 22h12a2 2 0 002-2V8" {...line}/>
        </svg>
      </div>
      {/* Center crosshair (subtle) */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none'
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="1" fill="rgba(196,149,74,0.5)"/>
          <line x1="10" y1="4" x2="10" y2="8" stroke="rgba(196,149,74,0.4)" strokeWidth="1"/>
          <line x1="10" y1="12" x2="10" y2="16" stroke="rgba(196,149,74,0.4)" strokeWidth="1"/>
          <line x1="4" y1="10" x2="8" y2="10" stroke="rgba(196,149,74,0.4)" strokeWidth="1"/>
          <line x1="12" y1="10" x2="16" y2="10" stroke="rgba(196,149,74,0.4)" strokeWidth="1"/>
        </svg>
      </div>
    </>
  );
}

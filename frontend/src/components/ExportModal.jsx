import { useState } from 'react';
import { exportVideo } from '../api';

export default function ExportModal({ category, photoCount, onClose }) {
  const [fps, setFps] = useState(0.5);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const totalDuration = (fps * photoCount).toFixed(1);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportVideo(category.id, fps);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.name}_timelapse.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            Export
          </p>
          <h2 style={{ fontSize: 22 }}>{category.name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {photoCount}장의 사진 → MP4
          </p>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>장면당 재생 시간</label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--gold)', fontWeight: 500 }}>
              {fps}초
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={fps}
            onChange={e => setFps(parseFloat(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>0.1s</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>5.0s</span>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>예상 총 길이</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>
            {totalDuration}s
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(184,64,64,0.1)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--danger)'
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }} disabled={exporting}>
            취소
          </button>
          <button className="btn btn-gold" onClick={handleExport} style={{ flex: 2 }} disabled={exporting || photoCount === 0}>
            {exporting ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid rgba(26,18,0,0.3)', borderTopColor: '#1a1200',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                MP4 생성 중...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v9M4 7l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                MP4 내보내기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

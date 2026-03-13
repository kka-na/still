import { useState, useEffect } from 'react';
import { getPhotos, deletePhoto } from '../api';
import ExportModal from './ExportModal';

export default function CategoryView({ category, onBack, onOpenCamera, onRefresh }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // { photo, index }
  const [showExport, setShowExport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const data = await getPhotos(category.id);
      setPhotos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category.id]);

  const handleDelete = async (photo) => {
    await deletePhoto(category.id, photo.filename);
    setDeleteTarget(null);
    setLightbox(null);
    await load();
    onRefresh?.();
  };

  const navigate = (dir) => {
    if (!lightbox) return;
    const newIdx = lightbox.index + dir;
    if (newIdx < 0 || newIdx >= photos.length) return;
    setLightbox({ photo: photos[newIdx], index: newIdx });
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ padding: '32px 0 28px', borderBottom: '1px solid var(--border)', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onBack}
          style={{ color: 'var(--text-muted)', transition: 'color 0.15s', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Collection
          </p>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 600, fontStyle: 'italic' }}>
            {category.name}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {photos.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => setShowExport(true)}
              style={{ fontSize: 13 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v9M4 7l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              내보내기
            </button>
          )}
          <button
            className="btn btn-gold"
            onClick={onOpenCamera}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M2 7a2 2 0 012-2h1.5l1.5-2h6l1.5 2H16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="10" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            촬영
          </button>
        </div>
      </header>

      {/* Stats bar */}
      {photos.length > 0 && (
        <div style={{
          display: 'flex', gap: 24, marginBottom: 28,
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)'
        }}>
          <span><span style={{ color: 'var(--gold)' }}>{photos.length}</span> 장</span>
          {photos[0] && <span>시작: {photos[0].displayTime}</span>}
          {photos.length > 1 && <span>최근: {photos[photos.length-1].displayTime}</span>}
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24, border: '2px solid var(--border-light)',
            borderTopColor: 'var(--gold)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto'
          }} />
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '1px solid var(--border)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <path d="M2 7a2 2 0 012-2h1.5l1.5-2h6l1.5 2H16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="var(--border-light)" strokeWidth="1.2"/>
              <circle cx="10" cy="11" r="3" stroke="var(--border-light)" strokeWidth="1.2"/>
            </svg>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>아직 사진이 없어요</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            첫 번째 사진이 기준 구도(레퍼런스)로 자동 등록됩니다
          </p>
          <button className="btn btn-gold" onClick={onOpenCamera}>
            첫 번째 사진 찍기
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8
        }}>
          {photos.map((photo, idx) => (
            <PhotoThumb
              key={photo.filename}
              photo={photo}
              index={idx}
              onClick={() => setLightbox({ photo, index: idx })}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="modal-backdrop"
          onClick={e => e.target === e.currentTarget && setLightbox(null)}
          style={{ padding: 20 }}
        >
          <div style={{ position: 'relative', maxWidth: 800, width: '100%' }}>
            {/* Image */}
            <img
              src={lightbox.photo.url}
              alt={lightbox.photo.displayTime}
              style={{
                width: '100%', borderRadius: 'var(--radius-lg)',
                maxHeight: '75vh', objectFit: 'contain',
                display: 'block'
              }}
            />

            {/* Metadata strip */}
            <div style={{
              background: 'rgba(14,12,10,0.9)', backdropFilter: 'blur(12px)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              padding: '10px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {lightbox.index + 1} / {photos.length} — {lightbox.photo.displayTime}
              </span>
              <button
                onClick={() => setDeleteTarget(lightbox.photo)}
                style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                삭제
              </button>
            </div>

            {/* Nav arrows */}
            {lightbox.index > 0 && (
              <button onClick={() => navigate(-1)} style={{
                position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', padding: 12, borderRadius: 8,
                background: 'var(--card)', border: '1px solid var(--border)'
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {lightbox.index < photos.length - 1 && (
              <button onClick={() => navigate(1)} style={{
                position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', padding: 12, borderRadius: 8,
                background: 'var(--card)', border: '1px solid var(--border)'
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Close */}
            <button onClick={() => setLightbox(null)} style={{
              position: 'absolute', top: -12, right: -12,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>사진 삭제</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              {deleteTarget.displayTime}에 찍은 사진을 삭제할까요?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget)} style={{ flex: 1 }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <ExportModal
          category={category}
          photoCount={photos.length}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

function PhotoThumb({ photo, index, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--radius)',
        cursor: 'pointer', position: 'relative', background: 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-light)' : 'var(--border)'}`,
        transition: 'border-color 0.15s'
      }}
    >
      <img
        src={photo.url}
        alt={photo.displayTime}
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.05)' : 'scale(1)'
        }}
      />
      {/* Index number */}
      <div style={{
        position: 'absolute', bottom: 6, left: 6,
        background: 'rgba(14,12,10,0.7)', borderRadius: 3,
        padding: '2px 6px', fontFamily: 'var(--font-mono)',
        fontSize: 10, color: 'var(--text-muted)',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s'
      }}>
        #{index + 1}
      </div>
    </div>
  );
}

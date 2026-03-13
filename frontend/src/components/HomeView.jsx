import { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory } from '../api';

const EMOJI_LIST = [
  '🌸','🌺','🌼','🌻','🌹','🍀','🌿','🍃','🌲','🌵',
  '🏔','🌊','🌙','☀️','🌈','❄️','🔥','🏠','🏙','🌆',
  '🐶','🐱','🐦','🦋','🐝','🐠','🦁','🐘','🦊','🐺',
  '🍎','🍊','🍋','🍇','🍓','🥑','🌮','🍜','🍕','☕',
  '📷','🎨','🎭','🎵','📚','✏️','🔭','🧪','💡','🎯',
  '🏃','🚴','🧘','🏋','⚽','🎾','🎸','🎹','🎮','🎲',
  '👤','👥','💼','🏆','💎','🌟','✨','💫','🎪','🎠'
];

export default function HomeView({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📷');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCategory(newName.trim(), newEmoji);
      setNewName('');
      setNewEmoji('📷');
      setShowCreate(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteCategory(id);
    setDeleteTarget(null);
    await load();
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ padding: '52px 0 36px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em',
              color: 'var(--sage)', textTransform: 'uppercase', marginBottom: 10
            }}>
              STILL · Time Photography
            </p>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 500, fontStyle: 'italic',
              color: 'var(--cream)', letterSpacing: '-0.01em'
            }}>
              Collections
            </h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            새 컬렉션
          </button>
        </div>

        {/* Painterly divider */}
        <div style={{
          marginTop: 32, height: 1,
          background: 'linear-gradient(to right, transparent, var(--indigo), var(--sage-dim), transparent)'
        }} />
      </header>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: 22, height: 22,
            border: '2px solid var(--border-light)', borderTopColor: 'var(--terra)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto'
          }} />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState onAdd={() => setShowCreate(true)} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14
        }}>
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onClick={() => onSelectCategory(cat)}
              onDelete={() => setDeleteTarget(cat)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sage)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
              New Collection
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>컬렉션 만들기</h2>

            {/* Emoji picker */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>대표 이모지 선택</p>

              {/* Selected preview */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: 'var(--surface)', border: '2px solid var(--indigo)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28
                }}>
                  {newEmoji}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>선택된 이모지</span>
              </div>

              {/* Emoji grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 4, maxHeight: 180, overflowY: 'auto',
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                padding: 8, border: '1px solid var(--border)'
              }}>
                {EMOJI_LIST.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewEmoji(e)}
                    style={{
                      fontSize: 20, padding: '4px',
                      borderRadius: 6, transition: 'background 0.1s',
                      background: newEmoji === e ? 'var(--indigo-dim)' : 'transparent',
                      outline: newEmoji === e ? '1px solid var(--indigo)' : 'none'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name input */}
            <input
              type="text"
              placeholder="컬렉션 이름 (예: 목련, 내 얼굴...)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              style={{ marginBottom: 20 }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setNewName(''); }} style={{ flex: 1 }}>취소</button>
              <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 2 }} disabled={creating || !newName.trim()}>
                {creating ? '생성 중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal">
            <h2 style={{ fontSize: 19, fontWeight: 500, marginBottom: 10 }}>컬렉션 삭제</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              <strong style={{ color: 'var(--cream)' }}>{deleteTarget.emoji} {deleteTarget.name}</strong>과 모든 사진이 영구 삭제됩니다.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget.id)} style={{ flex: 1 }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1 / 1',
        background: hovered ? 'var(--card-hover)' : 'var(--card)',
        border: `1px solid ${hovered ? 'var(--border-light)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.35)' : 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        overflow: 'hidden'
      }}
    >
      {/* Accent top border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(to right, var(--indigo), var(--terra))`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s'
      }} />

      {/* Emoji */}
      <div style={{
        fontSize: 'clamp(28px, 6vw, 40px)',
        marginBottom: 10,
        transition: 'transform 0.2s',
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
        lineHeight: 1
      }}>
        {category.emoji || '📷'}
      </div>

      {/* Name */}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 'clamp(12px, 2vw, 15px)',
        fontWeight: 500,
        color: 'var(--cream)',
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 1.3
      }}>
        {category.name}
      </h3>

      {/* Photo count */}
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '0.05em'
      }}>
        {category.photoCount || 0}장
      </p>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 24, height: 24, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
          opacity: hovered ? 1 : 0,
          transition: 'all 0.15s',
          background: 'var(--surface)'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#d4665a'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{
        fontSize: 48, marginBottom: 20,
        filter: 'grayscale(0.3) opacity(0.6)'
      }}>🌸</div>
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, marginBottom: 6 }}>
        아직 컬렉션이 없어요
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
        목련, 벚꽃, 내 얼굴... 무엇이든 기록해보세요
      </p>
      <button className="btn btn-primary" onClick={onAdd}>첫 컬렉션 만들기</button>
    </div>
  );
}

const BASE = '/api';

export const getCategories = () =>
  fetch(`${BASE}/categories`).then(r => r.json());

export const createCategory = (name, emoji) =>
  fetch(`${BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, emoji })
  }).then(r => r.json());

export const deleteCategory = (id) =>
  fetch(`${BASE}/categories/${id}`, { method: 'DELETE' }).then(r => r.json());

export const getPhotos = (id) =>
  fetch(`${BASE}/categories/${id}/photos`).then(r => r.json());

export const uploadPhoto = (id, formData) =>
  fetch(`${BASE}/categories/${id}/photos`, {
    method: 'POST',
    body: formData
  }).then(r => r.json());

export const setReference = (id, formData) =>
  fetch(`${BASE}/categories/${id}/reference`, {
    method: 'PUT',
    body: formData
  }).then(r => r.json());

export const deletePhoto = (id, filename) =>
  fetch(`${BASE}/categories/${id}/photos/${filename}`, {
    method: 'DELETE'
  }).then(r => r.json());

export const exportVideo = async (id, secondsPerFrame) => {
  const response = await fetch(`${BASE}/categories/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secondsPerFrame })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Export failed');
  }
  return response.blob();
};

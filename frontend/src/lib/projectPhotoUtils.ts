import { formatUploadTimestamp } from './timestampUtils';

export interface ProjectPhoto {
  id: string;
  url: string;
  title: string;
  date: string;
  source: 'Site Photo' | 'Design' | 'Material' | 'Files' | 'BOQ' | 'Party' | 'Task' | string;
  category?: string;
  details?: string;
}

export const getProjectPhotos = (projectId: string): ProjectPhoto[] => {
  if (!projectId) return [];
  try {
    const saved = localStorage.getItem(`siteops_project_photos_${projectId}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load project photos from localStorage', e);
  }
  return [];
};

export const saveProjectPhotos = (projectId: string, photos: ProjectPhoto[]): void => {
  if (!projectId) return;
  try {
    localStorage.setItem(`siteops_project_photos_${projectId}`, JSON.stringify(photos));
  } catch (e) {
    console.warn('Failed to save project photos to localStorage', e);
  }
};

export const addProjectPhoto = (
  projectId: string,
  photo: {
    url: string;
    title: string;
    date?: string;
    source?: 'Site Photo' | 'Design' | 'Material' | 'Files' | 'BOQ' | 'Party' | 'Task' | string;
    category?: string;
    details?: string;
  }
): ProjectPhoto => {
  const current = getProjectPhotos(projectId);
  const newPhoto: ProjectPhoto = {
    id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    url: photo.url,
    title: photo.title,
    date: formatUploadTimestamp(photo.date),
    source: photo.source || 'Site Photo',
    category: photo.category || 'General',
    details: photo.details,
  };

  const updated = [newPhoto, ...current];
  saveProjectPhotos(projectId, updated);

  // Broadcast event so DashboardTab updates instantly across all views
  window.dispatchEvent(new CustomEvent('siteops_photo_added', {
    detail: { projectId, photo: newPhoto }
  }));

  return newPhoto;
};

export const removeProjectPhoto = (projectId: string, photoId: string): void => {
  const current = getProjectPhotos(projectId);
  const updated = current.filter(p => p.id !== photoId);
  saveProjectPhotos(projectId, updated);

  window.dispatchEvent(new CustomEvent('siteops_photo_removed', {
    detail: { projectId, photoId }
  }));
};

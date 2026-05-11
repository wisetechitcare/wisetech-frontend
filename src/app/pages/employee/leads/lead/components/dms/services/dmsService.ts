import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export const getLeadDocuments = async (leadId: string) => {
  const response = await axios.get(`${API_BASE_URL}/api/leads/export/documents/${leadId}`);
  return response.data;
};

export const getAllDocuments = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/leads/export/documents`);
  return response.data;
};

export const downloadDocument = async (url: string, fileName: string) => {
  try {
    const response = await axios.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    window.open(url, '_blank');
  }
};

export const previewDocument = async (url: string, fileName: string) => {
  try {
    // For DOCX, we still need the Google Docs viewer because browsers can't render it natively
    if (fileName.toLowerCase().endsWith('.docx')) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      window.open(viewerUrl, '_blank');
      return;
    }

    const response = await axios.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    // Use File object to preserve name in some browsers
    const file = new File([blob], fileName, { type: response.headers['content-type'] });
    const previewUrl = URL.createObjectURL(file);
    
    window.open(previewUrl, '_blank');
  } catch (error) {
    console.error('Preview failed:', error);
    window.open(url, '_blank');
  }
};

export const renameDocument = async (documentId: string, newName: string) => {
  const response = await axios.patch(`${API_BASE_URL}/api/leads/export/documents/rename/${documentId}`, { newName });
  return response.data;
};

export const deleteDocument = async (documentId: string) => {
  const response = await axios.delete(`${API_BASE_URL}/api/leads/export/documents/${documentId}`);
  return response.data;
};

export const deleteDocuments = async (documentIds: string[]) => {
  // If backend supports bulk delete, use it. Otherwise, use Promise.all
  // For now, we'll use Promise.all to ensure persistence for each file.
  const deletions = documentIds.map(id => axios.delete(`${API_BASE_URL}/api/leads/export/documents/${id}`));
  const results = await Promise.all(deletions);
  return results.map(r => r.data);
};

export const downloadDocumentsAsZip = async (files: { url: string; name: string }[], zipName: string = 'documents.zip') => {
  const zip = new JSZip();
  const folder = zip.folder('documents');

  const downloadPromises = files.map(async (file) => {
    try {
      const response = await axios.get(file.url, { responseType: 'blob' });
      folder?.file(file.name, response.data);
    } catch (error) {
      console.error(`Failed to download ${file.name}:`, error);
    }
  });

  await Promise.all(downloadPromises);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipName);
};

import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const downloadDocument = async (url: string, fileName: string) => {
  try {
    // Presigned S3 URL — credentials must stay off: S3 CORS can't answer
    // credentialed requests, the browser would hard-block the response.
    const response = await axios.get(url, {
      responseType: 'blob',
      withCredentials: false,
    });
    
    const contentType = response.headers['content-type'];
    const mimeType = typeof contentType === 'string' ? contentType : undefined;
    const blob = new Blob([response.data], { type: mimeType });
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

    // Presigned S3 URL — same credential rule as downloadDocument above.
    const response = await axios.get(url, {
      responseType: 'blob',
      withCredentials: false,
    });

    const contentType = response.headers['content-type'];
    const mimeType = typeof contentType === 'string' ? contentType : undefined;
    const blob = new Blob([response.data], { type: mimeType });
    // Use File object to preserve name in some browsers
    const file = new File([blob], fileName, { type: mimeType });
    const previewUrl = URL.createObjectURL(file);
    
    window.open(previewUrl, '_blank');
  } catch (error) {
    console.error('Preview failed:', error);
    window.open(url, '_blank');
  }
};

export const downloadDocumentsAsZip = async (files: { url: string; name: string }[], zipName: string = 'documents.zip') => {
  const zip = new JSZip();
  const folder = zip.folder('documents');

  const downloadPromises = files.map(async (file) => {
    try {
      const response = await axios.get(file.url, { responseType: 'blob', withCredentials: false });
      folder?.file(file.name, response.data);
    } catch (error) {
      console.error(`Failed to download ${file.name}:`, error);
    }
  });

  await Promise.all(downloadPromises);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipName);
};

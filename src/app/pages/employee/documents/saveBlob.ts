/**
 * Save a blob to the user's device.
 *
 * Everything here goes through this rather than an `<a download href="https://…s3…">`,
 * because the browser IGNORES the `download` attribute on a cross-origin URL — it
 * navigates to the file instead, which is why "Download" was opening PDFs in a tab.
 * A blob from our own origin has no such restriction.
 */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on a later tick: doing it synchronously can cancel the download in some
  // browsers before they have finished reading the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

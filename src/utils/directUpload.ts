/**
 * PUT a file straight to S3 with a presigned URL from our API — for files too big for the API path (videos: project
 * gallery, organization splash screens). The signature pins Content-Type and `x-amz-acl: public-read`, so both are
 * sent exactly as the server signed them.
 *
 * Plain XHR on purpose: the app's axios interceptors add an Authorization header, which S3 rejects on a presigned
 * request. XHR also gives real upload progress.
 */
export const putToS3 = (url: string, file: File, contentType: string, onProgress: (pct: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-amz-acl", "public-read");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage refused the upload (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload interrupted. Check your connection and retry."));
    xhr.send(file);
  });

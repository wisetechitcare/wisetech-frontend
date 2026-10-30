import axios from "axios";
import { FILE } from "@constants/api-endpoint";
import type { GalleryView, MediaItem, UploadMeta } from "@app/modules/project-gallery/media";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || "";
const base = (leadId: string) => `${API_BASE_URL}/api/projects/${leadId}`;

/** A row as the API returns it. */
export interface ProjectMediaRow {
  id: string;
  view: GalleryView;
  kind: "image" | "video";
  url: string;
  fileName: string;
  sizeBytes: number | null;
  caption: string | null;
  album: string | null;
  zone: string | null;
  discipline: string | null;
  takenAt: string;
  createdAt: string;
  uploadedByName: string | null;
}

export const toMediaItem = (r: ProjectMediaRow): MediaItem => ({
  id: r.id,
  view: r.view,
  kind: r.kind,
  name: r.fileName,
  caption: r.caption ?? "",
  album: r.album ?? "",
  zone: r.zone ?? undefined,
  discipline: r.discipline ?? undefined,
  by: r.uploadedByName ?? "—",
  at: r.takenAt,
  uploadedAt: r.createdAt,
  size: (r.sizeBytes ?? 0) / 1048576,
  src: r.url,
});

export const getProjectMedia = async (leadId: string) => {
  const { data } = await axios.get(`${base(leadId)}/media`);
  return data as { media: ProjectMediaRow[]; albums: Array<{ view: GalleryView; name: string }>; coverImageUrl: string | null };
};

export const setProjectCover = async (leadId: string, mediaId: string | null) => {
  const { data } = await axios.put(`${base(leadId)}/cover`, { mediaId });
  return data.coverImageUrl as string | null;
};

export const deleteProjectMedia = async (leadId: string, ids: string[]) => {
  const { data } = await axios.delete(`${base(leadId)}/media`, { data: { ids } });
  return data as { deleted: string[]; coverCleared: boolean };
};

export const updateProjectMedia = async (leadId: string, mediaId: string, patch: Partial<Pick<ProjectMediaRow, "caption" | "album" | "zone" | "discipline">>) => {
  const { data } = await axios.patch(`${base(leadId)}/media/${mediaId}`, patch);
  return data.media as ProjectMediaRow;
};

export const createProjectMediaAlbum = async (leadId: string, view: GalleryView, name: string) => {
  await axios.post(`${base(leadId)}/media/albums`, { view, name });
};

/**
 * PUT a file straight to S3. Plain XHR on purpose: the app's axios interceptors add an
 * Authorization header, which S3 rejects on a presigned request.
 */
const putToS3 = (url: string, file: File, contentType: string, onProgress: (pct: number) => void) =>
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

/**
 * Store one file and add it to the gallery. Photos go through the shared pipeline (content check,
 * WebP); videos are PUT directly to S3 and the server verifies the stored object when registering.
 */
export const uploadProjectMedia = async (leadId: string, file: File, meta: UploadMeta, onProgress: (pct: number) => void) => {
  const isVideo = /\.(mp4|mov)$/i.test(file.name);
  let url: string;
  const sizeBytes = file.size;

  if (isVideo) {
    const { data } = await axios.post(`${base(leadId)}/media/video-upload-url`, { fileName: file.name, contentType: file.type, sizeBytes: file.size });
    await putToS3(data.uploadUrl, file, data.contentType, onProgress);
    url = data.url;
  } else {
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post(`${API_BASE_URL}/${FILE.UPLOAD}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => e.total && onProgress((e.loaded / e.total) * 100),
    });
    url = data?.data?.path;
    if (!url) throw new Error("The upload did not return a file URL.");
  }

  const { data } = await axios.post(`${base(leadId)}/media`, {
    items: [
      {
        url,
        fileName: file.name,
        kind: isVideo ? "video" : "image",
        sizeBytes,
        view: meta.view,
        album: meta.album,
        discipline: meta.discipline,
        // ponytail: the file's last-modified time stands in for "taken at" (phones set it to capture time);
        // read EXIF client-side if that proves unreliable — the server re-encodes and strips it.
        takenAt: new Date(file.lastModified || Date.now()).toISOString(),
      },
    ],
  });
  return (data.media as ProjectMediaRow[])[0];
};

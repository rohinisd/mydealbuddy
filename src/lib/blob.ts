import "server-only";
import { put, del } from "@vercel/blob";

export async function uploadToBlob(pathname: string, data: Buffer, contentType: string): Promise<string> {
  const blob = await put(pathname, data, {
    access: "public",
    contentType,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

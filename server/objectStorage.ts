import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async getObjectEntityUploadURL(): Promise<string> {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    }

    const bucket = objectStorageClient.bucket(bucketId);
    const privateDir = process.env.PRIVATE_OBJECT_DIR || ".private";
    const objectPath = `${privateDir}/${randomUUID()}`;
    const file = bucket.file(objectPath);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "audio/webm",
    });

    return url;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    }

    const bucket = objectStorageClient.bucket(bucketId);
    const cleanPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", "") 
      : objectPath;
    
    const file = bucket.file(cleanPath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    return file;
  }

  async downloadObject(file: File, res: Response): Promise<void> {
    const [metadata] = await file.getMetadata();
    const stream = file.createReadStream();

    res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
    res.setHeader("Content-Length", metadata.size || 0);

    stream.pipe(res);
  }
}

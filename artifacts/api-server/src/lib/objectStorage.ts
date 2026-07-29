import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

/**
 * Storage driver selection. Both drivers talk to Google Cloud Storage; they
 * differ only in how they authenticate and how presigned URLs are produced.
 *
 * - "replit" (default): credentials come from the Replit sidecar and URL
 *   signing goes through the sidecar's signing endpoint. Works only on Replit.
 * - "gcs": credentials come from a Google service-account key file
 *   (GCS_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_APPLICATION_CREDENTIALS) and URL
 *   signing uses the client library's own V4 signing. Works anywhere.
 */
export type StorageProvider = "replit" | "gcs";

export function getStorageProvider(): StorageProvider {
  const raw = (process.env.OBJECT_STORAGE_PROVIDER || "replit").toLowerCase();
  if (raw !== "replit" && raw !== "gcs") {
    throw new Error(
      `Invalid OBJECT_STORAGE_PROVIDER "${raw}". Use "replit" or "gcs".`,
    );
  }
  return raw;
}

function createStorageClient(): Storage {
  if (getStorageProvider() === "gcs") {
    const keyFilename =
      process.env.GCS_SERVICE_ACCOUNT_KEY_FILE ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyFilename) {
      throw new Error(
        "OBJECT_STORAGE_PROVIDER=gcs requires GCS_SERVICE_ACCOUNT_KEY_FILE " +
          "(or GOOGLE_APPLICATION_CREDENTIALS) pointing to a service-account JSON key file.",
      );
    }
    return new Storage({ keyFilename });
  }
  // Replit-managed App Storage via the workspace sidecar.
  return new Storage({
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
}

export const objectStorageClient = createStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: File,
    cacheTtlSec: number = 3600,
    rangeHeader?: string,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const totalSize = metadata.size ? Number(metadata.size) : undefined;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      "Accept-Ranges": "bytes",
    };

    // Honor HTTP Range requests (required for video/audio seeking in browsers).
    if (rangeHeader && totalSize !== undefined) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match && (match[1] !== "" || match[2] !== "")) {
        let start: number;
        let end: number;
        if (match[1] === "") {
          // Suffix range: last N bytes.
          const suffix = Number(match[2]);
          start = Math.max(0, totalSize - suffix);
          end = totalSize - 1;
        } else {
          start = Number(match[1]);
          end = match[2] === "" ? totalSize - 1 : Math.min(Number(match[2]), totalSize - 1);
        }
        if (start >= totalSize || start > end) {
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${totalSize}` },
          });
        }
        const nodeStream = file.createReadStream({ start, end });
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;
        headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
        headers["Content-Length"] = String(end - start + 1);
        return new Response(webStream, { status: 206, headers });
      }
    }

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    if (totalSize !== undefined) {
      headers["Content-Length"] = String(totalSize);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  /**
   * Presigned PUT URL for a publicly served asset (e.g. newsletter images that
   * must be reachable from email clients without authentication). Returns the
   * upload URL plus the public path served by /storage/public-objects.
   */
  async getPublicUploadURL(prefix = "newsletter-images"): Promise<{
    uploadURL: string;
    publicPath: string;
  }> {
    const searchPath = this.getPublicObjectSearchPaths()[0];
    const objectId = randomUUID();
    const relativePath = `${prefix}/${objectId}`;
    const fullPath = `${searchPath}/${relativePath}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
    return { uploadURL, publicPath: `/public-objects/${relativePath}` };
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  if (getStorageProvider() === "gcs") {
    const [url] = await objectStorageClient
      .bucket(bucketName)
      .file(objectName)
      .getSignedUrl({
        version: "v4",
        action:
          method === "PUT"
            ? "write"
            : method === "DELETE"
              ? "delete"
              : "read",
        expires: Date.now() + ttlSec * 1000,
      });
    return url;
  }
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = (await response.json()) as {
    signed_url: string;
  };
  return signedURL;
}

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export interface S3Location {
  bucket: string;
  prefix: string;
}

export interface S3FileMap {
  files: Map<string, string>;
  fileList: string[];
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Reads all files from an S3 prefix location.
 * Skips files larger than 1MB to avoid performance issues during analysis.
 * Returns a Map of relativePath → content and a flat list of relative paths.
 */
export async function readFilesFromS3(location: S3Location): Promise<S3FileMap> {
  const client = new S3Client({});
  const files = new Map<string, string>();
  const fileList: string[] = [];

  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: location.bucket,
      Prefix: location.prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await client.send(listCommand);

    if (listResponse.Contents) {
      for (const object of listResponse.Contents) {
        if (!object.Key || !object.Size) continue;

        // Skip files larger than 1MB
        if (object.Size > MAX_FILE_SIZE) continue;

        // Skip directory markers
        if (object.Key.endsWith('/')) continue;

        const relativePath = object.Key.startsWith(location.prefix)
          ? object.Key.slice(location.prefix.length).replace(/^\//, '')
          : object.Key;

        fileList.push(relativePath);

        const getCommand = new GetObjectCommand({
          Bucket: location.bucket,
          Key: object.Key,
        });

        const getResponse = await client.send(getCommand);

        if (getResponse.Body) {
          const content = await getResponse.Body.transformToString('utf-8');
          files.set(relativePath, content);
        }
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return { files, fileList };
}

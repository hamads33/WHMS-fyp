// src/modules/backup/provider/s3.provider.js
const { S3Client, HeadBucketCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const BaseProvider = require("./baseProvider");

class S3Provider extends BaseProvider {
  constructor(config) {
    super(config);
    this.bucket = config.bucket;
    this.region = config.region;
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !!config.forcePathStyle,
    });
  }

  async test() {
    // head bucket
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    return true;
  }

  async uploadStream(readableStream, remotePath, opts = {}) {
    // Use @aws-sdk/lib-storage Upload
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: remotePath,
        Body: readableStream,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    await upload.done();
  }

  async delete(remotePath) {
    await this.client.send(new DeleteObjectCommand({ 
      Bucket: this.bucket, 
      Key: remotePath 
    }));
  }

  async downloadToStream(remotePath, writableStream) {
    const res = await this.client.send(new GetObjectCommand({ 
      Bucket: this.bucket, 
      Key: remotePath 
    }));
    const body = res.Body; // stream
    await new Promise((resolve, reject) => {
      body.pipe(writableStream);
      body.on("error", reject);
      writableStream.on("finish", resolve);
      writableStream.on("error", reject);
    });
  }

  /**
   * Download remotePath and return a Readable stream.
   * (Used by restore flow)
   * FIX: This method was missing in the original implementation
   */
  async downloadStream(remotePath) {
    const res = await this.client.send(new GetObjectCommand({ 
      Bucket: this.bucket, 
      Key: remotePath 
    }));
    return res.Body; // Returns readable stream
  }

  /**
   * Optional: Get file metadata
   */
  async stat(remotePath) {
    try {
      const res = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: remotePath
      }));
      return {
        size: res.ContentLength,
        mtime: res.LastModified
      };
    } catch (err) {
      return null;
    }
  }
}

module.exports = S3Provider;
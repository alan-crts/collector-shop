import type { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-west-3",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "admin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "password123",
    },
    // Useful for MinIO local dev
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    forcePathStyle: true, // Required for MinIO
});

export class UploadController {
    /**
     * Generate a presigned URL (POST /api/upload/presigned-url)
     */
    static async getPresignedUrl(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { filename, contentType } = req.body;

            if (!filename || !contentType) {
                res.status(400).json({ error: "Filename and contentType are required." });
                return;
            }

            const bucketName = process.env.AWS_BUCKET_NAME || "collector-shop";
            const uniqueKey = `items/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: uniqueKey,
                ContentType: contentType,
            });

            // The URL expires in 5 minutes
            const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

            // For local MinIO accessed by browser, it will use http://localhost:9000
            // In production, this would be your public CDN or S3 bucket URL
            const publicUrl = process.env.AWS_PUBLIC_URL
                ? `${process.env.AWS_PUBLIC_URL}/${uniqueKey}`
                : `http://localhost:9000/${bucketName}/${uniqueKey}`;

            res.status(200).json({ signedUrl, publicUrl });
        } catch (error) {
            console.error("[UploadController] Error generating presigned URL:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}

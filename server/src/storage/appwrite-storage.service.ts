import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ID, Storage } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

type UploadedAttachment = Express.Multer.File;

@Injectable()
export class AppwriteStorageService {
  private readonly storage: Storage | null;
  private readonly bucketId: string | null;
  private readonly endpoint: string | null;
  private readonly projectId: string | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('APPWRITE_ENDPOINT') ?? null;
    this.projectId = this.configService.get<string>('APPWRITE_PROJECT_ID') ?? null;
    const apiKey = this.configService.get<string>('APPWRITE_API_KEY') ?? null;
    this.bucketId =
      this.configService.get<string>('APPWRITE_STORAGE_BUCKET_ID') ?? null;

    this.enabled = Boolean(
      this.endpoint && this.projectId && apiKey && this.bucketId,
    );

    if (!this.enabled) {
      this.storage = null;
      return;
    }

    const client = new Client()
      .setEndpoint(this.endpoint!)
      .setProject(this.projectId!)
      .setKey(apiKey!);

    this.storage = new Storage(client);
  }

  async uploadConversationFiles(input: {
    userId: string;
    conversationId: string;
    messageId: string;
    files: UploadedAttachment[];
  }) {
    return this.uploadFiles({
      files: input.files,
      pathPrefix: `conversations/${input.conversationId}/messages/${input.messageId}`,
    });
  }

  async uploadAiCouncilFiles(input: {
    sessionId: string;
    files: UploadedAttachment[];
  }) {
    return this.uploadFiles({
      files: input.files,
      pathPrefix: `ai-council/${input.sessionId}/attachments`,
    });
  }

  private async uploadFiles(input: {
    files: UploadedAttachment[];
    pathPrefix: string;
  }) {
    if (!this.enabled || !this.storage || !this.bucketId || input.files.length === 0) {
      return [];
    }

    try {
      return await Promise.all(
        input.files.map(async (file) => {
          const created = await this.storage!.createFile(
            this.bucketId!,
            ID.unique(),
            InputFile.fromBuffer(file.buffer, file.originalname),
          );

          return {
            id: created.$id,
            bucketId: created.bucketId,
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: `${input.pathPrefix}/${created.$id}`,
            viewUrl: this.buildViewUrl(created.$id),
          };
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal upload file ke Appwrite Storage: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  isConfigured() {
    return this.enabled;
  }

  private buildViewUrl(fileId: string) {
    if (!this.endpoint || !this.projectId || !this.bucketId) {
      return null;
    }

    const baseEndpoint = this.endpoint.replace(/\/$/, '');

    return `${baseEndpoint}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${this.projectId}`;
  }
}

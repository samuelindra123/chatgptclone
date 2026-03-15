import { Module } from '@nestjs/common';
import { AppwriteStorageService } from './appwrite-storage.service';

@Module({
  providers: [AppwriteStorageService],
  exports: [AppwriteStorageService],
})
export class StorageModule {}

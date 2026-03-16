import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { WebSearchService } from './web-search.service';

@Module({
  providers: [LlmService, WebSearchService],
  exports: [LlmService],
})
export class LlmModule {}

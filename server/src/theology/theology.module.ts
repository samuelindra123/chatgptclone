import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { TheologyController } from './theology.controller';
import { TheologyPromptOrchestratorService } from './theology-prompt-orchestrator.service';
import { TheologyService } from './theology.service';

@Module({
  imports: [DatabaseModule, AuthModule, LlmModule],
  providers: [TheologyService, TheologyPromptOrchestratorService],
  controllers: [TheologyController],
})
export class TheologyModule {}

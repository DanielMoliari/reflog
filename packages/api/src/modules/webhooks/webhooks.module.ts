import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { QUEUE_SYNC_REPOSITORY } from '../../infrastructure/queue/queue.module'
import { GitHubEventProcessor } from './application/processors/github-event.processor'
import { WebhooksController } from './infrastructure/http/webhooks.controller'

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_SYNC_REPOSITORY })],
  controllers: [WebhooksController],
  providers: [GitHubEventProcessor],
})
export class WebhooksModule {}

import { BullModule } from '@nestjs/bullmq'
import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export const QUEUE_SYNC_REPOSITORY = 'sync-repository'
export const QUEUE_WEEKLY_DIGEST = 'weekly-digest'

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_SYNC_REPOSITORY },
      { name: QUEUE_WEEKLY_DIGEST },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

import { join } from 'node:path'
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './infrastructure/database/prisma.module'
import { QueueModule } from './infrastructure/queue/queue.module'
import { RedisModule } from './infrastructure/cache/redis.module'
import { IdentityModule } from './modules/identity/identity.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 200 },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: process.env['NODE_ENV'] !== 'production',
      introspection: true,
      context: ({ request, reply }: { request: unknown; reply: unknown }) => ({
        request,
        reply,
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    IdentityModule,
    AnalyticsModule,
    NotificationsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

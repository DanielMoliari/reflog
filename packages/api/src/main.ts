import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })

  app.setGlobalPrefix('api/v1')

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DevPulse API')
    .setDescription('Developer analytics API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env['PORT'] ?? 3001
  await app.listen(port, '0.0.0.0')
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start application:', err)
  process.exit(1)
})

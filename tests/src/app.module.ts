import { Module } from '@nestjs/common';
import { MessageBrokerModule, RabbitMqAdapter } from '../../lib';
import { AppService } from './App.service';

@Module({
  imports: [
    MessageBrokerModule.forRoot({
      adapter: new RabbitMqAdapter({
        namespace: 'test',
        url: {
          password: 'guest',
          username: 'guest',
          hostname: 'localhost',
          port: 5672,
        },
      }),
      default: {
        source: 'com',
      },
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}

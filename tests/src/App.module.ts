import { Module } from '@nestjs/common';
import { MessageBrokerModule, RabbitMQBroker } from '../../lib';
import { AppService } from './App.service';

@Module({
  imports: [
    MessageBrokerModule.register(RabbitMQBroker, {
      broker: {
        password: 'guest',
        user: 'guest',
        host: 'localhost',
        port: 5672,
        prefix: 'my-broker',
      },
      namespace: 'user-service',
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}

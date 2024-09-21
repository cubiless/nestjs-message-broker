import { Module } from '@nestjs/common';
import { MessageBrokerModule, RabbitMQBroker } from '../../lib';
import { AppService } from './App.service';

@Module({
  imports: [
    MessageBrokerModule.forRoot(RabbitMQBroker, {
      broker: {
        password: 'guest',
        user: 'guest',
        host: 'localhost',
        port: 5672,
      },
      namespace: 'user-service',
      name: 'my-broker',
      multiLevelWildcards: '#',
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportProxyController } from './import-proxy.controller';
import { ImportProxyService } from './import-proxy.service';

@Module({
  imports: [ConfigModule],
  controllers: [ImportProxyController],
  providers: [ImportProxyService],
})
export class ImportProxyModule {}

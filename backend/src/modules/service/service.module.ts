import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ServiceController } from './controllers/service.controller';
import { ServiceService } from './services/service.service';

@Module({
  imports: [CommonModule],
  controllers: [ServiceController],
  providers: [ServiceService]
})
export class ServiceModule {}

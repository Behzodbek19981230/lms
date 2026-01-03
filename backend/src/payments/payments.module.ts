import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { StudentBillingProfile } from './billing-profile.entity';
import { StudentGroupBillingProfile } from './student-group-billing-profile.entity';
import { MonthlyPayment } from './monthly-payment.entity';
import { MonthlyPaymentTransaction } from './monthly-payment-transaction.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      StudentBillingProfile,
      StudentGroupBillingProfile,
      MonthlyPayment,
      MonthlyPaymentTransaction,
      User,
      Group,
    ]),
    NotificationsModule,
    TelegramModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

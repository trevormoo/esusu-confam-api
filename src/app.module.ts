import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { RequestsModule } from './requests/requests.module';


@Module({
  imports: [AuthModule, GroupModule, RequestsModule],
})
export class AppModule {}
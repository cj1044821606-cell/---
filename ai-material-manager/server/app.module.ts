import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { FilesModule } from './modules/files/files.module';
import { IdentityModule } from './modules/identity/identity.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ActionsModule } from './modules/actions/actions.module';
import { MyModule } from './modules/my/my.module';
import { OpsModule } from './modules/ops/ops.module';
import { PoolModule } from './modules/pool/pool.module';
import { AgentModule } from './modules/agent/agent.module';
import { PrereleaseModule } from './modules/prerelease/prerelease.module';
import { FeishuModule } from './modules/feishu/feishu.module';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CacheModule.register({ isGlobal: true }),
    FeishuModule,
    AuthModule,
    HealthModule,
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    FilesModule,
    IdentityModule,
    SettingsModule,
    InboxModule,
    MaterialsModule,
    ActionsModule,
    MyModule,
    OpsModule,
    PoolModule,
    PrereleaseModule,
    AgentModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

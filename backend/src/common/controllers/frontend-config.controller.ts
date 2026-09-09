import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FrontendConfigService, FrontendConfig } from '../services';
import { FrontendType } from '../enums/frontend-type.enum';
import { GetFrontendType } from '../decorators/frontend-type.decorator';

@ApiTags('Frontend Configuration')
@Controller('api/frontend-config')
export class FrontendConfigController {
  constructor(private readonly frontendConfigService: FrontendConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all frontend configurations' })
  @ApiResponse({ status: 200, description: 'List of all supported frontends' })
  getAllConfigs(@GetFrontendType() frontendType: FrontendType): {
    frontends: FrontendConfig[];
    current?: FrontendConfig;
  } {
    const frontends = this.frontendConfigService.getFrontendConfigs();
    const current = frontendType 
      ? this.frontendConfigService.getFrontendConfig(frontendType)
      : undefined;
    
    return {
      frontends,
      current,
    };
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get specific frontend configuration' })
  @ApiResponse({ status: 200, description: 'Frontend configuration details' })
  @ApiResponse({ status: 404, description: 'Frontend type not found' })
  getConfig(@Param('type') type: string): FrontendConfig {
    const frontendType = type as FrontendType;
    
    if (!Object.values(FrontendType).includes(frontendType)) {
      throw new NotFoundException(`Frontend type '${type}' is not supported`);
    }

    const config = this.frontendConfigService.getFrontendConfig(frontendType);
    if (!config) {
      throw new NotFoundException(`Configuration for frontend type '${type}' not found`);
    }

    return config;
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Health check for frontends' })
  @ApiResponse({ status: 200, description: 'Frontend health status' })
  healthCheck(@GetFrontendType() frontendType: FrontendType) {
    const timestamp = new Date().toISOString();
    const frontends = this.frontendConfigService.getFrontendConfigs();
    
    return {
      status: 'healthy',
      timestamp,
      requestingFrontend: frontendType,
      supportedFrontends: frontends.map(f => ({
        type: f.type,
        name: f.name,
        status: 'configured'
      }))
    };
  }
}

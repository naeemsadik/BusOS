import { 
  Controller, 
  Get, 
  Param, 
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('team')
  @ApiOperation({ summary: 'Get team members for current user organization' })
  @ApiResponse({ status: 200, description: 'Returns team members' })
  async getTeamMembers(@CurrentUser() user: User) {
    return this.usersService.getTeamMembers(user.organizationId);
  }

  @Get('team/:id')
  @ApiOperation({ summary: 'Get specific team member by ID' })
  @ApiResponse({ status: 200, description: 'Returns team member details' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async getTeamMember(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const teamMember = await this.usersService.getTeamMember(user.organizationId, id);
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }
    return teamMember;
  }
}

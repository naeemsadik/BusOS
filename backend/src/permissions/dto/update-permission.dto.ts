import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePermissionDto {
  @ApiProperty({ description: 'Whether the user can view content in this module' })
  @IsBoolean()
  view: boolean;

  @ApiProperty({ description: 'Whether the user can create content in this module' })
  @IsBoolean()
  create: boolean;

  @ApiProperty({ description: 'Whether the user can edit content in this module' })
  @IsBoolean()
  edit: boolean;

  @ApiProperty({ description: 'Whether the user can delete content in this module' })
  @IsBoolean()
  delete: boolean;
}

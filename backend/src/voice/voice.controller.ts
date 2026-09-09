import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionModuleType } from '../entities';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import {
  InterpretVoiceCommandDto,
  SpeakVoiceDto,
  VoiceCommandMode,
} from './dto/interpret-voice-command.dto';
import { VoiceService } from './voice.service';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('interpret')
  async interpret(@Body() dto: InterpretVoiceCommandDto, @Request() req) {
    if (dto.mode === VoiceCommandMode.INVENTORY) {
      return this.voiceService.interpretInventoryCommand(dto.transcript);
    }

    if (dto.mode === VoiceCommandMode.ASSISTANT) {
      throw new BadRequestException('Use the voice assistant endpoint');
    }

    return this.voiceService.interpretPosCommand(
      dto.transcript,
      req.user.organization,
    );
  }

  @Post('assistant')
  @UseGuards(PermissionsGuard)
  @RequiredPermission(PermissionModuleType.DASHBOARD, 'view')
  async askAssistant(@Body() dto: InterpretVoiceCommandDto, @Request() req) {
    return this.voiceService.interpretBusinessQuestion(
      dto.transcript,
      req.user.organization,
    );
  }

  @Post('speak')
  async speak(@Body() dto: SpeakVoiceDto) {
    const audio = await this.voiceService.synthesizeSpeech(
      dto.text,
      dto.language,
    );
    return new StreamableFile(audio, {
      type: 'audio/mpeg',
      length: audio.length,
      disposition: 'inline',
    });
  }
}

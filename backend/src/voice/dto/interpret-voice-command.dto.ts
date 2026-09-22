import { IsEnum, IsString, Length } from 'class-validator';

export enum VoiceCommandMode {
  INVENTORY = 'inventory',
  POS = 'pos',
  ASSISTANT = 'assistant',
}

export class InterpretVoiceCommandDto {
  @IsEnum(VoiceCommandMode)
  mode: VoiceCommandMode;

  @IsString()
  @Length(1, 1000)
  transcript: string;
}

export enum VoiceLanguage {
  ENGLISH = 'en-US',
  BANGLA = 'bn-BD',
}

export class SpeakVoiceDto {
  @IsString()
  @Length(1, 2000)
  text: string;

  @IsEnum(VoiceLanguage)
  language: VoiceLanguage;
}

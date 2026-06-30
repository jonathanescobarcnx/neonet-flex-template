import { ISurveyQuestion, PromptMode } from './SurveyQuestion';

export type { PromptMode };

export interface ISurveyDefinition {
  name: string;
  last_updated_by: string;
  message_intro: string;
  message_intro_type?: PromptMode;
  message_intro_audio_url?: string;
  questions: ISurveyQuestion[];
  message_end: string;
  message_end_type?: PromptMode;
  message_end_audio_url?: string;
}

export class SurveyDefinition implements ISurveyDefinition {
  name: string = '';

  last_updated_by: string = '';

  message_intro: string = '';

  message_intro_type?: PromptMode = undefined;

  message_intro_audio_url?: string = undefined;

  questions: ISurveyQuestion[] = [];

  message_end: string = '';

  message_end_type?: PromptMode = undefined;

  message_end_audio_url?: string = undefined;
}

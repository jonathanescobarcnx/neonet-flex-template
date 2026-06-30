import { AnswerOptions } from './AnswerOptions';

export type PromptMode = 'tts' | 'audio';

export interface ISurveyQuestion {
  label: string;
  prompt: string;
  prompt_type?: PromptMode;
  prompt_audio_url?: string;
  answers: string;
  answer_options?: AnswerOptions;
}

export class SurveyQuestion implements ISurveyQuestion {
  label: string = '';

  prompt: string = '';

  prompt_type?: PromptMode = undefined;

  prompt_audio_url?: string = undefined;

  answers: string = '';

  answer_options?: AnswerOptions;
}

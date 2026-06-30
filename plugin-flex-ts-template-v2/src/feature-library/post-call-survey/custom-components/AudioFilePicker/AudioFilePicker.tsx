import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { HelpText } from '@twilio-paste/core/help-text';
import { Text } from '@twilio-paste/core/text';
import { FC, useRef } from 'react';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav'];
const MAX_FILE_SIZE = 4_000_000;

export interface AudioFilePickerProps {
  isReadOnly: boolean;
  currentUrl?: string;
  pendingFile?: File;
  onFileSelected: (file: File) => void;
  onError: (message: string) => void;
}

const AudioFilePicker: FC<AudioFilePickerProps> = ({ isReadOnly, currentUrl, pendingFile, onFileSelected, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError('Invalid file type. Please select an MP3 or WAV file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError('File too large. Maximum size is 4MB.');
      return;
    }

    onFileSelected(file);
  };

  if (isReadOnly) {
    return (
      <Box paddingTop="space30">
        <Text as="span" fontSize="fontSize30" color="colorTextWeak">
          {pendingFile ? pendingFile.name : currentUrl ? 'Audio file configured' : 'No audio file uploaded'}
        </Text>
      </Box>
    );
  }

  const displayName = pendingFile?.name ?? (currentUrl ? 'Audio file configured (click to replace)' : null);

  return (
    <Box display="flex" flexDirection="column" rowGap="space30" paddingTop="space30">
      <input ref={fileInputRef} type="file" accept=".mp3,.wav" style={{ display: 'none' }} onChange={handleFileChange} />
      <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()}>
        {displayName ? 'Replace audio file' : 'Choose audio file'}
      </Button>
      <HelpText variant="default">
        {displayName ?? 'Accepted formats: MP3, WAV. Max size 4MB. File will be uploaded when you save the survey.'}
      </HelpText>
    </Box>
  );
};

export default AudioFilePicker;

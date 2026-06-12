import React from 'react';
import { Box } from '@twilio-paste/core/box';
import OutboundEmailForm from './OutboundEmailForm';

const OutboundEmailView = () => (
    <Box display="flex" justifyContent="center" width="100vw" maxHeight="500px">
        <OutboundEmailForm />
    </Box>
);

export default OutboundEmailView; 
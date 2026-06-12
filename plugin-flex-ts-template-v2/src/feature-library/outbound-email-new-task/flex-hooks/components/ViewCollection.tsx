import * as Flex from '@twilio/flex-ui';
import OutboundEmailView from '../../custom-components/OutboundEmailView';
import { FlexComponent } from '../../../../types/feature-loader';

export const componentName = FlexComponent.ViewCollection;
export const componentHook = function addOutboundEmailView(flex: typeof Flex) {
    flex.ViewCollection.Content.add(
        <flex.View name="hola-mundo" key="hola-mundo-view">
            <OutboundEmailView key="outbound-email-view-content" />
        </flex.View>,
    );
}; 
import * as Flex from '@twilio/flex-ui';
import SideNavigationOutboundEmail from '../../custom-components/SideNavigationOutboundEmail';
import { FlexComponent } from '../../../../types/feature-loader';

export const componentName = FlexComponent.SideNav;
export const componentHook = function addOutboundEmailSideNav(flex: typeof Flex, manager: Flex.Manager) {
    flex.SideNav.Content.add(
        <SideNavigationOutboundEmail key="outbound-email-side-nav" />
    );
}; 
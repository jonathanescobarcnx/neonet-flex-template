import { SideLink, Actions } from '@twilio/flex-ui';
import React from 'react';
import { SendIcon } from '@twilio-paste/icons/esm/SendIcon';
import { connect } from 'react-redux';

const VIEW_NAME = "hola-mundo";

const SideNavigationOutboundEmail = ({ isActive }: { isActive: boolean }) => (
    <SideLink
        key="OutboundEmailShortcuts"
        icon={<SendIcon decorative={true} />}
        isActive={isActive}
        onClick={() => Actions.invokeAction("NavigateToView", { viewName: VIEW_NAME })}
        showLabel={true}
    >
        Outbound Email
    </SideLink>
);

export default connect((state: any) => ({
    isActive: state?.flex?.view?.activeView === VIEW_NAME
}))(SideNavigationOutboundEmail); 
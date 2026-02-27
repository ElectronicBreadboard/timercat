import React from 'react';

/** Fills the gap between drag and remove handles so the pointer stays in the group
 * when moving between them.
 *
 * Without it, group-hover is lost in the gap and the handles would flicker.
 */
export const WidgetHandleSpacer: React.FC<TWidgetHandleSpacerProps> = (props) => {
	const { className } = props;
	return <div className={className} aria-hidden />;
};

export interface TWidgetHandleSpacerProps {
	className: string;
}

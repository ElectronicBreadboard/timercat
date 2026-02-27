import React from 'react';
import { DragWidgetHandle, RemoveWidgetHandle, WidgetHandleSpacer } from '@/features/window';

export const SpotifyWindow: React.FC<TSpotifyWindowProps> = (props) => {
	const { onClose } = props;

	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<iframe
				title="Spotify playlist: beats to relax/study to"
				src="https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM"
				allow="encrypted-media"
				className="min-w-0 flex-1 border-0"
			/>
			<DragWidgetHandle className="absolute top-4 -right-4 h-8 w-4 rounded-r-lg" />
			<WidgetHandleSpacer className="absolute top-12 -right-4 h-1 w-4" />
			<RemoveWidgetHandle
				className="absolute top-13 -right-4 h-8 w-4 rounded-r-lg"
				onRemove={onClose}
			/>
		</div>
	);
};

export interface TSpotifyWindowProps {
	onClose: () => void;
}

import React from 'react';
import { DragWidgetHandle } from '@/features/window';

export const SpotifyWindow: React.FC = () => {
	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<iframe
				title="Spotify playlist: beats to relax/study to"
				src="https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM"
				allow="encrypted-media"
				className="min-w-0 flex-1 border-0"
			/>
			<DragWidgetHandle className="absolute top-4 -right-4 h-8 w-4 rounded-r-lg" />
		</div>
	);
};

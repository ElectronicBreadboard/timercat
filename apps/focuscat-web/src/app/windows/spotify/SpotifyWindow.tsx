import React from 'react';

export const SpotifyWindow: React.FC = () => (
	<div className="h-full w-full overflow-hidden rounded-xl shadow-lg">
		<iframe
			title="Spotify playlist: beats to relax/study to"
			src="https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM"
			allow="encrypted-media"
			className="h-full w-full border-0"
		/>
	</div>
);

import React, { useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

export default function OlympiadBanner({ source, style, borderRadius = 12 }) {
	const [aspect, setAspect] = useState(() => {
		if (typeof source === 'number') {
			const resolved = RNImage.resolveAssetSource(source);
			if (resolved?.width && resolved?.height) {
				return resolved.width / resolved.height;
			}
		}
		return 3.0; // Standard remote olympiad banner ratio (2172x724)
	});

	useEffect(() => {
		if (typeof source === 'number') {
			const resolved = RNImage.resolveAssetSource(source);
			if (resolved?.width && resolved?.height) {
				setAspect(resolved.width / resolved.height);
			}
		} else if (source?.uri) {
			RNImage.getSize(
				source.uri,
				(w, h) => {
					if (w && h && h > 0) setAspect(w / h);
				},
				() => {}
			);
		}
	}, [source]);

	return (
		<View style={[styles.wrap, { borderRadius, aspectRatio: aspect || 3.0 }, style]}>
			<Image
				source={source}
				style={styles.img}
				contentFit="cover"
				cachePolicy="memory-disk"
				transition={150}
				onLoad={(e) => {
					const w = e?.source?.width;
					const h = e?.source?.height;
					if (w && h && h > 0) {
						setAspect(w / h);
					}
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		overflow: 'hidden',
		backgroundColor: 'transparent',
	},
	img: {
		width: '100%',
		height: '100%',
	},
});

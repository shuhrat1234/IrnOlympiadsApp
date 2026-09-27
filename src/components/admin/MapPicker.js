import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../../theme';

// Leaflet map in a WebView (website uses react-leaflet). Tap to move the pin;
// the new coordinates come back through onChange(lat, lng).
const html = (lat, lng) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%;background:#eef1f5}</style>
</head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
var icon = L.divIcon({ className: '', html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#F2A900;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });
var marker = L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
map.on('click', function (e) {
  marker.setLatLng(e.latlng);
  window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
});
window.setPin = function (lat, lng) { marker.setLatLng([lat, lng]); map.setView([lat, lng]); };
</script></body></html>`;

export default function MapPicker({ latitude, longitude, onChange, height = 240 }) {
	const ref = useRef(null);
	const last = useRef({ lat: latitude, lng: longitude });
	// Build the page once; later external coordinate edits are pushed in with setPin.
	const source = useMemo(() => ({ html: html(latitude, longitude) }), []);

	useEffect(() => {
		if (last.current.lat === latitude && last.current.lng === longitude) return;
		last.current = { lat: latitude, lng: longitude };
		const lat = parseFloat(latitude);
		const lng = parseFloat(longitude);
		if (!isNaN(lat) && !isNaN(lng)) ref.current?.injectJavaScript(`window.setPin && window.setPin(${lat}, ${lng}); true;`);
	}, [latitude, longitude]);

	return (
		<View style={[styles.wrap, { height }]}>
			<WebView
				ref={ref}
				originWhitelist={['*']}
				source={source}
				javaScriptEnabled
				scrollEnabled={false}
				nestedScrollEnabled
				onMessage={(e) => {
					try {
						const { lat, lng } = JSON.parse(e.nativeEvent.data);
						const la = parseFloat(lat.toFixed(6));
						const ln = parseFloat(lng.toFixed(6));
						last.current = { lat: la, lng: ln };
						onChange(la, ln);
					} catch {}
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
});

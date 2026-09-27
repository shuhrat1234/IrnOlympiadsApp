import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// Hidden WebView running pdf.js + <canvas> — the same browser tooling the website
// uses (pdfToImage.js, pdfTableParser.js), reachable from React Native via messages.

const ENGINE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head><body><script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const reply = (id, ok, data) => window.ReactNativeWebView.postMessage(JSON.stringify({ id, ok, data }));
const b64ToBytes = (b64) => { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

async function pdfToImage(b64) {
	const pdf = await pdfjsLib.getDocument({ data: b64ToBytes(b64) }).promise;
	const page = await pdf.getPage(1);
	const base = page.getViewport({ scale: 1 });
	const scale = Math.min(2, Math.max(1.2, 1600 / Math.max(base.width, base.height)));
	const vp = page.getViewport({ scale });
	const c = document.createElement('canvas');
	c.width = Math.round(vp.width); c.height = Math.round(vp.height);
	await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
	return { dataUrl: c.toDataURL('image/jpeg', 0.85), width: c.width, height: c.height, aspectRatio: c.width / c.height };
}

function compressImage(src, maxDim, quality) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			let w = img.width, h = img.height;
			if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; } }
			const c = document.createElement('canvas'); c.width = w; c.height = h;
			c.getContext('2d').drawImage(img, 0, 0, w, h);
			resolve({ dataUrl: c.toDataURL('image/jpeg', quality), width: w, height: h, aspectRatio: w / h });
		};
		img.onerror = () => reject(new Error('image'));
		img.src = src;
	});
}

function mergeTouching(items) {
	if (!items.length) return [];
	const out = []; let cur = { ...items[0] };
	for (let i = 1; i < items.length; i++) {
		const n = items[i]; const end = cur.x + cur.width;
		if (n.x - end < 6 && n.x >= cur.x) { cur.str += (cur.str.endsWith(' ') || n.str.startsWith(' ') ? '' : ' ') + n.str; cur.width = (n.x + n.width) - cur.x; }
		else { out.push(cur); cur = { ...n }; }
	}
	out.push(cur); return out;
}
function columnBounds(h) {
	return h.map((it, idx, a) => { const nx = a[idx + 1], pv = a[idx - 1];
		return { idx, x: it.x, width: it.width || 0, left: pv ? (it.x + (pv.x + pv.width)) / 2 : 0, right: nx ? ((it.x + it.width) + nx.x) / 2 : Infinity }; });
}
function closestColumn(it, cols) {
	const c = it.x + (it.width ? it.width / 2 : 0);
	for (const col of cols) if (c >= col.left && c < col.right) return col.idx;
	for (const col of cols) if (it.x >= col.left && it.x < col.right) return col.idx;
	let best = 0, min = Infinity;
	for (const col of cols) { const d = Math.abs(col.x + (col.width ? col.width / 2 : 0) - c); if (d < min) { min = d; best = col.idx; } }
	return best;
}
async function pdfTables(b64) {
	const pdf = await pdfjsLib.getDocument({ data: b64ToBytes(b64) }).promise;
	const rows = []; let cols = null;
	for (let p = 1; p <= pdf.numPages; p++) {
		const page = await pdf.getPage(p);
		const items = (await page.getTextContent()).items || [];
		const groups = [];
		for (const it of items) {
			if (!(it.str || '').trim()) continue;
			const x = it.transform[4], y = it.transform[5];
			let g = groups.find((gg) => Math.abs(gg.y - y) <= 4); if (!g) { g = { y, items: [] }; groups.push(g); }
			g.items.push({ str: it.str, x, y, width: it.width || 0 });
		}
		groups.sort((a, b) => b.y - a.y);
		if (!cols) for (const g of groups) {
			const m = mergeTouching([...g.items].sort((a, b) => a.x - b.x));
			if (m.length >= 3 && /(name|ism|fio|id|grade|sinf|subject|fan|score|result|ball|school|maktab|region|viloyat|award|mukofot|medal|status|holat|questions|savol|correct)/i.test(m.map((x) => x.str.toLowerCase()).join(' '))) { cols = columnBounds(m); break; }
		}
		for (const g of groups) {
			const m = mergeTouching([...g.items].sort((a, b) => a.x - b.x));
			if (cols) { const row = new Array(cols.length).fill(''); for (const it of m) { const i = closestColumn(it, cols); row[i] = row[i] ? row[i] + ' ' + it.str.trim() : it.str.trim(); } if (row.some((c) => c.trim())) rows.push(row); }
			else { const row = m.map((x) => x.str.trim()).filter(Boolean); if (row.length) rows.push(row); }
		}
	}
	return rows;
}

window.__run = async (id, op, args) => {
	try {
		let out;
		if (op === 'pdfToImage') out = await pdfToImage(args.b64);
		else if (op === 'compressImage') out = await compressImage(args.src, args.maxDim || 1600, args.quality || 0.85);
		else if (op === 'pdfTables') out = await pdfTables(args.b64);
		else throw new Error('unknown op');
		reply(id, true, out);
	} catch (e) { reply(id, false, String(e && e.message || e)); }
};
window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
</script></body></html>`;

const EngineContext = createContext(null);

export const WebEngineProvider = ({ children }) => {
	const ref = useRef(null);
	const pending = useRef(new Map());
	const ready = useRef(false);
	const queue = useRef([]);
	const seq = useRef(0);

	const send = (js) => ref.current?.injectJavaScript(`${js};true;`);

	const call = useCallback((op, args) => {
		seq.current += 1;
		const id = seq.current;
		const js = `window.__run(${id}, ${JSON.stringify(op)}, ${JSON.stringify(args)})`;
		return new Promise((resolve, reject) => {
			pending.current.set(id, { resolve, reject });
			if (ready.current) send(js);
			else queue.current.push(js);
			setTimeout(() => {
				if (pending.current.has(id)) {
					pending.current.delete(id);
					reject(new Error('timeout'));
				}
			}, 90000);
		});
	}, []);

	const onMessage = useCallback((e) => {
		let msg;
		try {
			msg = JSON.parse(e.nativeEvent.data);
		} catch {
			return;
		}
		if (msg.ready) {
			ready.current = true;
			queue.current.splice(0).forEach(send);
			return;
		}
		const p = pending.current.get(msg.id);
		if (!p) return;
		pending.current.delete(msg.id);
		if (msg.ok) p.resolve(msg.data);
		else p.reject(new Error(msg.data));
	}, []);

	const api = useMemo(
		() => ({
			pdfToImage: (b64) => call('pdfToImage', { b64 }),
			compressImage: (src, maxDim = 1600, quality = 0.85) => call('compressImage', { src, maxDim, quality }),
			pdfTables: (b64) => call('pdfTables', { b64 }),
		}),
		[call]
	);

	return (
		<EngineContext.Provider value={api}>
			{children}
			<View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} pointerEvents="none">
				<WebView ref={ref} source={{ html: ENGINE_HTML, baseUrl: 'https://irnolympiad.uz' }} onMessage={onMessage} originWhitelist={['*']} javaScriptEnabled />
			</View>
		</EngineContext.Provider>
	);
};

export const useWebEngine = () => useContext(EngineContext);

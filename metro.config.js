const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');

const config = getDefaultConfig(__dirname);

const TARGET_HOST = 'x8k2m9f3.irnolympiad.uz';

config.server = {
	...config.server,
	enhanceMiddleware: (metroMiddleware) => {
		return (req, res, next) => {
			if (req.url && (req.url.startsWith('/api/') || req.url.startsWith('/media/'))) {
				const targetUrl = new URL(req.url, `https://${TARGET_HOST}`);
				const proxyReq = https.request(
					targetUrl,
					{
						method: req.method,
						headers: {
							...req.headers,
							host: TARGET_HOST,
							origin: `https://${TARGET_HOST}`,
							referer: `https://${TARGET_HOST}/`,
						},
					},
					(proxyRes) => {
						res.writeHead(proxyRes.statusCode, proxyRes.headers);
						proxyRes.pipe(res);
					}
				);
				proxyReq.on('error', (err) => {
					console.error('Metro proxy error:', err);
					res.writeHead(502, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Proxy error' }));
				});
				req.pipe(proxyReq);
				return;
			}
			return metroMiddleware(req, res, next);
		};
	},
};

module.exports = config;

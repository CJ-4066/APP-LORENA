const { normalizeMediaType } = require('./apps/api/dist/data/media-type.js');
console.log('video/mp4:', normalizeMediaType('video', 'http://a.mp4', 'video/mp4'));
console.log('image/png:', normalizeMediaType('', 'http://a.png', 'image/png'));
console.log('legacy link:', normalizeMediaType('link', 'http://a.com', null));

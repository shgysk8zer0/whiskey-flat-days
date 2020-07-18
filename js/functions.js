import { createCustomElement } from 'https://cdn.kernvalley.us/js/std-js/functions.js';
import { site, icons, mapSelector } from './consts.js';

export async function stateHandler({ state }) {
	const { uuid = null, longitude = NaN, latitude = NaN, title = null, body = null } = state || {};
	if (typeof uuid === 'string') {
		const map = await getMap();
		await map.ready;
		const marker = document.getElementById(uuid);

		if (marker instanceof HTMLElement) {
			map.center = marker;
			marker.hidden = false;
			document.title = `${title} | ${site.title}`;
			map.center = marker;
			marker.open = true;
		}
	} else if (! (Number.isNaN(longitude) || Number.isNaN(latitude))) {
		const marker = await createMarker({longitude, latitude, title, id: `${latitude},${longitude}`, body});
		const map = await getMap();
		map.center = marker;
		marker.open = true;
	} else if (location.pathname.startsWith('/map')) {
		await customElements.whenDefined('leaflet-marker');
		document.querySelectorAll('leaflet-marker').forEach(el => el.open = false);
	}
}

export async function searchLocationMarker(url = new URL(location.href)) {
	if (! (url instanceof URL)) {
		url = new URL(url);
	}
	if (url.pathname.startsWith('/map') && url.search !== '') {
		if (! url.searchParams.has('coords')) {
			return false;
		} else if (url.searchParams.get('coords').startsWith('geo:')) {
			const [latitude = null, longitude = null] = url.searchParams.get('coords').replace('geo:', '').split(',', 2).map(parseFloat);
			const loc = new URL(location.pathname, location.origin);
			loc.hash = `#${latitude},${longitude}`;
			history.replaceState({
				latitude,
				longitude,
				title: `${url.searchParams.get('title') || 'Location'}`,
				body: `Location: ${latitude}, ${longitude}`,
			}, `${url.searchParams.get('title') || 'Location'} | ${site.title}`, loc.href);
			stateHandler(history);
		} else if (url.searchParams.get('coords').startsWith('https://')) {
			// On Android, URL & text are shared in same field
			return new URL(url.searchParams.get('coords').split(' ', 1)[0]);
		}
	}

	return false;
}

export async function setLocationMarker({latitude = NaN, longitude = NaN, title = 'Location'} = {}) {
	if (! (Number.isNaN(latitude) || Number.isNaN(longitude))) {
		const url = new URL(location.pathname, location.origin);
		url.hash = `#${latitude},${longitude}`;
		document.title = `${title} | ${site.title}`;
		history.pushState({
			latitude,
			longitude,
			title,
			body: `Location: ${latitude}, ${longitude}`,
		}, document.title, url.href);
		stateHandler(history);
		return true;
	} else {
		return false;
	}
}

export async function createMarker({
	latitude = NaN,
	longitude = NaN,
	title = null,
	body = null,
	icon = icons.markLocation,
	iconSize = 32,
	uuid = null,
	id = null,
} = {}) {
	const marker = await createCustomElement('leaflet-marker', { latitude, longitude });
	const map = await getMap();
	const hash = typeof uuid === 'string' ? uuid : `${latitude},${longitude}`;

	if (typeof uuid === 'string') {
		marker.id = uuid;
	} else if (typeof id === 'string') {
		marker.id = id;
	}

	marker.append(getIcon(icon, {size: iconSize}));
	marker.title = title;

	if (typeof body === 'string' && typeof title === 'string') {
		const popup = document.createElement('div');
		const h4 = document.createElement('h4');
		const content = document.createElement('div');
		const share = await getShareButton({hash, text: title, part: ['share']});

		popup.slot = 'popup';
		h4.textContent = title;
		content.textContent = body;
		popup.append(h4, content, document.createElement('hr'), share);
		marker.append(icon, popup);
		map.append(marker);
	} else if (body instanceof HTMLElement) {
		const share = await getShareButton({hash, text: title, part: ['share']});
		body.slot = 'popup';
		body.append(document.createElement('hr', share));
		marker.append(icon, body);
		map.append(marker);
	} else {
		marker.append(icon);
		map.append(marker);
	}

	return marker;
}

export function getIcon(src = icons.markLocation, {
	size = 32,
	alt = 'icon',
	role = 'presentation',
	loading = 'lazy',
	decoding = 'async',
	crossOrigin = 'anonymous',
	referrerPolicy = 'no-referrer',
	slot = 'icon',
	part = 'icon',
}) {
	const icon = new Image(size, size);
	icon.alt = alt;
	icon.role = role;
	icon.loading = loading;
	icon.decoding = decoding;
	icon.crossOrigin = crossOrigin;
	icon.referrerPolicy = referrerPolicy;
	icon.slot = slot;
	icon.src = new URL(src, site.markerIconBaseUri).href;

	if ('part' in icon && icon.part.add instanceof Function) {
		icon.part.add(part);
	}

	return icon;
}

export async function componentsDefined(...tags) {
	await Promise.all(tags.map(customElements.whenDefined));
}

export async function getMap() {
	await customElements.whenDefined('leaflet-map');
	const map = document.querySelector(mapSelector);

	if (map instanceof HTMLElement) {
		await map.ready;
		return map;
	} else {
		return null;
	}
}

export async function getShareButton({
	hash = null,
	textContent = 'Share',
	text = null,
	slot = null,
	part = [],
} = {}) {
	const share = await createCustomElement('share-button');
	const url = new URL(location.pathname, location.origin);

	if (typeof hash === 'string') {
		url.hash = `#${hash.replace('#', '')}`;
	}

	if (typeof text === 'string') {
		share.text = text;
	}

	if (typeof slot === 'string') {
		share.slot = slot;
	}

	if (part.length !== 0 && 'part' in share && share.part.add instanceof Function) {
		share.part.add(...part);
	}

	share.url = url;
	share.hidden = ! (navigator.share instanceof Function);
	share.textContent = textContent;

	return share;
}

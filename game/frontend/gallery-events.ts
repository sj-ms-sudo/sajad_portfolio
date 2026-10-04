export const GALLERY = {
	/** scene -> React. payload: painting slot (number). React shows the overlay for SHOWCASE[slot % SHOWCASE.length]. */
	open: 'gallery:open',
	/** React -> scene. The overlay closed, give control back. */
	close: 'gallery:close',
	/** React -> scene (while inside the gallery). payload: website id. Walks to its first painting and opens it. */
	travel: 'gallery:travel-to-showcase',
} as const;

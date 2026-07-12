// Mock wall clock (epoch seconds, float). The whole mock stack reads time
// through here so tests can fast-forward a running game with
// window.__mock.advance(seconds).

const OFFSET_KEY = "__hexudon_mock_clock_offset__";

export const getOffset = () => {
	const raw = localStorage.getItem(OFFSET_KEY);
	const value = raw === null ? 0 : Number(raw);
	return Number.isFinite(value) ? value : 0;
};

export const setOffset = (seconds) => {
	localStorage.setItem(OFFSET_KEY, String(seconds));
};

export const clearOffset = () => localStorage.removeItem(OFFSET_KEY);

export const advance = (seconds) => setOffset(getOffset() + Number(seconds || 0));

export const now = () => Date.now() / 1000 + getOffset();

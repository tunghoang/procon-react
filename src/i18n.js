import { createIntl, createIntlCache } from "react-intl";
import enUS from "./lang/en.json";
import viVN from "./lang/vi.json";

/**
 * A standalone `react-intl` instance for code that runs OUTSIDE the React
 * tree -- the axios layer (`api/*.js`) raises toasts from interceptors and
 * plain async helpers, where `useIntl()` is not available. Components keep
 * using `useIntl()`; this exists so those toasts stop being hardcoded English.
 *
 * `App` keeps the locale in sync (see `setIntlLocale`); the initial value is
 * read from localStorage so a toast fired before the first effect (e.g. a
 * failed sign-in) is already in the right language.
 *
 * `t()` returns a STRING, so it must not be used for a rich-text message (one
 * carrying markup tags, which formats to React elements). `roundTeams.intro`
 * is currently the only such key and is formatted by its component's own
 * `useIntl()`.
 */
export const messagesFor = (locale) => (locale === "en-US" ? enUS : viVN);

const cache = createIntlCache();

const readStoredLocale = () => {
	try {
		return localStorage.getItem("locale") || "vi-VN";
	} catch {
		// Private mode / blocked storage: fall back to the app's own default.
		return "vi-VN";
	}
};

const create = (locale) =>
	createIntl(
		{
			locale,
			messages: messagesFor(locale),
			// A missing key (or a bad placeholder) must never break a toast:
			// react-intl falls back to the id / raw pattern either way. Say so
			// in dev, where it is a bug to fix, and stay silent in production,
			// where a console full of intl noise during a live match only
			// hides real errors.
			onError: (err) => {
				if (import.meta.env.DEV) console.warn("[i18n]", err.message);
			},
		},
		cache,
	);

let intl = create(readStoredLocale());

/** Point the standalone instance at the locale the UI is showing. */
export const setIntlLocale = (locale) => {
	if (!locale || locale === intl.locale) return;
	intl = create(locale);
};

/** `formatMessage` for non-component code: `t("some.key", {n: 1})`. */
export const t = (id, values) => intl.formatMessage({ id }, values);

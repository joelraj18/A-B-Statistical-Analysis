export const THEME_STORAGE_KEY = 'ab-engine:theme';

/** Inline, render-blocking script that applies the theme before first paint. */
export const themeBootScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'{}');var t=(s.state&&s.state.theme)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

import { insertBefore } from '../shared/language-util.js';
import javascript from './prism-javascript.js';

export default /** @type {import("../types").LanguageProto} */ ({
	id: 'actionscript',
	require: javascript,
	grammar({ extend }) {
		const actionscript = extend('javascript', {
			'keyword': /\b(?:as|break|case|catch|class|const|default|delete|do|dynamic|each|else|extends|final|finally|for|function|get|if|implements|import|in|include|instanceof|interface|internal|is|namespace|native|new|null|override|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|use|var|void|while|with)\b/,
			'operator': /\+\+|--|(?:[+\-*\/%^]|&&?|\|\|?|<<?|>>?>?|[!=]=?)=?|[~?@]/
		});

		const className = /** @type {import('../types').GrammarToken} */(actionscript['class-name']);
		className.alias = 'function';

		// doesn't work with AS because AS is too complex
		delete actionscript['parameter'];
		delete actionscript['literal-property'];

		insertBefore(actionscript, 'string', {
			'xml': {
				pattern: /(^|[^.])<\/?\w+(?:\s+[^\s>\/=]+=("|')(?:\\[\s\S]|(?!\2)[^\\])*\2)*\s*\/?>/,
				lookbehind: true,
				inside: 'markup'
			}
		});
	}
});
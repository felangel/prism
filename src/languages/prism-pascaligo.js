export default /** @type {import("../types").LanguageProto} */ ({
	id: 'pascaligo',
	grammar() {
		// Pascaligo is a layer 2 smart contract language for the tezos blockchain

		const braces = /\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/.source;
		const type = /(?:\b\w+(?:<braces>)?|<braces>)/.source.replace(/<braces>/g, function () { return braces; });

		/** @type {import("../types").Grammar} */
		const classNameInside = {};

		const pascaligo = {
			'comment': /\(\*[\s\S]+?\*\)|\/\/.*/,
			'string': {
				pattern: /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1|\^[a-z]/i,
				greedy: true
			},
			'class-name': [
				{
					pattern: RegExp(/(\btype\s+\w+\s+is\s+)<type>/.source.replace(/<type>/g, function () { return type; }), 'i'),
					lookbehind: true,
					inside: classNameInside
				},
				{
					pattern: RegExp(/<type>(?=\s+is\b)/.source.replace(/<type>/g, function () { return type; }), 'i'),
					inside: classNameInside
				},
				{
					pattern: RegExp(/(:\s*)<type>/.source.replace(/<type>/g, function () { return type; })),
					lookbehind: true,
					inside: classNameInside
				}
			],
			'keyword': {
				pattern: /(^|[^&])\b(?:begin|block|case|const|else|end|fail|for|from|function|if|is|nil|of|remove|return|skip|then|type|var|while|with)\b/i,
				lookbehind: true
			},
			'boolean': {
				pattern: /(^|[^&])\b(?:False|True)\b/i,
				lookbehind: true
			},
			'builtin': {
				pattern: /(^|[^&])\b(?:bool|int|list|map|nat|record|string|unit)\b/i,
				lookbehind: true
			},
			'function': /\b\w+(?=\s*\()/,
			'number': [
				// Hexadecimal, octal and binary
				/%[01]+|&[0-7]+|\$[a-f\d]+/i,
				// Decimal
				/\b\d+(?:\.\d+)?(?:e[+-]?\d+)?(?:mtz|n)?/i
			],
			'operator': /->|=\/=|\.\.|\*\*|:=|<[<=>]?|>[>=]?|[+\-*\/]=?|[@^=|]|\b(?:and|mod|or)\b/,
			'punctuation': /\(\.|\.\)|[()\[\]:;,.{}]/
		};

		/** @type {(keyof typeof pascaligo)[]} */
		const keys = ['comment', 'keyword', 'builtin', 'operator', 'punctuation'];
		keys.forEach(key => classNameInside[key] = pascaligo[key]);

		return pascaligo;
	}
});
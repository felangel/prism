(function () {

	if (typeof Prism === 'undefined' || typeof document === 'undefined') {
		return;
	}

	const CLASS_PATTERN = /(?:^|\s)command-line(?:\s|$)/;
	const PROMPT_CLASS = 'command-line-prompt';

	/** @type {(str: string, prefix: string) => boolean} */
	const startsWith = ''.startsWith
		? function (s, p) { return s.startsWith(p); }
		: function (s, p) { return s.indexOf(p) === 0; };

	// Support for IE11 that has no endsWith()
	/** @type {(str: string, suffix: string) => boolean} */
	const endsWith = ''.endsWith
		? function (str, suffix) {
			return str.endsWith(suffix);
		}
		: function (str, suffix) {
			const len = str.length;
			return str.substring(len - suffix.length, len) === suffix;
		};

	/**
	 * Returns whether the given hook environment has a command line info object.
	 *
	 * @param {any} env
	 * @returns {boolean}
	 */
	function hasCommandLineInfo(env) {
		const vars = env.vars = env.vars || {};
		return 'command-line' in vars;
	}
	/**
	 * Returns the command line info object from the given hook environment.
	 *
	 * @param {any} env
	 * @returns {CommandLineInfo}
	 *
	 * @typedef CommandLineInfo
	 * @property {boolean} [complete]
	 * @property {number} [numberOfLines]
	 * @property {string[]} [outputLines]
	 */
	function getCommandLineInfo(env) {
		const vars = env.vars = env.vars || {};
		return vars['command-line'] = vars['command-line'] || {};
	}


	Prism.hooks.add('before-highlight', function (env) {
		const commandLine = getCommandLineInfo(env);

		if (commandLine.complete || !env.code) {
			commandLine.complete = true;
			return;
		}

		// Works only for <code> wrapped inside <pre> (not inline).
		const pre = env.element.parentElement;
		if (!pre || !/pre/i.test(pre.nodeName) || // Abort only if neither the <pre> nor the <code> have the class
			(!CLASS_PATTERN.test(pre.className) && !CLASS_PATTERN.test(env.element.className))) {
			commandLine.complete = true;
			return;
		}

		// The element might be highlighted multiple times, so we just remove the previous prompt
		const existingPrompt = env.element.querySelector('.' + PROMPT_CLASS);
		if (existingPrompt) {
			existingPrompt.remove();
		}

		const codeLines = env.code.split('\n');

		commandLine.numberOfLines = codeLines.length;
		/** @type {string[]} */
		const outputLines = commandLine.outputLines = [];

		const outputSections = pre.getAttribute('data-output');
		const outputFilter = pre.getAttribute('data-filter-output');
		if (outputSections !== null) { // The user specified the output lines. -- cwells
			outputSections.split(',').forEach(function (section) {
				const range = section.split('-');
				let outputStart = parseInt(range[0], 10);
				let outputEnd = range.length === 2 ? parseInt(range[1], 10) : outputStart;

				if (!isNaN(outputStart) && !isNaN(outputEnd)) {
					if (outputStart < 1) {
						outputStart = 1;
					}
					if (outputEnd > codeLines.length) {
						outputEnd = codeLines.length;
					}
					// Convert start and end to 0-based to simplify the arrays. -- cwells
					outputStart--;
					outputEnd--;
					// Save the output line in an array and clear it in the code so it's not highlighted. -- cwells
					for (let j = outputStart; j <= outputEnd; j++) {
						outputLines[j] = codeLines[j];
						codeLines[j] = '';
					}
				}
			});
		} else if (outputFilter) { // Treat lines beginning with this string as output. -- cwells
			for (let i = 0; i < codeLines.length; i++) {
				if (startsWith(codeLines[i], outputFilter)) { // This line is output. -- cwells
					outputLines[i] = codeLines[i].slice(outputFilter.length);
					codeLines[i] = '';
				}
			}
		}

		const continuationLineIndicies = commandLine.continuationLineIndicies = new Set();
		const lineContinuationStr = pre.getAttribute('data-continuation-str');
		const continuationFilter = pre.getAttribute('data-filter-continuation');

		// Identify code lines where the command has continued onto subsequent
		// lines and thus need a different prompt. Need to do this after the output
		// lines have been removed to ensure we don't pick up a continuation string
		// in an output line.
		for (let j = 0; j < codeLines.length; j++) {
			const line = codeLines[j];
			if (!line) {
				continue;
			}

			// Record the next line as a continuation if this one ends in a continuation str.
			if (lineContinuationStr && endsWith(line, lineContinuationStr)) {
				continuationLineIndicies.add(j + 1);
			}
			// Record this line as a continuation if marked with a continuation prefix
			// (that we will remove).
			if (j > 0 && continuationFilter && startsWith(line, continuationFilter)) {
				codeLines[j] = line.slice(continuationFilter.length);
				continuationLineIndicies.add(j);
			}
		}

		env.code = codeLines.join('\n');
	});

	Prism.hooks.add('before-insert', function (env) {
		const commandLine = getCommandLineInfo(env);

		if (commandLine.complete) {
			return;
		}

		// Reinsert the output lines into the highlighted code. -- cwells
		const codeLines = env.highlightedCode.split('\n');
		const outputLines = commandLine.outputLines || [];
		for (let i = 0, l = codeLines.length; i < l; i++) {
			// Add spans to allow distinction of input/output text for styling
			if (outputLines.hasOwnProperty(i)) {
				// outputLines were removed from codeLines so missed out on escaping
				// of markup so do it here.
				codeLines[i] = '<span class="token output">'
					+ Prism.util.encode(outputLines[i]) + '</span>';
			} else {
				codeLines[i] = '<span class="token command">'
					+ codeLines[i] + '</span>';
			}
		}
		env.highlightedCode = codeLines.join('\n');
	});

	Prism.hooks.add('complete', function (env) {
		if (!hasCommandLineInfo(env)) {
			// the previous hooks never ran
			return;
		}

		const commandLine = getCommandLineInfo(env);

		if (commandLine.complete) {
			return;
		}

		const pre = env.element.parentElement;
		if (CLASS_PATTERN.test(env.element.className)) { // Remove the class "command-line" from the <code>
			env.element.className = env.element.className.replace(CLASS_PATTERN, ' ');
		}
		if (!CLASS_PATTERN.test(pre.className)) { // Add the class "command-line" to the <pre>
			pre.className += ' command-line';
		}

		function getAttribute(key, defaultValue) {
			return (pre.getAttribute(key) || defaultValue).replace(/"/g, '&quot');
		}

		// Create the "rows" that will become the command-line prompts. -- cwells
		let promptLines = '';
		const rowCount = commandLine.numberOfLines || 0;
		const promptText = getAttribute('data-prompt', '');
		let promptLine;
		if (promptText !== '') {
			promptLine = '<span data-prompt="' + promptText + '"></span>';
		} else {
			const user = getAttribute('data-user', 'user');
			const host = getAttribute('data-host', 'localhost');
			promptLine = '<span data-user="' + user + '" data-host="' + host + '"></span>';
		}

		const continuationLineIndicies = commandLine.continuationLineIndicies || new Set();
		const continuationPromptText = getAttribute('data-continuation-prompt', '>');
		const continuationPromptLine = '<span data-continuation-prompt="' + continuationPromptText + '"></span>';

		// Assemble all the appropriate prompt/continuation lines
		for (let j = 0; j < rowCount; j++) {
			if (continuationLineIndicies.has(j)) {
				promptLines += continuationPromptLine;
			} else {
				promptLines += promptLine;
			}
		}

		// Create the wrapper element. -- cwells
		const prompt = document.createElement('span');
		prompt.className = PROMPT_CLASS;
		prompt.innerHTML = promptLines;

		// Remove the prompt from the output lines. -- cwells
		const outputLines = commandLine.outputLines || [];
		for (let i = 0, l = outputLines.length; i < l; i++) {
			if (outputLines.hasOwnProperty(i)) {
				const node = prompt.children[i];
				node.removeAttribute('data-user');
				node.removeAttribute('data-host');
				node.removeAttribute('data-prompt');
			}
		}

		env.element.insertBefore(prompt, env.element.firstChild);
		commandLine.complete = true;
	});

}());
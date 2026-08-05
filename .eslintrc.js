module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],
	overrides: [
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
			rules: {
				'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
				'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
				// The n8n Creator-Portal review (2026-08-05) requires `NodeConnectionTypes.Main`
				// instead of 'main' string literals. eslint-plugin-n8n-nodes-base — even at the
				// latest 1.16.7 — still compares the AST *literal* value ("main") in these two
				// rules and autofixes straight back to it, so the community linter and the
				// review gate directly contradict each other. The review gate is what ships,
				// so the stale rules are off. Re-enable if the plugin learns NodeConnectionTypes.
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			},
		},
	],
};

export function stripFilePrefix(uri: string): string {
	return uri.replace(/^file:\/\//, '');
}

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/');
}

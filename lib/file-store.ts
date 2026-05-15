let _pendingFile: File | null = null;

export const setPendingFile = (f: File) => { _pendingFile = f; };
export const getPendingFile = () => _pendingFile;
export const clearPendingFile = () => { _pendingFile = null; };

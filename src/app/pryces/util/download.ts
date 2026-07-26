// Browser file-download helper for API blobs.

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Mirrors the backend's Content-Disposition filename: pryces_export[_<name>]_<YYYYMMDD>.json
export function exportFilename(portfolio?: string | null): string {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    if (!portfolio) {
        return `pryces_export_${stamp}.json`;
    }
    const safe = [...portfolio].map((ch) => (/[a-zA-Z0-9\-_]/.test(ch) ? ch : '_')).join('');
    return `pryces_export_${safe}_${stamp}.json`;
}

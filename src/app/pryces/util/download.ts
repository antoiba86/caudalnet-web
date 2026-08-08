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

// Fallback name for a sample file. The real extension depends on the broker
// (Renta 4's format is .xls, the rest are .csv), so the server's
// Content-Disposition is authoritative; this only names the local download.
export function sampleFilename(portfolio: string): string {
    const safe = [...portfolio].map((ch) => (/[a-zA-Z0-9\-_]/.test(ch) ? ch : '_')).join('');
    return `pryces_sample_${safe}`;
}

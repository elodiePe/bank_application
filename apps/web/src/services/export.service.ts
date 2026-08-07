const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/// Not routed through apiGet — a JSON download needs the raw Blob to trigger a file save,
/// not a parsed object.
export async function downloadFamilyData(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/export`, { credentials: 'include' });
  if (!res.ok) throw new Error('EXPORT_FAILED');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mes-donnees.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

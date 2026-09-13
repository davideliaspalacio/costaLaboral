/* ============================================================
   Estilos de impresión (descarga en PDF con el diálogo del
   navegador): A4, márgenes, sin header/footer del sitio ni
   elementos marcados con .no-print. Sin dependencias.
   ============================================================ */

const CSS = `
@media print {
  @page { size: A4; margin: 14mm 14mm 16mm; }
  body > header, body > footer, .no-print { display: none !important; }
  html, body { background: white !important; }
  body > main { padding: 0 !important; }
  .print-hoja { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function PrintStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}

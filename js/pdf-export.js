/**
 * InvoicePro - PDF Export and Print Engine
 * Optimized for Zero-Mistake, Pixel-Perfect A4 Rendering
 */

class PDFExportService {
  /**
   * Export the invoice preview element to a PDF file with zero cut-off
   * @param {HTMLElement} element - The invoice sheet DOM element
   * @param {Object} options - Metadata for filename and settings
   */
  static async exportToPDF(element, options = {}) {
    if (!element) {
      throw new Error('Element invoice tidak ditemukan.');
    }

    const invoiceNo = (options.invoiceNumber || 'INV-001')
      .replace(/[\/\\?%*:|"<>]/g, '-');
    const clientName = (options.clientName || 'Pelanggan')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .trim();
    const filename = `Invoice_${invoiceNo}_${clientName}.pdf`;

    // Check if html2pdf is available
    if (typeof html2pdf === 'undefined') {
      console.warn('html2pdf library tidak ditemukan. Menggunakan dialog cetak browser sebagai alternatif.');
      window.print();
      return;
    }

    // 1. Create a dedicated off-screen fixed-width rendering stage
    // Fixed width 794px and height 1120px corresponds to 210mm x 297mm at 96 DPI (Standard 1-page A4).
    // Placed far off-screen (-10000px) so the user never sees any visual glitch or background flicker during download.
    const stage = document.createElement('div');
    stage.id = 'pdf-isolated-stage';
    stage.style.cssText = `
      position: fixed !important;
      left: -10000px !important;
      top: -10000px !important;
      width: 794px !important;
      height: 1120px !important;
      max-height: 1120px !important;
      z-index: -99999 !important;
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      pointer-events: none !important;
    `;

    // 2. Clone the invoice sheet node
    const clone = element.cloneNode(true);

    // 3. Normalize all styles on the clone to ensure compact single-page layout
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';
    clone.style.width = '794px';
    clone.style.maxWidth = '794px';
    clone.style.minWidth = '794px';
    clone.style.height = '1120px';
    clone.style.maxHeight = '1120px';
    clone.style.margin = '0';
    clone.style.padding = '10mm 14mm 8mm 14mm';
    clone.style.boxSizing = 'border-box';
    clone.style.overflow = 'hidden';

    // Re-apply the active theme attribute so CSS variables match exactly
    const activeTheme = document.body.getAttribute('data-theme') || 'dark';
    stage.setAttribute('data-theme', activeTheme);

    stage.appendChild(clone);
    document.body.appendChild(stage);

    // 4. Configure html2pdf with margin 0 and pixel-perfect 1-page A4 coordinate lock
    const opt = {
      margin: 0, // No extra PDF margin since internal padding (14mm) provides exact page margins
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,           // 2x scale for sharp 192 DPI print quality
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
        x: 0,               // Lock capture X to 0 to prevent left-side cut-off
        y: 0,               // Lock capture Y to 0
        width: 794,         // Exact 794px width (prevents right-side cut-off)
        height: 1120,       // Exact 1120px height (prevents page 2 overflow)
        windowWidth: 794,   // Match windowWidth to capture width so margin:auto doesn't offset
        windowHeight: 1120, // Match windowHeight to capture height
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Align html2pdf internal wrapper elements to (0,0) to eliminate any browser centering shift
          const overlay = clonedDoc.querySelector('.html2pdf__overlay');
          if (overlay) {
            overlay.style.position = 'absolute';
            overlay.style.left = '0';
            overlay.style.top = '0';
            overlay.style.width = '794px';
            overlay.style.height = '1120px';
            overlay.style.margin = '0';
            overlay.style.padding = '0';
          }
          const container = clonedDoc.querySelector('.html2pdf__container');
          if (container) {
            container.style.position = 'absolute';
            container.style.left = '0';
            container.style.top = '0';
            container.style.width = '794px';
            container.style.height = '1120px';
            container.style.margin = '0';
            container.style.padding = '0';
          }
          const isolatedStage = clonedDoc.getElementById('pdf-isolated-stage');
          if (isolatedStage) {
            isolatedStage.style.position = 'absolute';
            isolatedStage.style.left = '0';
            isolatedStage.style.top = '0';
            isolatedStage.style.margin = '0';
            isolatedStage.style.width = '794px';
            isolatedStage.style.height = '1120px';
          }
        }
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: 'avoid-all' }
    };

    try {
      // Small pause to allow DOM to finish layout computation
      await new Promise(resolve => setTimeout(resolve, 100));
      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error('Error saat membuat PDF:', err);
      throw err;
    } finally {
      // Always remove the temporary stage
      if (stage && stage.parentNode) {
        stage.parentNode.removeChild(stage);
      }
    }
  }

  /**
   * Trigger native browser print dialog with A4 print styling
   */
  static printInvoice() {
    window.print();
  }
}

window.PDFExportService = PDFExportService;

/**
 * InvoicePro - PDF Export and Print Engine
 * Supports single & multi-page A4 invoices across Chrome, Firefox, Zen, and mobile browsers.
 */

class PDFExportService {
  /**
   * Export one or more A4 invoice pages to a crisp multi-page PDF file
   * @param {HTMLElement} element - Page 1 invoice sheet DOM element (#invoice-preview-sheet)
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

    if (typeof html2pdf === 'undefined') {
      console.warn('html2pdf library tidak ditemukan. Menggunakan dialog cetak browser sebagai alternatif.');
      window.print();
      return;
    }

    // Build an off-screen invisible capture stage so nothing ever bleeds behind the app UI during export
    const stage = document.createElement('div');
    stage.id = 'pdf-isolated-stage';
    stage.style.position = 'fixed';
    stage.style.left = '-12000px';
    stage.style.top = '0px';
    stage.style.width = '794px';
    stage.style.opacity = '0';
    stage.style.zIndex = '-99999';
    stage.style.background = '#ffffff';
    stage.style.margin = '0';
    stage.style.padding = '0';
    stage.style.boxSizing = 'border-box';
    stage.style.pointerEvents = 'none';

    const activeTheme = document.body.getAttribute('data-theme') || 'dark';
    stage.setAttribute('data-theme', activeTheme);
    document.body.appendChild(stage);

    function normalizePageClone(pageNode) {
      pageNode.style.transform = 'none';
      pageNode.style.boxShadow = 'none';
      pageNode.style.borderRadius = '0';
      pageNode.style.width = '794px';
      pageNode.style.maxWidth = '794px';
      pageNode.style.minWidth = '794px';
      pageNode.style.height = '1120px';
      pageNode.style.minHeight = '1120px';
      pageNode.style.maxHeight = '1120px';
      pageNode.style.margin = '0';
      pageNode.style.padding = '10mm 14mm 8mm 14mm';
      pageNode.style.boxSizing = 'border-box';
      pageNode.style.overflow = 'hidden';

      // Remove empty/hidden <img> tags (e.g. <img src="">) which can stall html2canvas in Firefox/Zen
      pageNode.querySelectorAll('img').forEach(img => {
        const rawSrc = img.getAttribute('src');
        if (!rawSrc || rawSrc.trim() === '' || img.classList.contains('hidden')) {
          img.parentNode && img.parentNode.removeChild(img);
        }
      });

      return pageNode;
    }

    async function waitForImages(node) {
      const imgs = Array.from(node.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => {
          img.onload = res;
          img.onerror = res;
          setTimeout(res, 1500);
        });
      }));
    }

    function createPageOptions() {
      return {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          x: 0,
          y: 0,
          width: 794,
          height: 1120,
          windowWidth: 794,
          windowHeight: 1120,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const clonedStage = clonedDoc.getElementById('pdf-isolated-stage');
            if (clonedStage) {
              clonedStage.style.display = 'none';
            }
            const overlay = clonedDoc.querySelector('.html2pdf__overlay');
            if (overlay) {
              overlay.style.position = 'absolute';
              overlay.style.left = '0px';
              overlay.style.top = '0px';
              overlay.style.width = '794px';
              overlay.style.height = '1120px';
              overlay.style.margin = '0';
              overlay.style.padding = '0';
              overlay.style.opacity = '1';
              overlay.style.overflow = 'visible';
              overlay.style.backgroundColor = '#ffffff';
              overlay.style.zIndex = '999999';
            }
            const container = clonedDoc.querySelector('.html2pdf__container');
            if (container) {
              container.style.position = 'absolute';
              container.style.left = '0px';
              container.style.top = '0px';
              container.style.width = '794px';
              container.style.height = '1120px';
              container.style.margin = '0';
              container.style.padding = '0';
              container.style.backgroundColor = '#ffffff';
            }
          }
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };
    }

    try {
      const clonePage1 = normalizePageClone(element.cloneNode(true));
      const stageExtraContainer = document.createElement('div');
      stageExtraContainer.id = 'pdf-stage-extra-pages';

      const liveExtraPages = document.getElementById('invoice-extra-pages');
      const liveExtraCount = liveExtraPages ? liveExtraPages.querySelectorAll('.invoice-sheet').length : 0;

      let pagesToCapture = [];

      if (element.getClientRects().length === 0 && typeof window.paginateInvoicePages === 'function') {
        stage.appendChild(clonePage1);
        stage.appendChild(stageExtraContainer);
        await new Promise(resolve => setTimeout(resolve, 60));
        window.paginateInvoicePages(clonePage1, stageExtraContainer);
        pagesToCapture = [
          normalizePageClone(clonePage1),
          ...Array.from(stageExtraContainer.querySelectorAll('.invoice-sheet')).map(normalizePageClone)
        ];
      } else {
        pagesToCapture.push(clonePage1);
        if (liveExtraCount > 0) {
          liveExtraPages.querySelectorAll('.invoice-sheet').forEach(extraPage => {
            pagesToCapture.push(normalizePageClone(extraPage.cloneNode(true)));
          });
        }
      }

      // Render Page 1 into jsPDF instance
      stage.innerHTML = '';
      stage.style.height = '1120px';
      stage.appendChild(pagesToCapture[0]);
      await waitForImages(pagesToCapture[0]);
      await new Promise(resolve => setTimeout(resolve, 80));

      const pdf = await html2pdf().set(createPageOptions()).from(pagesToCapture[0]).toPdf().get('pdf');

      // Render Page 2..N sequentially at exact (0,0) and append to the same PDF
      for (let i = 1; i < pagesToCapture.length; i++) {
        stage.innerHTML = '';
        stage.appendChild(pagesToCapture[i]);
        await waitForImages(pagesToCapture[i]);
        await new Promise(resolve => setTimeout(resolve, 60));

        const imgData = await html2pdf().set(createPageOptions()).from(pagesToCapture[i]).outputImg('datauristring');
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(filename);
    } catch (err) {
      console.error('Error saat membuat PDF:', err);
      throw err;
    } finally {
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

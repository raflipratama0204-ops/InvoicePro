/**
 * InvoicePro - Formatting & Helper Utilities
 * Modular subsystem for currency, date, terbilang, and string sanitation.
 */

// Default Notes & Terms (safely sync with window/storage)
if (typeof window.DEFAULT_NOTES === 'undefined') {
  window.DEFAULT_NOTES = typeof DEFAULT_NOTES !== 'undefined' 
    ? DEFAULT_NOTES 
    : "Terima kasih atas kepercayaan Anda bertransaksi dengan kami. Mohon periksa kembali kondisi barang saat serah terima.";
}
if (typeof window.DEFAULT_TERMS === 'undefined') {
  window.DEFAULT_TERMS = typeof DEFAULT_TERMS !== 'undefined' 
    ? DEFAULT_TERMS 
    : "1. Pembayaran sah apabila dana sudah masuk ke rekening yang tertera di atas.\n2. Bukti transfer mohon dikonfirmasikan via WhatsApp.";
}

// Format Number to Rupiah (IDR)
function formatRupiah(amount, withPrefix = true) {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withPrefix ? `Rp ${formatted}` : formatted;
}

// Format raw number to Indonesian thousands separator string (e.g. 2000 -> "2.000")
function formatThousands(num) {
  if (num === undefined || num === null || isNaN(num) || num === '') return '0';
  const clean = Math.round(Number(num));
  return clean.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse thousands string back to raw number (e.g. "2.000" -> 2000)
function parseThousands(str) {
  if (str === undefined || str === null || str === '') return 0;
  const clean = String(str).replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

// Bind live Indonesian thousands formatting to any input element
function bindCurrencyInput(inputElement, onValueChange, isPercentFn = null) {
  if (!inputElement) return;

  const handleInput = () => {
    // If field is currently percentage mode, allow 0-100 without thousand dots
    if (typeof isPercentFn === 'function' && isPercentFn()) {
      let val = parseFloat(inputElement.value) || 0;
      if (val > 100) {
        val = 100;
        inputElement.value = '100';
      }
      if (onValueChange) onValueChange(val);
      return;
    }

    const cursorPosition = inputElement.selectionStart || 0;
    const originalValue = inputElement.value || '';
    
    // Count digits before cursor in original text
    const digitsBeforeCursor = originalValue.slice(0, cursorPosition).replace(/\D/g, '').length;
    
    // Clean all non-digit characters
    const cleanDigits = originalValue.replace(/\D/g, '');
    
    if (!cleanDigits) {
      inputElement.value = '';
      if (onValueChange) onValueChange(0);
      return;
    }
    
    // Limit to max 15 digits
    const numericValue = parseInt(cleanDigits.slice(0, 15), 10) || 0;
    const formatted = numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    inputElement.value = formatted;
    
    // Recalculate cursor position to keep typing smooth and natural
    let newCursorPosition = 0;
    let digitsCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitsCount++;
      }
      if (digitsCount === digitsBeforeCursor) {
        newCursorPosition = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) newCursorPosition = 0;
    if (digitsCount < digitsBeforeCursor) newCursorPosition = formatted.length;
    
    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    
    if (onValueChange) onValueChange(numericValue);
  };

  inputElement.addEventListener('input', handleInput);

  inputElement.addEventListener('blur', () => {
    if (inputElement.value.trim() === '') {
      inputElement.value = '0';
      if (onValueChange) onValueChange(0);
    }
  });

  inputElement.addEventListener('focus', () => {
    if (inputElement.value === '0') {
      inputElement.select();
    }
  });
}

// Convert Number to Indonesian Words (Terbilang)
function terbilangAngka(n) {
  n = Math.floor(Math.abs(n));
  const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (n < 12) return huruf[n];
  if (n < 20) return terbilangAngka(n - 10) + ' Belas';
  if (n < 100) return (huruf[Math.floor(n / 10)] || terbilangAngka(Math.floor(n / 10))) + ' Puluh ' + terbilangAngka(n % 10);
  if (n < 200) return 'Seratus ' + terbilangAngka(n - 100);
  if (n < 1000) return terbilangAngka(Math.floor(n / 100)) + ' Ratus ' + terbilangAngka(n % 100);
  if (n < 2000) return 'Seribu ' + terbilangAngka(n - 1000);
  if (n < 1000000) return terbilangAngka(Math.floor(n / 1000)) + ' Ribu ' + terbilangAngka(n % 1000);
  if (n < 1000000000) return terbilangAngka(Math.floor(n / 1000000)) + ' Juta ' + terbilangAngka(n % 1000000);
  if (n < 1000000000000) return terbilangAngka(Math.floor(n / 1000000000)) + ' Miliar ' + terbilangAngka(n % 1000000000);
  if (n < 1000000000000000) return terbilangAngka(Math.floor(n / 1000000000000)) + ' Triliun ' + terbilangAngka(n % 1000000000000);
  return '';
}

function angkaKeTerbilang(n) {
  if (n === 0 || isNaN(n)) return 'Nol Rupiah';
  const text = terbilangAngka(n).replace(/\s+/g, ' ').trim();
  return text ? `${text} Rupiah` : 'Nol Rupiah';
}

// Format date to Indonesian localized format (e.g., 23 November 2026)
function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = months[parseInt(parts[1], 10) - 1] || parts[1];
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

// Format date to Indonesian localized short format (3 huruf nama bulan, e.g. 23 Nov 2026, 15 Agu 2026)
function formatTanggalIndoShort(dateStr) {
  if (!dateStr) return '-';
  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = shortMonths[parseInt(parts[1], 10) - 1] || parts[1];
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

// Generate unique invoice number
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV/${year}${month}${day}/${random}`;
}

// Escape HTML utility to prevent XSS injection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export to window
window.DEFAULT_NOTES = window.DEFAULT_NOTES || (typeof DEFAULT_NOTES !== 'undefined' ? DEFAULT_NOTES : '');
window.DEFAULT_TERMS = window.DEFAULT_TERMS || (typeof DEFAULT_TERMS !== 'undefined' ? DEFAULT_TERMS : '');
window.formatRupiah = formatRupiah;
window.formatThousands = formatThousands;
window.parseThousands = parseThousands;
window.bindCurrencyInput = bindCurrencyInput;
window.terbilangAngka = terbilangAngka;
window.angkaKeTerbilang = angkaKeTerbilang;
window.formatTanggalIndo = formatTanggalIndo;
window.formatTanggalIndoShort = formatTanggalIndoShort;
window.generateInvoiceNumber = generateInvoiceNumber;
window.escapeHtml = escapeHtml;


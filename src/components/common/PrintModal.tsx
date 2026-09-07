import React, { useState } from 'react';
import { Printer, X, Download, Loader2, CheckCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  classNameLabel?: string;
  extraMeta?: { label: string; value: string }[];
  children: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
  signatureType?: 'homeroom' | 'teacher' | 'incident' | 'both';
  teacherName?: string;
  homeroomName?: string;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  classNameLabel,
  extraMeta = [],
  children,
  orientation = 'portrait',
  signatureType = 'homeroom',
  teacherName,
  homeroomName,
}) => {
  const { schoolSettings } = useApp();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Deteksi apakah aplikasi berjalan di dalam iframe (seperti live preview sandbox)
  const isInsideIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if (!isOpen) return null;

  // 1. Fungsi Unduh PDF Langsung (.pdf) menggunakan html2canvas-pro & jsPDF (Mendukung fungsi warna oklch Tailwind v4)
  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-document');
    if (!element) return;

    setIsExportingPdf(true);
    setExportNotice('Menyiapkan berkas PDF...');

    try {
      // Dynamic import html2canvas-pro dan jsPDF
      const html2canvasModule = await import('html2canvas-pro');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const safeTitle = (title || 'Dokumen')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .substring(0, 35);
      const safeClass = (classNameLabel || '').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `${safeTitle}${safeClass ? '_' + safeClass : ''}_${dateStamp}.pdf`;

      const isLandscape = orientation === 'landscape';

      // Render element ke canvas menggunakan html2canvas-pro yang mendukung OKLCH
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: isLandscape ? 1280 : 900,
      });

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      // Tinggi proporsional gambar dalam mm
      const totalImgHeight = (canvas.height * printableWidth) / canvas.width;

      if (totalImgHeight <= printableHeight) {
        // Dokumen 1 halaman
        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, totalImgHeight, undefined, 'FAST');
      } else {
        // Dokumen multi-halaman: iris canvas per batas tinggi halaman cetak
        const pagePixelHeight = (canvas.width * printableHeight) / printableWidth;
        let currentY = 0;
        let pageIndex = 0;

        while (currentY < canvas.height) {
          const sliceHeight = Math.min(pagePixelHeight, canvas.height - currentY);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = sliceHeight;

          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              currentY,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );

            const sliceImgData = tempCanvas.toDataURL('image/jpeg', 0.96);
            const sliceMmHeight = (sliceHeight * printableWidth) / canvas.width;

            if (pageIndex > 0) {
              pdf.addPage();
            }

            pdf.addImage(
              sliceImgData,
              'JPEG',
              margin,
              margin,
              printableWidth,
              sliceMmHeight,
              undefined,
              'FAST'
            );
          }

          currentY += sliceHeight;
          pageIndex++;
        }
      }

      pdf.save(filename);
      setExportNotice('Berkas PDF berhasil diunduh!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: any) {
      console.error('Export PDF error:', err);
      setExportNotice('Gagal mengekspor PDF: ' + (err?.message || 'Error tidak diketahui'));
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. Fungsi Cetak ke Printer (dengan isolated iframe & fallback window.print)
  const handlePrint = () => {
    const printableElement = document.getElementById('printable-document');
    if (!printableElement) {
      window.print();
      return;
    }

    setIsPrinting(true);
    setExportNotice('Menyiapkan dokumen cetak...');

    try {
      // Bersihkan iframe helper sebelumnya jika ada
      const existingIframe = document.getElementById('print-iframe-helper');
      if (existingIframe) {
        existingIframe.remove();
      }

      // Buat iframe terisolasi dengan dimensi nyata (1024x1024) di luar viewport
      // Penting: Browser Chromium mengabaikan perintah print() jika iframe berukuran 0x0
      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-helper';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1024px';
      iframe.style.height = '1024px';
      iframe.style.opacity = '0';
      iframe.style.border = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Tidak dapat mengakses dokumen cetak iframe');
      }

      // Kumpulkan seluruh style CSS dari document.styleSheets dan tag style/link
      let cssRulesText = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          if (sheet.cssRules) {
            for (const rule of Array.from(sheet.cssRules)) {
              cssRulesText += rule.cssText + '\n';
            }
          }
        } catch {
          if (sheet.href) {
            cssRulesText += `@import url("${sheet.href}");\n`;
          }
        }
      }

      const headTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join('\n');

      const isLandscape = orientation === 'landscape';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <title>${title}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${headTags}
            <style>
              ${cssRulesText}

              @page {
                size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
                margin: 8mm 10mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                background: white !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-document {
                box-shadow: none !important;
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                color: #0f172a !important;
              }
              .avoid-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .page-break {
                page-break-before: always;
                break-before: page;
              }
            </style>
          </head>
          <body>
            <div id="printable-document">
              ${printableElement.innerHTML}
            </div>
          </body>
        </html>
      `;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      const executePrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setExportNotice('Dialog cetak printer dibuka.');
          setTimeout(() => setExportNotice(null), 3500);
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.print():', e);
          try {
            window.print();
            setExportNotice('Dialog cetak dibuka.');
            setTimeout(() => setExportNotice(null), 3500);
          } catch (winErr) {
            console.error('Window print error:', winErr);
            setExportNotice(
              isInsideIframe
                ? 'Gunakan tombol "Simpan / Unduh PDF" jika iframe membatasi printer.'
                : 'Gagal membuka printer.'
            );
            setTimeout(() => setExportNotice(null), 5000);
          }
        } finally {
          setIsPrinting(false);
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 30000);
        }
      };

      // Tunggu hingga elemen gambar di dalam dokumen cetak selesai dimuat
      const images = doc.images;
      if (images && images.length > 0) {
        let loadedCount = 0;
        const checkDone = () => {
          loadedCount++;
          if (loadedCount >= images.length) {
            setTimeout(executePrint, 250);
          }
        };
        for (let i = 0; i < images.length; i++) {
          if (images[i].complete) {
            checkDone();
          } else {
            images[i].onload = checkDone;
            images[i].onerror = checkDone;
          }
        }
        setTimeout(executePrint, 800);
      } else {
        setTimeout(executePrint, 350);
      }
    } catch (e) {
      console.warn('Print helper error, falling back:', e);
      try {
        window.print();
      } catch (winErr) {
        console.error('Direct print fallback failed:', winErr);
      }
      setIsPrinting(false);
      setExportNotice(
        isInsideIframe
          ? 'Tips: Jika dialog printer tidak muncul karena pembatasan iframe, gunakan tombol "Simpan / Unduh PDF"!'
          : 'Gagal memulai cetak.'
      );
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  const currentDateFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Container Dialog */}
      <div className="bg-slate-900 text-white rounded-xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-700">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">Pratinjau & Ekspor Dokumen</h3>
              <p className="text-xs text-slate-400">
                Unduh berkas PDF langsung ke komputer Anda atau kirim ke mesin cetak.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {exportNotice && (
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="w-3.5 h-3.5" />
                {exportNotice}
              </span>
            )}

            {/* Tombol Simpan / Unduh PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || isPrinting}
              id="btn-download-pdf"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengunduh PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Simpan / Unduh PDF
                </>
              )}
            </button>

            {/* Tombol Cetak ke Printer */}
            <button
              onClick={handlePrint}
              disabled={isExportingPdf || isPrinting}
              id="btn-trigger-print"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan Cetak...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Cetak Printer
                </>
              )}
            </button>

            <button
              onClick={onClose}
              id="btn-close-print-modal"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Petunjuk Tambahan saat dalam lingkungan Iframe */}
        {isInsideIframe && (
          <div className="no-print mx-6 mt-3 px-3.5 py-2 bg-blue-950/40 border border-blue-800/40 rounded-lg flex items-center gap-2 text-xs text-blue-200">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Petunjuk Cetak:</strong> Klik <strong>Cetak Printer</strong> untuk mencetak langsung, atau gunakan <strong>Simpan / Unduh PDF</strong> jika jendela pratinjau membatasi dialog cetak.
            </span>
          </div>
        )}

        {/* Paper Document Preview Canvas */}
        <div className="overflow-y-auto p-4 md:p-8 bg-slate-800/60 flex justify-center">
          <div 
            id="printable-document"
            className={`bg-white text-slate-900 p-8 md:p-12 shadow-xl rounded-sm w-full transition-all ${
              orientation === 'landscape' ? 'max-w-4xl' : 'max-w-3xl'
            }`}
            style={{ minHeight: '297mm' }}
          >
            {/* Kop Surat Resmi */}
            <div className="border-b-4 border-double border-slate-900 pb-3 mb-6">
              <div className="flex items-center justify-between gap-4">
                {/* Logo Sekolah di Kop */}
                {schoolSettings.logo ? (
                  <img
                    src={schoolSettings.logo}
                    alt="Logo Sekolah"
                    className="w-16 h-16 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-700 bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-xl shrink-0">
                    <span>AN</span>
                  </div>
                )}

                <div className="text-center flex-1">
                  {/* Nama Yayasan */}
                  <h4 className="text-xs font-semibold tracking-widest text-slate-600 uppercase">
                    {schoolSettings.foundationName || 'YAYASAN PENDIDIKAN ISLAM AN NUUR'}
                  </h4>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {schoolSettings.schoolName}
                  </h1>
                  {/* Status Akreditasi Dihilangkan sesuai instruksi */}
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    NPSN: {schoolSettings.npsn}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    {schoolSettings.address}, {schoolSettings.district}, {schoolSettings.city} {schoolSettings.postalCode}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Telp: {schoolSettings.phone} | Email: {schoolSettings.email}
                  </p>
                </div>
                <div className="w-16 h-16 shrink-0 hidden sm:block"></div>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center mb-6">
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide text-slate-900 underline decoration-1 underline-offset-4">
                {title}
              </h2>
              {subtitle && <p className="text-xs font-semibold text-slate-600 mt-1 uppercase">{subtitle}</p>}
            </div>

            {/* Informasi Identitas / Meta Dokumen */}
            <div className="grid grid-cols-2 text-xs mb-5 gap-y-1 text-slate-800 bg-slate-50 p-3 rounded border border-slate-200">
              {classNameLabel && (
                <div>
                  <span className="font-semibold text-slate-600 w-32 inline-block">Kelas / Rombel:</span>
                  <span className="font-bold text-slate-900">{classNameLabel}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-600 w-32 inline-block">Tahun Pelajaran:</span>
                <span className="font-medium text-slate-900">{schoolSettings.academicYear}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 w-32 inline-block">Semester:</span>
                <span className="font-medium text-slate-900">{schoolSettings.semester}</span>
              </div>
              {extraMeta.map((meta, idx) => (
                <div key={idx}>
                  <span className="font-semibold text-slate-600 w-32 inline-block">{meta.label}:</span>
                  <span className="font-medium text-slate-900">{meta.value}</span>
                </div>
              ))}
            </div>

            {/* Content Slot (Tabel Jadwal / Presensi / Nilai / Jurnal / Kejadian) */}
            <div className="mb-8">
              {children}
            </div>

            {/* Blok Tanda Tangan Resmi */}
            <div className="mt-10 pt-4 avoid-break text-xs text-slate-800">
              <div className="text-right mb-4">
                <p>Sukabumi, {currentDateFormatted}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  {signatureType === 'incident' ? (
                    <>
                      <p className="font-medium">Guru Pelapor / Konselor,</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline text-slate-900">{teacherName || 'Guru Pembimbing'}</p>
                      <p className="text-slate-500 text-[11px]">NIP. -</p>
                    </>
                  ) : signatureType === 'teacher' ? (
                    <>
                      <p className="font-medium">Guru Mata Pelajaran,</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline text-slate-900">{teacherName || 'Guru Pengampu'}</p>
                      <p className="text-slate-500 text-[11px]">NIP. -</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Wali Kelas,</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline text-slate-900">{homeroomName || teacherName || 'Wali Kelas'}</p>
                      <p className="text-slate-500 text-[11px]">NIP. -</p>
                    </>
                  )}
                </div>

                <div>
                  <p className="font-medium">Mengetahui,</p>
                  <p className="font-medium">Kepala {schoolSettings.schoolName}</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">{schoolSettings.headmasterName}</p>
                  <p className="text-slate-600 text-[11px]">NIP. {schoolSettings.headmasterNip}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

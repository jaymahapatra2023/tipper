import { PassThrough } from 'stream';
import archiver from 'archiver';
import PDFDocument from 'pdfkit';

import { qrService } from './qr.service';
import type { HotelQrConfig } from './qr.service';

export interface QrData {
  roomNumber: string;
  floor: number;
  code: string;
  url: string;
}

export class QrExportService {
  generateZip(qrData: QrData[], qrConfig?: HotelQrConfig): PassThrough {
    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(stream);

    const appendAll = async () => {
      for (const item of qrData) {
        let buffer: Buffer;
        if (qrConfig?.logoEnabled && qrConfig.logoUrl) {
          buffer = await qrService.generateHighResBufferWithLogo(
            item.url,
            qrConfig.colors,
            qrConfig.logoUrl,
          );
        } else {
          buffer = await qrService.generateHighResBuffer(item.url, qrConfig?.colors);
        }
        archive.append(buffer, { name: `room-${item.roomNumber}.png` });
      }
      await archive.finalize();
    };

    appendAll().catch((err) => stream.destroy(err));

    return stream;
  }

  async generatePdf(
    qrData: QrData[],
    hotelName: string,
    qrConfig?: HotelQrConfig,
  ): Promise<Buffer> {
    const COLS = 3;
    const ROWS = 4;
    const PER_PAGE = COLS * ROWS;
    const MARGIN = 40;
    const PAGE_WIDTH = 595.28; // A4
    const PAGE_HEIGHT = 841.89;
    const HEADER_HEIGHT = 50;
    const FOOTER_HEIGHT = 30;

    const contentWidth = PAGE_WIDTH - MARGIN * 2;
    const contentHeight = PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
    const cellWidth = contentWidth / COLS;
    const cellHeight = contentHeight / ROWS;
    const qrSize = Math.min(cellWidth - 20, cellHeight - 40);

    const totalPages = Math.ceil(qrData.length / PER_PAGE);

    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: false });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const drawHeader = (pageNum: number) => {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000');
      doc.text(hotelName, MARGIN, MARGIN, {
        width: contentWidth,
        align: 'center',
      });
      doc
        .moveTo(MARGIN, MARGIN + 25)
        .lineTo(PAGE_WIDTH - MARGIN, MARGIN + 25)
        .strokeColor('#cccccc')
        .stroke();

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(`Page ${pageNum} of ${totalPages}`, MARGIN, PAGE_HEIGHT - MARGIN - 15, {
          width: contentWidth,
          align: 'center',
        });
    };

    for (let page = 0; page < totalPages; page++) {
      doc.addPage();
      drawHeader(page + 1);

      const pageItems = qrData.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = MARGIN + col * cellWidth;
        const y = MARGIN + HEADER_HEIGHT + row * cellHeight;

        let qrBuffer: Buffer;
        if (qrConfig?.logoEnabled && qrConfig.logoUrl) {
          qrBuffer = await qrService.generateHighResBufferWithLogo(
            item.url,
            qrConfig.colors,
            qrConfig.logoUrl,
          );
        } else {
          qrBuffer = await qrService.generateHighResBuffer(item.url, qrConfig?.colors);
        }
        const qrX = x + (cellWidth - qrSize) / 2;
        doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });

        // Room number label
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`Room ${item.roomNumber}`, x, y + qrSize + 4, {
          width: cellWidth,
          align: 'center',
        });

        // Floor label
        doc.fontSize(8).font('Helvetica').fillColor('#888888');
        doc.text(`Floor ${item.floor}`, x, y + qrSize + 18, {
          width: cellWidth,
          align: 'center',
        });
      }
    }

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}

export const qrExportService = new QrExportService();

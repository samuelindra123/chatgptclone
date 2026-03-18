import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';
import pdf from '@cedrugs/pdf-parse';
import { createWorker } from 'tesseract.js';

type UploadedAttachment = Express.Multer.File;
type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
export type ExtractedAttachmentPayload = {
  name: string;
  mimeType: string;
  size: number;
  extractedText: string;
};

const MAX_PDF_CHARACTERS = 60000;
const MAX_IMAGE_OCR_CHARACTERS = 16000;
const MAX_PDF_PAGES = 20;
const OCR_PDF_FALLBACK_PAGES = 8;
const MIN_PDF_TEXT_LENGTH_FOR_DIRECT_PARSE = 120;

@Injectable()
export class AttachmentsService {
  async buildAttachmentContext(files: UploadedAttachment[]) {
    const extractedPayloads = await this.extractAttachmentPayloads(files);

    return extractedPayloads
      .map((payload) => payload.extractedText)
      .filter(Boolean)
      .join('\n\n');
  }

  async extractAttachmentPayloads(
    files: UploadedAttachment[],
  ): Promise<ExtractedAttachmentPayload[]> {
    if (files.length === 0) {
      return [];
    }

    let ocrWorker: OcrWorker | null = null;
    const getOcrWorker = async () => {
      if (!ocrWorker) {
        ocrWorker = await createWorker('eng+ind');
      }

      return ocrWorker;
    };

    try {
      const extractedParts = await Promise.all(
        files.map(async (file, index) => {
          let extractedText = '';

          if (file.mimetype === 'application/pdf') {
            extractedText = await this.extractPdfText(file, index, getOcrWorker);
          } else if (file.mimetype.startsWith('image/')) {
            extractedText = await this.extractImageText(file, index, getOcrWorker);
          } else {
            extractedText = `Lampiran ${index + 1}: ${file.originalname}\nJenis file belum didukung untuk dibaca otomatis.`;
          }

          return {
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            extractedText,
          };
        }),
      );

      return extractedParts;
    } finally {
      if (ocrWorker) {
        await (ocrWorker as OcrWorker).terminate();
      }
    }
  }

  private async extractPdfText(
    file: UploadedAttachment,
    index: number,
    getOcrWorker: () => Promise<Awaited<ReturnType<typeof createWorker>>>,
  ) {
    try {
      const parsed = (await pdf(file.buffer)) as {
        text: string;
        numpages?: number;
      };
      const text = parsed.text.replace(/\s+\n/g, '\n').trim();
      const pageCount =
        typeof parsed.numpages === 'number' && parsed.numpages > 0
          ? Math.min(parsed.numpages, MAX_PDF_PAGES)
          : MAX_PDF_PAGES;
      const directText =
        text.length > 0 ? text.slice(0, MAX_PDF_CHARACTERS) : '';

      if (directText.length >= MIN_PDF_TEXT_LENGTH_FOR_DIRECT_PARSE) {
        return [
          `Lampiran PDF ${index + 1}: ${file.originalname}`,
          `Metode baca: ekstraksi teks PDF`,
          parsed.numpages && parsed.numpages > MAX_PDF_PAGES
            ? `Catatan: PDF memiliki ${parsed.numpages} halaman, tetapi pembacaan dibatasi ke sekitar ${MAX_PDF_PAGES} halaman pertama agar tetap stabil.`
            : null,
          directText,
        ]
          .filter(Boolean)
          .join('\n');
      }

      const ocrText = await this.extractPdfOcrText(
        file,
        Math.min(pageCount, OCR_PDF_FALLBACK_PAGES),
        getOcrWorker,
      );

      if (directText || ocrText) {
        return [
          `Lampiran PDF ${index + 1}: ${file.originalname}`,
          `Metode baca: ${directText ? 'ekstraksi teks + OCR fallback' : 'OCR fallback PDF scan'}`,
          parsed.numpages && parsed.numpages > OCR_PDF_FALLBACK_PAGES
            ? `Catatan: OCR PDF scan dibatasi ke ${Math.min(pageCount, OCR_PDF_FALLBACK_PAGES)} halaman pertama agar waktu respons tetap masuk akal.`
            : null,
          directText ? `Teks PDF:\n${directText}` : '',
          ocrText ? `OCR halaman PDF:\n${ocrText}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
      }

      return `Lampiran PDF ${index + 1}: ${file.originalname}\nPDF terdeteksi, tetapi tidak ada teks yang bisa diekstrak atau dikenali via OCR.`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal membaca PDF ${file.originalname}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async extractImageText(
    file: UploadedAttachment,
    index: number,
    getOcrWorker: () => Promise<OcrWorker>,
  ) {
    try {
      const text = await this.runOcr(file.buffer, getOcrWorker);

      if (!text) {
        return `Lampiran gambar ${index + 1}: ${file.originalname}\nOCR tidak menemukan teks yang terbaca pada gambar ini.`;
      }

      return [
        `Lampiran gambar ${index + 1}: ${file.originalname}`,
        text.slice(0, MAX_IMAGE_OCR_CHARACTERS),
      ].join('\n');
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal melakukan OCR pada ${file.originalname}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async extractPdfOcrText(
    file: UploadedAttachment,
    pagesToProcess: number,
    getOcrWorker: () => Promise<OcrWorker>,
  ) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(file.buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      stopAtErrors: false,
    });
    const document = await loadingTask.promise;
    const pageTexts: string[] = [];

    try {
      for (
        let pageNumber = 1;
        pageNumber <= Math.min(document.numPages, pagesToProcess);
        pageNumber += 1
      ) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        const context = canvas.getContext('2d');

        await page.render({
          canvas: canvas as never,
          canvasContext: context as never,
          viewport,
        }).promise;

        const pngBuffer = canvas.toBuffer('image/png');
        const text = await this.runOcr(pngBuffer, getOcrWorker);

        if (text) {
          pageTexts.push(`Halaman ${pageNumber}\n${text}`);
        }
      }
    } finally {
      await loadingTask.destroy();
    }

    return pageTexts.join('\n\n').slice(0, MAX_PDF_CHARACTERS);
  }

  private async runOcr(
    input: Buffer,
    getOcrWorker: () => Promise<OcrWorker>,
  ) {
    const worker = await getOcrWorker();
    const result = await worker.recognize(input);

    return result.data.text.replace(/\s+\n/g, '\n').trim().slice(0, MAX_IMAGE_OCR_CHARACTERS);
  }
}

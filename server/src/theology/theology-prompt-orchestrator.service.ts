import { Injectable } from '@nestjs/common';

type TheologyOrchestrationInput = {
  deepAcademicMode: boolean;
};

@Injectable()
export class TheologyPromptOrchestratorService {
  buildPromptContext(input: TheologyOrchestrationInput) {
    const sectionInstruction = input.deepAcademicMode
      ? [
          'Mode akademik mendalam: AKTIF.',
          '- Berikan jawaban lebih panjang, berlapis, dan terstruktur ketat.',
          '- Tambahkan sitasi Alkitab lebih banyak dan relevan.',
          '- Jika relevan, sebutkan konteks historis dan tokoh teologi utama.',
          '- Gunakan subjudul agar alur argumentasi jelas.',
        ].join('\n')
      : [
          'Mode akademik mendalam: NONAKTIF.',
          '- Tetap akademik, sistematis, dan argumentatif.',
          '- Jaga jawaban ringkas-menengah dengan sitasi secukupnya.',
        ].join('\n');

    return {
      additionalSystemMessages: [
        {
          role: 'system' as const,
          content: [
            '[THEOLOGY_ORCHESTRATOR]',
            sectionInstruction,
            'Instruksi penyusunan konten:',
            '- Berikan definisi istilah kunci di awal.',
            '- Kaitkan analisis dengan konteks biblika dan tradisi doktrinal arus utama.',
            '- Hindari jargon yang tidak perlu dijelaskan.',
            '- Tutup dengan kesimpulan yang menjawab pertanyaan user secara eksplisit.',
          ].join('\n'),
        },
      ],
    };
  }
}

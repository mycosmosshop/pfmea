// Action Priority Matrix — RESMİ AIAG-VDA FMEA Handbook (2019) tablosu.
// Bantlı resmi tablodan üretildi (Severity 9-10/7-8/4-6/2-3/1, Occurrence 8-10/6-7/4-5/2-3/1,
// Detection 7-10/5-6/2-4/1). Severity baskındır. Kaynak: AIAG-VDA Handbook / relyence.com AP tablosu.
// Dimensions: Severity (1-10) -> Occurrence (1-10) -> Detectability (1-10). Değerler: 'H' / 'M' / 'L'.

export const initialApMatrix: ('H' | 'M' | 'L')[][][] = [
  // Severity 1
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 5
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 6
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 7
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 8
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 9
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 10
  ],
  // Severity 2
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 5
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 6
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 7
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 8
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 9
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 10
  ],
  // Severity 3
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 5
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 6
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 7
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 8
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 9
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 10
  ],
  // Severity 4
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 5
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 6
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 7
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 5
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 5
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 6
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 7
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 6
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 3
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 4
    ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'M', 'M', 'M'], // Occurrence 5
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 6
    ['L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 7
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['M', 'M', 'M', 'M', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 7
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 3
    ['M', 'M', 'M', 'M', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 4
    ['M', 'M', 'M', 'M', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 5
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 6
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 7
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 8
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M'], // Occurrence 3
    ['M', 'M', 'M', 'M', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 4
    ['M', 'M', 'M', 'M', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 5
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 6
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 7
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 9
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 3
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 4
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 5
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 6
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 7
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
  // Severity 10
  [
    ['L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'], // Occurrence 1
    ['L', 'L', 'L', 'L', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 2
    ['L', 'L', 'L', 'L', 'M', 'M', 'H', 'H', 'H', 'H'], // Occurrence 3
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 4
    ['M', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 5
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 6
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 7
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 8
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 9
    ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], // Occurrence 10
  ],
];

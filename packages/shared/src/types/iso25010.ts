/**
 * ISO/IEC 25010 Software Quality Model
 * Defines the 8 quality characteristics and their sub-characteristics.
 */

export const ISO25010_CHARACTERISTICS = [
  'Functional Suitability',
  'Performance Efficiency',
  'Compatibility',
  'Usability',
  'Reliability',
  'Security',
  'Maintainability',
  'Portability',
] as const;

export type ISO25010Characteristic = (typeof ISO25010_CHARACTERISTICS)[number];

export const ISO25010_SUB_CHARACTERISTICS: Record<ISO25010Characteristic, readonly string[]> = {
  'Functional Suitability': ['Functional Completeness', 'Functional Correctness', 'Functional Appropriateness'],
  'Performance Efficiency': ['Time Behaviour', 'Resource Utilization', 'Capacity'],
  'Compatibility': ['Co-existence', 'Interoperability'],
  'Usability': [
    'Appropriateness Recognizability',
    'Learnability',
    'Operability',
    'User Error Protection',
    'User Interface Aesthetics',
    'Accessibility',
  ],
  'Reliability': ['Maturity', 'Availability', 'Fault Tolerance', 'Recoverability'],
  'Security': ['Confidentiality', 'Integrity', 'Non-repudiation', 'Accountability', 'Authenticity'],
  'Maintainability': ['Modularity', 'Reusability', 'Analysability', 'Modifiability', 'Testability'],
  'Portability': ['Adaptability', 'Installability', 'Replaceability'],
} as const;

export type ISO25010SubCharacteristic =
  (typeof ISO25010_SUB_CHARACTERISTICS)[ISO25010Characteristic][number];

export interface ISO25010Weight {
  characteristic: ISO25010Characteristic;
  weight: number;
}

export const DEFAULT_CHARACTERISTIC_WEIGHTS: Record<ISO25010Characteristic, number> = {
  'Functional Suitability': 0.15,
  'Performance Efficiency': 0.10,
  'Compatibility': 0.08,
  'Usability': 0.10,
  'Reliability': 0.15,
  'Security': 0.18,
  'Maintainability': 0.16,
  'Portability': 0.08,
};

export interface ISO25010QualityModel {
  characteristics: ISO25010Characteristic[];
  subCharacteristics: Record<ISO25010Characteristic, readonly string[]>;
  weights: Record<ISO25010Characteristic, number>;
}

export const ISO25010_QUALITY_MODEL: ISO25010QualityModel = {
  characteristics: [...ISO25010_CHARACTERISTICS],
  subCharacteristics: ISO25010_SUB_CHARACTERISTICS,
  weights: DEFAULT_CHARACTERISTIC_WEIGHTS,
};

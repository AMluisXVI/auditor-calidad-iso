import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { recommendations, maturityChecks } from '../src/index.js';
import type { RecommendationTemplate, MaturityCheck } from '../src/types/index.js';

describe('recommendations catalog', () => {
  it('should have 15 recommendations', () => {
    assert.equal(recommendations.length, 15);
  });

  it('each recommendation has required fields', () => {
    const requiredFields: (keyof RecommendationTemplate)[] = [
      'id',
      'findingType',
      'characteristic',
      'title',
      'description',
      'priority',
      'effort',
    ];

    for (const rec of recommendations) {
      for (const field of requiredFields) {
        assert.ok(
          rec[field] !== undefined && rec[field] !== '',
          `Recommendation ${rec.id} is missing field "${field}"`,
        );
      }
    }
  });

  it('each recommendation has valid priority', () => {
    const validPriorities = ['high', 'medium', 'low'];
    for (const rec of recommendations) {
      assert.ok(
        validPriorities.includes(rec.priority),
        `Recommendation ${rec.id} has invalid priority "${rec.priority}"`,
      );
    }
  });

  it('each recommendation has valid effort', () => {
    const validEfforts = ['low', 'medium', 'high'];
    for (const rec of recommendations) {
      assert.ok(
        validEfforts.includes(rec.effort),
        `Recommendation ${rec.id} has invalid effort "${rec.effort}"`,
      );
    }
  });

  it('no duplicate recommendation IDs', () => {
    const ids = recommendations.map((r) => r.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, 'Found duplicate recommendation IDs');
  });
});

describe('maturity checks catalog', () => {
  it('should have 12 maturity checks', () => {
    assert.equal(maturityChecks.length, 12);
  });

  it('each maturity check has required fields', () => {
    const requiredFields: (keyof MaturityCheck)[] = [
      'id',
      'name',
      'description',
      'weight',
      'category',
      'filePatterns',
    ];

    for (const check of maturityChecks) {
      for (const field of requiredFields) {
        assert.ok(
          check[field] !== undefined && check[field] !== '',
          `Maturity check ${check.id} is missing field "${field}"`,
        );
      }
    }
  });

  it('each maturity check has valid weight (1-3)', () => {
    for (const check of maturityChecks) {
      assert.ok(
        check.weight >= 1 && check.weight <= 3,
        `Maturity check ${check.id} has invalid weight ${check.weight}`,
      );
    }
  });

  it('each maturity check has non-empty filePatterns', () => {
    for (const check of maturityChecks) {
      assert.ok(
        Array.isArray(check.filePatterns) && check.filePatterns.length > 0,
        `Maturity check ${check.id} has empty filePatterns`,
      );
    }
  });

  it('no duplicate maturity check IDs', () => {
    const ids = maturityChecks.map((c) => c.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, 'Found duplicate maturity check IDs');
  });
});

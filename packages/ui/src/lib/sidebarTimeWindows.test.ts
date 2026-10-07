import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS,
  SIDEBAR_WINDOW_HOURS_MAX,
  SIDEBAR_WINDOW_HOURS_MIN,
  normalizeSidebarWindowHours,
  sidebarWindowHoursToMs,
} from './sidebarTimeWindows';

describe('normalizeSidebarWindowHours', () => {
  test('ships with a 48 h attention window, 1..720 h allowed', () => {
    expect(DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS).toBe(48);
    expect(SIDEBAR_WINDOW_HOURS_MIN).toBe(1);
    expect(SIDEBAR_WINDOW_HOURS_MAX).toBe(720);
  });

  test('keeps a whole number of hours inside the limits', () => {
    expect(normalizeSidebarWindowHours(12, 24)).toBe(12);
    expect(normalizeSidebarWindowHours(1, 24)).toBe(1);
    expect(normalizeSidebarWindowHours(720, 24)).toBe(720);
  });

  test('rounds fractions and clamps to the limits', () => {
    expect(normalizeSidebarWindowHours(11.6, 24)).toBe(12);
    expect(normalizeSidebarWindowHours(0, 24)).toBe(1);
    expect(normalizeSidebarWindowHours(-5, 24)).toBe(1);
    expect(normalizeSidebarWindowHours(100_000, 24)).toBe(720);
  });

  test('accepts a numeric string, as typed into the menu', () => {
    expect(normalizeSidebarWindowHours('36', 24)).toBe(36);
    expect(normalizeSidebarWindowHours(' 7 ', 24)).toBe(7);
  });

  test('falls back to the default for anything that is not a number', () => {
    expect(normalizeSidebarWindowHours(undefined, 24)).toBe(24);
    expect(normalizeSidebarWindowHours(null, 48)).toBe(48);
    expect(normalizeSidebarWindowHours('', 24)).toBe(24);
    expect(normalizeSidebarWindowHours('soon', 24)).toBe(24);
    expect(normalizeSidebarWindowHours(Number.NaN, 24)).toBe(24);
    expect(normalizeSidebarWindowHours(Number.POSITIVE_INFINITY, 24)).toBe(24);
    expect(normalizeSidebarWindowHours(true, 24)).toBe(24);
    expect(normalizeSidebarWindowHours({}, 24)).toBe(24);
  });

  test('converts hours to milliseconds', () => {
    expect(sidebarWindowHoursToMs(1)).toBe(3_600_000);
    expect(sidebarWindowHoursToMs(24)).toBe(24 * 60 * 60 * 1000);
  });
});

import { describe, it, expect } from 'vitest';
import { filledCells, asciiBar } from '../asciiBar';

describe('filledCells', () => {
  it('fills the whole width for the largest value', () => {
    expect(filledCells(154, 154, 40)).toBe(40);
  });

  it('scales a value against the largest one', () => {
    expect(filledCells(77, 154, 40)).toBe(20);
  });

  it('keeps one cell for a value too small to round up', () => {
    expect(filledCells(0.000001, 154, 40)).toBe(1);
  });

  it('is empty for a width of zero', () => {
    expect(filledCells(154, 154, 0)).toBe(0);
  });
});

describe('asciiBar', () => {
  it('splits a bar into filled and empty runs of the right lengths', () => {
    expect(asciiBar(3, 8)).toEqual(['███', '░░░░░']);
  });

  it('clamps a fill past the width', () => {
    expect(asciiBar(12, 8)).toEqual(['████████', '']);
  });
});

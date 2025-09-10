// src/utils/scale.ts
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// iPhone 14 base design width & height (you can change based on your design)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export function scale(size: number) {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
}

export function verticalScale(size: number) {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
}

export function moderateScale(size: number, factor = 0.5) {
  return size + (scale(size) - size) * factor;
}

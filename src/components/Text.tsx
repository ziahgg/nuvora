import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, type ColorToken } from '@/theme/tokens';
import { type, type TypeVariant } from '@/theme/typography';

export interface TxtProps extends TextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  size?: number;
}

const weightFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Text bound to the Figma type scale and colour tokens. */
export function Txt({ variant = 'body', color = 'text', align, weight, size, style, ...rest }: TxtProps) {
  const base = type[variant];
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: colors[color] },
        align ? { textAlign: align } : null,
        weight ? { fontFamily: weightFamily[weight] } : null,
        size ? { fontSize: size, lineHeight: Math.round(size * (base.lineHeight / base.fontSize)) } : null,
        style,
      ]}
    />
  );
}

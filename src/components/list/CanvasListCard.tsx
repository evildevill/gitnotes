import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import type { Canvas } from '../../models/Canvas';
import { useTheme } from '../../contexts/ThemeContext';
import CanvasThumbnail from '../CanvasThumbnail';

interface CanvasListCardProps {
  canvas: Canvas;
  onPress: (canvas: Canvas) => void;
  onLongPress?: (canvas: Canvas) => void;
  compact?: boolean;
}

export default function CanvasListCard({
  canvas,
  onPress,
  onLongPress,
  compact = false,
}: CanvasListCardProps) {
  const { colors } = useTheme();
  const title = canvas.title || 'Untitled Canvas';
  const elementCount = canvas.scene?.elements?.length ?? 0;
  const sceneWidth = canvas.scene?.width ?? 800;
  const sceneHeight = canvas.scene?.height ?? 600;
  const formattedDate = format(new Date(canvas.updatedAt), compact ? 'MMM d' : 'MMM d, yyyy');

  return (
    <TouchableOpacity
      testID={`canvas-card-${canvas.id}`}
      accessibilityLabel={`${title}, ${sceneWidth} by ${sceneHeight}, ${elementCount} elements, ${formattedDate}`}
      accessibilityRole="button"
      onPress={() => onPress(canvas)}
      onLongPress={() => onLongPress?.(canvas)}
      activeOpacity={0.8}
      style={[
        styles.container,
        { borderColor: colors.border },
        compact && styles.containerCompact,
      ]}
    >
      <View style={[styles.canvasWrap, { backgroundColor: '#fff' }]}>
        <CanvasThumbnail
          scene={canvas.scene}
          width={compact ? 80 : 120}
          height={compact ? 80 : 120}
        />
      </View>
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <Ionicons name="easel-outline" size={14} color={colors.primary} />
        <Text
          style={[styles.footerText, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.dimensionsBadge, { color: colors.primary }]}>
          {sceneWidth}×{sceneHeight}
        </Text>
        <Text style={[styles.footerMeta, { color: colors.textSecondary }]}>
          {elementCount} els
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
    height: 220,
  },
  containerCompact: {
    height: 160,
  },
  canvasWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  dimensionsBadge: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  footerMeta: {
    fontSize: 12,
  },
});

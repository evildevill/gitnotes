import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { HapticService } from '../utils/haptics';
import { SafeAreaView } from '../components/ui/SafeAreaView';
import PdfViewer from '../components/PdfViewer';

function encodeRepoPath(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

const PDF_INVERT_STORAGE_KEY = '@gitnotes:pdf_invert';

export default function PdfViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PdfViewer'>>();
  const { owner, repo, branch, path, title } = route.params;
  const { colors } = useTheme();
  const { authState } = useAuth();

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inverted, setInverted] = useState(false);
  const cancelledRef = useRef(false);
  const downloadedUriRef = useRef<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(PDF_INVERT_STORAGE_KEY).then((v) => {
      if (v === '1') setInverted(true);
    });
  }, []);

  const toggleInvert = useCallback(() => {
    HapticService.light();
    setInverted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(PDF_INVERT_STORAGE_KEY, next ? '1' : '0').catch(() => undefined);
      return next;
    });
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    setLocalUri(null);
    setError(null);

    // Drop any prior download from a previous param tuple before starting a new one.
    const previous = downloadedUriRef.current;
    if (previous) {
      downloadedUriRef.current = null;
      FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => undefined);
    }

    (async () => {
      try {
        const ref = branch || 'main';
        const url =
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}` +
          `?ref=${encodeURIComponent(ref)}`;

        const fileName = path.split('/').pop() ?? 'document.pdf';
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const target = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;

        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.raw',
        };
        if (authState.token) {
          headers.Authorization = `Bearer ${authState.token}`;
        }

        const result = await FileSystem.downloadAsync(url, target, { headers });
        if (cancelledRef.current) {
          // Effect was cancelled while we were downloading. Drop the file.
          FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
          return;
        }

        if (result.status !== 200) {
          // Failed download — still drop whatever was written.
          FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
          setError(`Download failed (HTTP ${result.status})`);
          return;
        }
        downloadedUriRef.current = result.uri;
        setLocalUri(result.uri);
      } catch (e) {
        if (cancelledRef.current) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [owner, repo, branch, path, authState.token]);

  useEffect(() => {
    return () => {
      const uri = downloadedUriRef.current;
      if (uri) {
        downloadedUriRef.current = null;
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
      }
    };
  }, []);

  const handleOpenExternal = async () => {
    if (!localUri) return;
    try {
      await Linking.openURL(localUri);
    } catch (error) {
      console.warn('Failed to open PDF externally:', error);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="flex-row items-center px-2 py-2 border-b border-border bg-surface"
        style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}
      >
        <TouchableOpacity
          testID="pdf-viewer.icon-button.back"
          onPress={() => { HapticService.light(); navigation.goBack(); }}
          className="p-2"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-center mx-2" style={{ color: colors.text }} numberOfLines={1}>
          {title || path.split('/').pop()}
        </Text>
        <TouchableOpacity
          testID="pdf-viewer.icon-button.invert"
          onPress={toggleInvert}
          className="p-2"
          disabled={!localUri}
          accessibilityLabel={inverted ? 'Restore PDF colors' : 'Invert PDF colors'}
        >
          <Ionicons
            name={inverted ? 'sunny-outline' : 'contrast-outline'}
            size={22}
            color={localUri ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          testID="pdf-viewer.icon-button.open-external"
          onPress={handleOpenExternal}
          className="p-2"
          disabled={!localUri}
        >
          <Ionicons
            name="open-outline"
            size={22}
            color={localUri ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text className="mt-3 text-sm text-center" style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : !localUri ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <PdfViewer
            uri={localUri}
            token={authState.token}
            style={{ flex: 1, backgroundColor: colors.background }}
            onError={setError}
          />
          {inverted ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#FFFFFF',
                mixBlendMode: 'difference',
              }}
            />
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

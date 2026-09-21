import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Pdf from 'react-native-pdf';

interface PdfViewerProps {
  uri: string;
  token?: string | null;
  style?: StyleProp<ViewStyle>;
  onError?: (message: string) => void;
}

function isGitHubUrl(uri: string): boolean {
  return uri.includes('api.github.com/repos/') || uri.includes('raw.githubusercontent.com');
}

export default function PdfViewer({ uri, token, style, onError }: PdfViewerProps) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.raw',
  };

  if (token && isGitHubUrl(uri)) {
    headers.Authorization = `Bearer ${token}`;
  }

  return (
    <Pdf
      source={{ uri, cache: true, headers }}
      style={style as ViewStyle}
      trustAllCerts={false}
      onError={(error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        onError?.(message);
      }}
    />
  );
}

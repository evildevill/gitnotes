import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockPdfViewer = jest.fn(() => null);

jest.mock('@/components/PdfViewer', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockPdfViewer(props);
    return null;
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      path: 'docs/manual.pdf',
      title: 'Manual',
    },
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      primary: '#00f',
      surface: '#fff',
      border: '#ddd',
      error: '#f00',
    },
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ authState: { token: 'token' } }),
}));

jest.mock('@/services/PositionMemoryService', () => ({
  PositionMemoryService: {
    pdfKey: () => 'pdf-key',
    load: jest.fn(async () => 0),
    save: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(async () => ({ status: 200, uri: 'file:///cache/manual.pdf' })),
  deleteAsync: jest.fn(async () => undefined),
}));

jest.mock('@/utils/haptics', () => ({
  HapticService: { light: jest.fn() },
}));

import PdfViewerScreen from '@/screens/PdfViewerScreen';

describe('PdfViewerScreen', () => {
  it('hands the downloaded PDF to the native PDF viewer instead of WebView', async () => {
    render(<PdfViewerScreen />);

    await waitFor(() => {
      expect(mockPdfViewer).toHaveBeenCalledWith(expect.objectContaining({
        uri: 'file:///cache/manual.pdf',
      }));
    });
  });
});

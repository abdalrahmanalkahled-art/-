import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * يتعامل مع الأخطاء في شجرة المكونات
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              {/* أيقونة الخطأ */}
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#fee2e2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 40 }}>⚠️</Text>
              </View>

              {/* عنوان الخطأ */}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                حدث خطأ غير متوقع
              </Text>

              {/* رسالة الخطأ */}
              <Text
                style={{
                  fontSize: 14,
                  color: '#6b7280',
                  marginBottom: 20,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {this.state.error?.message || 'يرجى المحاولة مجدداً أو الاتصال بالدعم الفني'}
              </Text>

              {/* تفاصيل الخطأ (في بيئة التطوير فقط) */}
              {__DEV__ && (
                <View
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20,
                    width: '100%',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#374151',
                      fontFamily: 'monospace',
                      lineHeight: 16,
                    }}
                  >
                    {this.state.error?.stack}
                  </Text>
                </View>
              )}

              {/* أزرار الإجراءات */}
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity
                  onPress={this.handleReset}
                  style={{
                    backgroundColor: '#1A56DB',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    حاول مرة أخرى
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    router.replace('/(tabs)');
                    this.handleReset();
                  }}
                  style={{
                    backgroundColor: '#e5e7eb',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 16 }}>
                    العودة للرئيسية
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

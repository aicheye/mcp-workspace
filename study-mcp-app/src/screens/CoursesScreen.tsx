import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { d2lService } from '../services/d2l';
import { colors } from '../theme';
interface Course {
    id: string;
    name: string;
    code: string;
    orgUnitId?: number;
}

export default function CoursesScreen() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation();

    const loadCourses = async () => {
        try {
            setError(null);
            const data = await d2lService.getCourses();
            setCourses(data);
        } catch (err: any) {
            console.error("Course Load Error:", err);
            setError(err.message || 'Failed to load courses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadCourses();
    };

    // FIX: renderCourseCard must be defined
    const renderCourseCard = ({ item }: { item: Course }) => (
        <TouchableOpacity
            style={styles.courseCard}
            onPress={() => (navigation.navigate as any)('CourseDetail', { course: item })}
        >
            <View style={styles.courseIcon}>
                <AntDesign name="book" size={24} color="#6366f1" />
            </View>
            <View style={styles.courseInfo}>
                <Text style={styles.courseName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.courseCode}>{item.code}</Text>
            </View>
            <AntDesign name="right" size={20} color="#94a3b8" />
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Fetching your classes...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>My Courses</Text>
            </View>
            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
                    <TouchableOpacity onPress={loadCourses}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={courses}
                renderItem={renderCourseCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
                }
                ListEmptyComponent={
                    !error ? (
                        <View style={styles.emptyContainer}>
                            <AntDesign name="inbox" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyHeader}>No courses found</Text>
                            <Text style={styles.emptySubtext}>Connect your D2L account to sync your studies</Text>
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={() => (navigation.navigate as any)('Settings')}
                            >
                                <Text style={styles.connectButtonText}>Go to Integrations</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: colors.muted,
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    courseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    courseIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    courseInfo: {
        flex: 1,
    },
    courseName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 14,
        color: colors.muted,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    errorBanner: {
        backgroundColor: '#fee2e2',
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 14,
        flex: 1,
    },
    retryText: {
        color: '#b91c1c',
        fontWeight: '700',
        marginLeft: 12,
    },
    emptyHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.muted,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    connectButton: {
        backgroundColor: colors.accent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    connectButtonText: {
        color: colors.card,
        fontWeight: '600',
        fontSize: 16,
    },
});
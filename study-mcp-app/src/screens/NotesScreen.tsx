import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { notesService } from '../services/notes';
import { Note } from '../types';
import BookmarkButton from '../components/BookmarkButton';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const hasFocusedOnce = useRef(false);
  const skipFirstEmptySearchDebounce = useRef(false);

  const loadNotes = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await notesService.getNotes();
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tabs stay mounted: refetch whenever this screen is shown (e.g. after upload modal closes).
  useFocusEffect(
    useCallback(() => {
      loadNotes({ silent: hasFocusedOnce.current });
      hasFocusedOnce.current = true;
    }, [loadNotes])
  );

  const onRefresh = () => {
    if (searchQuery.trim()) {
      setRefreshing(true);
      performSearch().finally(() => setRefreshing(false));
    } else {
      loadNotes({ silent: true });
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await notesService.searchNotes(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching notes:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
        // Skip the first debounced "" on mount (useFocusEffect already loads). After that, clearing search refetches.
        if (skipFirstEmptySearchDebounce.current) {
          loadNotes({ silent: true });
        } else {
          skipFirstEmptySearchDebounce.current = true;
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadNotes]);

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity style={styles.noteCard}>
      <View style={styles.noteCardHeader}>
        <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
        <BookmarkButton
          type="note"
          refId={item.id}
          title={item.title}
          metadata={{ courseId: item.courseId || item.course_id, snippet: `${item.pageCount || 0} pages` }}
        />
      </View>
      {(item.courseId || item.course_id) && (
        <Text style={styles.noteCourse}>{item.courseId || item.course_id}</Text>
      )}
      <View style={styles.noteMeta}>
        {item.pageCount && (
          <Text style={styles.metaText}>{item.pageCount} pages</Text>
        )}
        {item.chunkCount && (
          <Text style={styles.metaText}>{item.chunkCount} chunks</Text>
        )}
      </View>
      <Text style={styles.noteDate}>
        {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.searchResultCard}>
      <Text style={styles.searchResultTitle}>{item.title}</Text>
      {item.courseId && (
        <Text style={styles.searchResultCourse}>{item.courseId}</Text>
      )}
      <Text style={styles.searchResultSnippet} numberOfLines={2}>
        {item.snippet}
      </Text>
      {item.score && (
        <Text style={styles.searchResultScore}>
          Relevance: {(item.score * 100).toFixed(0)}%
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Notes</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => {
            // @ts-ignore - navigation type will be fixed later
            navigation.navigate('Upload');
          }}
        >
          <AntDesign name="plus" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={performSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              loadNotes({ silent: true });
            }}
            style={styles.clearButton}
          >
            <AntDesign name="closecircle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.trim() ? (
        isSearching ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <FlatList
            style={styles.listFlex}
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item, index) => item.sectionId || `search-${index}`}
            contentContainerStyle={
              searchResults.length === 0 ? styles.listContentEmpty : styles.listContent
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <AntDesign name="search1" size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search query</Text>
              </View>
            }
          />
        )
      ) : (
        loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : (
          <FlatList
            style={styles.listFlex}
            data={notes}
            renderItem={renderNote}
            keyExtractor={(item, index) => item.id || `note-${index}`}
            contentContainerStyle={notes.length === 0 ? styles.listContentEmpty : styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <AntDesign name="book" size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No notes yet</Text>
                <Text style={styles.emptySubtext}>Upload your first note to get started</Text>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  noteCourse: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 12,
  },
  noteMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  searchResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchResultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  searchResultCourse: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  searchResultSnippet: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  searchResultScore: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

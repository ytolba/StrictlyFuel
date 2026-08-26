import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment, arrayRemove, arrayUnion } from 'firebase/firestore';
import { Menu, Provider } from 'react-native-paper';
import { strictlyColors, strictlyRadius, strictlyType } from '../theme/strictlyTheme';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: any;
  replies: number;
  voteScore: number;  // Combined score (upvotes - downvotes)
  upvotedBy: string[];
  downvotedBy: string[];
}

type SortOption = 'latest' | 'popular';

const ForumScreen: React.FC = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'forum_posts'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(postsQuery);
      const fetchedPosts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as ForumPost[];

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to create a post',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }
    navigation.navigate('CreatePost');
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    if (!auth.currentUser) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to vote on posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    try {
      const postRef = doc(db, 'forum_posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return;
      }

      const userId = auth.currentUser.uid;
      const data = postDoc.data();
      const upvotedBy = data.upvotedBy || [];
      const downvotedBy = data.downvotedBy || [];
      
      let updates: any = {};
      
      if (voteType === 'up') {
        if (upvotedBy.includes(userId)) {
          // Remove upvote
          updates = {
            voteScore: increment(-1),
            upvotedBy: arrayRemove(userId)
          };
        } else {
          // Add upvote and remove downvote if exists
          updates = {
            voteScore: increment(1),
            upvotedBy: arrayUnion(userId)
          };
          if (downvotedBy.includes(userId)) {
            updates.voteScore = increment(2); // +2 because removing downvote (-1) and adding upvote (+1)
            updates.downvotedBy = arrayRemove(userId);
          }
        }
      } else {
        if (downvotedBy.includes(userId)) {
          // Remove downvote
          updates = {
            voteScore: increment(1),
            downvotedBy: arrayRemove(userId)
          };
        } else {
          // Add downvote and remove upvote if exists
          updates = {
            voteScore: increment(-1),
            downvotedBy: arrayUnion(userId)
          };
          if (upvotedBy.includes(userId)) {
            updates.voteScore = increment(-2); // -2 because removing upvote (+1) and adding downvote (-1)
            updates.upvotedBy = arrayRemove(userId);
          }
        }
      }

      await updateDoc(postRef, updates);
      await fetchPosts();
    } catch (error) {
      console.error('Error voting on post:', error);
      Alert.alert('Error', 'Failed to vote on post. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateContent = (content: string, limit: number = 120) => {
    if (content.length <= limit) return content;
    return content.slice(0, limit).trim() + '...';
  };

  const sortPosts = (posts: ForumPost[]) => {
    const sortedPosts = [...posts];
    if (sortBy === 'latest') {
      return sortedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      return sortedPosts.sort((a, b) => (b.voteScore || 0) - (a.voteScore || 0));
    }
  };

  return (
    <Provider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={styles.activeTab}>
              <Text style={styles.activeTabText}>Forum</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Groups</Text>
            </TouchableOpacity> */}
          </View>
          
          {/* Sort Menu */}
          <Menu
            visible={showSortMenu}
            onDismiss={() => setShowSortMenu(false)}
            anchor={
              <TouchableOpacity 
                style={styles.sortButton}
                onPress={() => setShowSortMenu(true)}
              >
                <Ionicons name="filter-outline" size={24} color="#2c2d30" />
                <Text style={styles.sortButtonText}>
                  {sortBy === 'latest' ? 'Latest' : 'Popular'}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item 
              onPress={() => {
                setSortBy('latest');
                setShowSortMenu(false);
              }} 
              title="Latest"
              leadingIcon="clock-outline"
            />
            <Menu.Item 
              onPress={() => {
                setSortBy('popular');
                setShowSortMenu(false);
              }} 
              title="Popular"
              leadingIcon="trending-up"
            />
          </Menu>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2c2d30"
            />
          }
        >
          {sortPosts(posts).map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => {
                navigation.navigate('PostDetail', { postId: post.id });
              }}
            >
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContent}>
                {truncateContent(post.content)}
              </Text>
              <View style={styles.postFooter}>
                <View style={styles.postInfo}>
                  <Text style={styles.postAuthor}>By {post.author}</Text>
                  <Text style={styles.postDate}>
                    {formatDate(post.createdAt)}
                  </Text>
                </View>
                <View style={styles.voteContainer}>
                  <TouchableOpacity 
                    style={styles.voteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleVote(post.id, 'up');
                    }}
                  >
                    <Ionicons 
                      name={post.upvotedBy?.includes(auth.currentUser?.uid || '') ? "arrow-up-circle" : "arrow-up-circle-outline"} 
                      size={24} 
                      color="#2c2d30" 
                    />
                  </TouchableOpacity>
                  <Text style={styles.voteScore}>{post.voteScore || 0}</Text>
                  <TouchableOpacity 
                    style={styles.voteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleVote(post.id, 'down');
                    }}
                  >
                    <Ionicons 
                      name={post.downvotedBy?.includes(auth.currentUser?.uid || '') ? "arrow-down-circle" : "arrow-down-circle-outline"} 
                      size={24} 
                      color="#2c2d30" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add-circle" size={56} color="#2c2d30" />
        </TouchableOpacity>
      </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: strictlyColors.line,
    backgroundColor: strictlyColors.background,
  },
  headerTitle: {
    fontSize: 24,
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: strictlyColors.white,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: strictlyRadius.medium,
    elevation: 2,
    shadowColor: strictlyColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  postTitle: {
    fontSize: 18,
    color: strictlyColors.ink,
    marginBottom: 8,
    fontFamily: strictlyType.sansMedium,
    fontWeight: '600',
  },
  postContent: {
    fontSize: 14,
    color: strictlyColors.muted,
    marginBottom: 12,
    fontFamily: strictlyType.sans,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 12,
    color: strictlyColors.muted,
    fontFamily: strictlyType.sans,
  },
  postDate: {
    fontSize: 12,
    color: strictlyColors.muted,
    fontFamily: strictlyType.sans,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: strictlyColors.lime,
    borderRadius: strictlyRadius.pill,
    elevation: 5,
    shadowColor: strictlyColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteButton: {
    padding: 4,
  },
  voteScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: strictlyColors.ink,
    fontFamily: strictlyType.sansMedium,
    minWidth: 30,
    textAlign: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: strictlyColors.cream,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  sortButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: strictlyColors.ink,
    fontFamily: strictlyType.sans,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: strictlyColors.cream,
  },
  activeTabText: {
    color: strictlyColors.ink,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: strictlyType.sansMedium,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabText: {
    color: strictlyColors.muted,
    fontSize: 16,
    fontFamily: strictlyType.sans,
  },
});

export default ForumScreen;

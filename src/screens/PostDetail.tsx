import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Menu, Provider } from 'react-native-paper';

type PostDetailRouteProp = RouteProp<{
  PostDetail: { postId: string };
}, 'PostDetail'>;

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  replies: Reply[];
}

const PostDetail: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const [post, setPost] = useState<Post | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, 'forum_posts', route.params.postId));
        
        if (postDoc.exists()) {
          setPost({
            id: postDoc.id,
            ...postDoc.data(),
            createdAt: postDoc.data().createdAt?.toDate() || new Date(),
          } as Post);
          setAuthorId(postDoc.data().authorId);
          console.log("authorId", postDoc.data().authorId);
          setIsAuthor(postDoc.data().authorId === auth.currentUser?.uid);
          console.log("isAuthor", isAuthor);
        } else {
          Alert.alert('Error', 'Post not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        Alert.alert('Error', 'Failed to load post. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [route.params.postId]);

  useEffect(() => {
    if (post) {
      setEditedContent(post.content);
      setEditedTitle(post.title);
    }
  }, [post]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReply = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to reply to posts');
      return;
    }

    if (!replyText.trim()) {
      Alert.alert('Error', 'Reply cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReply: Reply = {
        id: Date.now().toString(), // Simple ID generation
        content: replyText.trim(),
        author: auth.currentUser.displayName || 'Anonymous',
        createdAt: new Date(),
      };

      const postRef = doc(db, 'forum_posts', route.params.postId);
      await updateDoc(postRef, {
        replies: arrayUnion(newReply)
      });

      // Refresh post data to show new reply
      const updatedPost = await getDoc(postRef);
      if (updatedPost.exists()) {
        setPost({
          id: updatedPost.id,
          ...updatedPost.data(),
          createdAt: updatedPost.data().createdAt?.toDate() || new Date(),
        } as Post);
      }

      setReplyText(''); // Clear input
    } catch (error) {
      console.error('Error posting reply:', error);
      Alert.alert('Error', 'Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkPress = (url: string) => {
    // Check if it's a deep link
    if (url.startsWith('strictlyfuel://')) {
      // Extract scan ID from deep link
      const scanId = url.split('/').pop();
      if (scanId) {
        navigation.navigate('ScanHistoryScreen', { scanObject: scanId });
        return;
      }
    }

    // Handle regular URLs
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  };

  const renderTextWithLinks = (text: string) => {
    // Updated regex to match both URLs and deep links
    const linkRegex = /(https?:\/\/[^\s]+|strictlybased:\/\/scan\/[^\s]+)/g;
    const parts = text.split(linkRegex);

    return parts.map((part, index) => {
      if (part.match(linkRegex)) {
        const displayText = part.startsWith('strictlyfuel://')
          ? '👉 View Scan Details'
          : part;
        
        return (
          <TouchableOpacity 
            key={index} 
            onPress={() => handleLinkPress(part)}
          >
            <Text style={styles.link}>{displayText}</Text>
          </TouchableOpacity>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'forum_posts', post.id));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  const handleUpdate = async () => {
    try {
      await updateDoc(doc(db, 'forum_posts', post.id), {
        content: editedContent,
        title: editedTitle,
        editedAt: new Date()
      });
      setIsEditing(false);
      // Refresh post data
    } catch (error) {
      Alert.alert('Error', 'Failed to update post');
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c2d30" />
      </View>
    );
  }

  return (
    <Provider>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {post && (
              <View style={styles.postContainer}>
                {isAuthor == true && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash" size={24} color="red" />
                  </TouchableOpacity>
                )}
                <Text style={styles.title}>{post.title}</Text>
                <View style={styles.authorInfo}>
                  <Text style={styles.author}>By {post.author}</Text>
                  <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
                </View>
                <View style={styles.postContent}>
                  {renderTextWithLinks(post.content)}
                </View>
                
                {/* Replies Section */}
                <View style={styles.repliesSection}>
                  <Text style={styles.repliesTitle}>Replies</Text>
                  {post.replies !== undefined && post.replies?.map((reply) => (
                    <View key={reply.id} style={styles.replyContainer}>
                      <View style={styles.replyHeader}>
                        <Text style={styles.replyAuthor}>{reply.author}</Text>
                        <Text style={styles.replyDate}>
                          {formatDate(reply.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Reply Input Section */}
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.replyButton,
                (isSubmitting || !replyText.trim()) && styles.replyButtonDisabled
              ]}
              onPress={handleReply}
              disabled={isSubmitting || !replyText.trim()}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color={isSubmitting || !replyText.trim() ? '#999' : '#2c2d30'} 
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f3f2',
  },
  content: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c2d30',
    marginBottom: 12,
    fontFamily: 'System',
  },
  authorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  author: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  date: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c2d30',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#2c2d30',
  },
  repliesSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c2d30',
    marginBottom: 16,
    fontFamily: 'System',
  },
  replyContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  replyAuthor: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  replyDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2c2d30',
    fontFamily: 'System',
  },
  replyInputContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f4f3f2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontFamily: 'System',
  },
  replyButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f4f3f2',
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontFamily: 'System',
  },
  headerButton: {
    marginRight: 16,
    padding: 8,
  },
  editTitleInput: {
    fontSize: 20,
    fontFamily: 'System',
    color: '#2c2d30',
    padding: 12,
    backgroundColor: '#f4f3f2',
    borderRadius: 8,
    marginBottom: 12,
  },
  editContentInput: {
    fontSize: 16,
    fontFamily: 'System',
    color: '#2c2d30',
    padding: 12,
    backgroundColor: '#f4f3f2',
    borderRadius: 8,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f4f3f2',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2c2d30',
  },
  cancelButtonText: {
    color: '#2c2d30',
    fontFamily: 'System',
  },
  saveButtonText: {
    color: '#ffffff',
    fontFamily: 'System',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 1,
  },
});

export default PostDetail; 
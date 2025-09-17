import React, { useState, useRef } from 'react';
import { useWallet } from './hooks/useWallet';
import { useContracts } from './hooks/useContracts';
import './index.css';

// Type definitions
interface Post {
  id: string;
  content: string;
  photo?: string;
  author: string;
  authorProfile?: UserProfile;
  timestamp: number;
  likes: number;
  likedBy?: string[];
  userHasLiked?: boolean;
  comments: number;
  commentsList?: CommentItem[];
  txHash?: string;
  canDelete?: boolean;
  updatedAt?: number;
  isEdited?: boolean;
}

interface CommentItem {
  id: string;
  postId: string;
  author: string;
  text: string;
  timestamp: number;
  authorProfile?: UserProfile;
}

interface UserProfile {
  address: string;
  displayName: string;
  profilePhoto: string | null;
  bio: string;
  joinedDate: string;
  updatedDate?: string;
  txHash?: string;
  blockNumber?: number;
  profileFeesPaid?: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  duration: number;
  endTime: number;
  author: string;
  authorProfile?: UserProfile;
  totalVotes: number;
  userVote?: number;
  isActive: boolean;
  timestamp: number;
  txHash?: string;
}

interface PollOption {
  id: number;
  text: string;
  votes: number;
  percentage: number;
  voters: string[];
}

function App() {
  const { 
    account, 
    signer, 
    connectWallet, 
    isConnected, 
    isLoading,
    isCorrectNetwork,
    switchToMonadTestnet,
    expectedChainId,
    networkWarning
  } = useWallet();
  
  const { 
    posts, 
    userPostCount, 
    totalPosts,
    loading, 
    error,
    userProfile,
    createPost, 
    deletePost,
    likePost, 
    addComment, 
    hasUserLiked, 
    canDeletePost,
    refreshData,
    updateUserProfile,
    getUserProfile
  } = useContracts(signer, account);
  
  // Component state
  const [currentView, setCurrentView] = useState<string>('feed');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});
  const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [commentProfiles, setCommentProfiles] = useState<{[key: string]: UserProfile}>({});

  // NEW: Post menu and editing state
  const [showPostMenu, setShowPostMenu] = useState<{[key: string]: boolean}>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>('');
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  // Rich Text Editor State
  const [postContent, setPostContent] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [postStatus, setPostStatus] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Profile State
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    profilePhoto: null as File | null,
    bio: ''
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  // Poll State - FIXED: Dynamic polls stored on backend
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState<number>(24);
  const [isCreatingPoll, setIsCreatingPoll] = useState<boolean>(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState<boolean>(false);
  const [deletingPoll, setDeletingPoll] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARACTERS = 1000;
  const charactersLeft = MAX_CHARACTERS - postContent.length;

  // Emojis and special characters
  const quickEmojis = [
    '😀', '😂', '🤣', '😊', '😍', '🤔', '😎', '😭', '🔥', '💯', 
    '❤️', '👍', '👎', '✨', '🚀', '💎', '🌟', '⚡', '💰', '🎉',
    '🐸', '🦄', '👑', '💪', '🧠', '💊', '🎯', '📈', '📉', '🌙'
  ];

  const specialChars = [
    '→', '←', '↑', '↓', '✓', '✗', '★', '☆', '♥', '♦',
    '§', '†', '‡', '•', '◦', '‼', '⁉', '™', '©', '®'
  ];

  // FIXED: Safe account helpers to prevent null errors
  const getAccountAddress = (): string => account || '';
  const isAccountValid = (): boolean => Boolean(account);

  // FIXED: Logout function
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      window.location.reload();
    }
  };

  // ENHANCEMENT 1: Markdown Text Renderer
  const renderFormattedText = (text: string): React.JSX.Element => {
    if (!text) return <span></span>;

    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');

    return (
      <span 
        dangerouslySetInnerHTML={{ __html: formattedText }}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    );
  };

  // FIXED: Type-safe display name function
  const getDisplayName = (address: string, profile?: UserProfile | null): string => {
    if (profile?.displayName) {
      return profile.displayName;
    }
    return `User ${address.slice(-4)}`;
  };

  // FIXED: Load comment profiles for proper display
  const loadCommentProfile = React.useCallback(async (address: string) => {
    if (commentProfiles[address]) return commentProfiles[address];
    
    try {
      const profile = await getUserProfile(address);
      setCommentProfiles(prev => ({ ...prev, [address]: profile }));
      return profile;
    } catch (err) {
      const defaultProfile: UserProfile = {
        address,
        displayName: `User ${address.slice(-4)}`,
        profilePhoto: null,
        bio: '',
        joinedDate: new Date().toISOString()
      };
      setCommentProfiles(prev => ({ ...prev, [address]: defaultProfile }));
      return defaultProfile;
    }
  }, [commentProfiles, getUserProfile]);

  // FIXED: Poll backend integration with real-time updates
  const loadPolls = React.useCallback(async () => {
    try {
      setPollsLoading(true);
      const response = await fetch('https://monad-social-backend.onrender.com/polls');
      if (response.ok) {
        const serverPolls = await response.json();
        
        // Enhance polls with author profiles
        const enhancedPolls = await Promise.all(serverPolls.map(async (poll: Poll) => {
          const authorProfile = await getUserProfile(poll.author);
          return {
            ...poll,
            authorProfile,
            isActive: poll.endTime > Date.now()
          };
        }));
        
        setPolls(enhancedPolls.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (err) {
      console.error('Error loading polls:', err);
    } finally {
      setPollsLoading(false);
    }
  }, [getUserProfile]);

  // Enhanced poll creation with backend storage
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      alert('Please enter a poll question');
      return;
    }

    const validOptions = pollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert('Please enter at least 2 poll options');
      return;
    }

    if (!isCorrectNetwork) {
      alert('Please switch to Monad Testnet to create polls');
      return;
    }

    setIsCreatingPoll(true);

    try {
      const newPoll: Poll = {
        id: `poll_${getAccountAddress()}_${Date.now()}`,
        question: pollQuestion.trim(),
        options: validOptions.map((text, index) => ({
          id: index,
          text: text.trim(),
          votes: 0,
          percentage: 0,
          voters: []
        })),
        duration: pollDuration,
        endTime: Date.now() + (pollDuration * 60 * 60 * 1000),
        author: getAccountAddress(),
        totalVotes: 0,
        isActive: true,
        timestamp: Math.floor(Date.now() / 1000),
        txHash: `0x${Math.random().toString(16).slice(2, 18)}...`
      };

      // Save to backend
      const response = await fetch('https://monad-social-backend.onrender.com/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPoll)
      });

      if (response.ok) {
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollDuration(24);
        
        // REAL-TIME: Add poll immediately to local state
        const authorProfile = await getUserProfile(getAccountAddress());
        const enhancedPoll = { ...newPoll, authorProfile };
        setPolls(prev => [enhancedPoll, ...prev]);
        
        alert('Poll created successfully! Transaction fee: 0.001 MON');
      }
      
    } catch (err: any) {
      console.error('Failed to create poll:', err);
      alert(`Failed to create poll: ${err.message}`);
    } finally {
      setIsCreatingPoll(false);
    }
  };

  // FIXED: Real-time poll voting with immediate UI updates
  const handleVotePoll = async (pollId: string, optionId: number) => {
    if (!isConnected || !isCorrectNetwork || !getAccountAddress()) {
      alert('Please connect to Monad Testnet to vote');
      return;
    }

    try {
      const userAddress = getAccountAddress().toLowerCase();
      
      // Optimistic update - update UI immediately
      setPolls(prevPolls => 
        prevPolls.map(poll => {
          if (poll.id === pollId) {
            const updatedOptions = poll.options.map(option => {
              // Remove user from all options first
              const cleanedVoters = option.voters.filter(voter => voter !== userAddress);
              
              if (option.id === optionId) {
                // Add user to selected option
                return {
                  ...option,
                  voters: [...cleanedVoters, userAddress],
                  votes: cleanedVoters.length + 1
                };
              } else {
                return {
                  ...option,
                  voters: cleanedVoters,
                  votes: cleanedVoters.length
                };
              }
            });
            
            const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);
            const updatedOptionsWithPercentage = updatedOptions.map(option => ({
              ...option,
              percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            }));
            
            return {
              ...poll,
              options: updatedOptionsWithPercentage,
              totalVotes
            };
          }
          return poll;
        })
      );

      // Send to backend
      const response = await fetch(`https://monad-social-backend.onrender.com/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user: userAddress,
          optionId 
        })
      });

      if (!response.ok) {
        // If backend fails, revert the optimistic update
        await loadPolls();
        alert('Failed to save vote. Please try again.');
      }
      
    } catch (err: any) {
      console.error('Failed to vote:', err);
      // Revert optimistic update on error
      await loadPolls();
      alert('Failed to vote. Please try again.');
    }
  };

  // NEW: Delete poll function
  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;
    
    setDeletingPoll(pollId);
    
    try {
      const response = await fetch(`https://monad-social-backend.onrender.com/polls/${pollId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getAccountAddress() })
      });

      if (response.ok) {
        // Remove from local state immediately
        setPolls(prev => prev.filter(poll => poll.id !== pollId));
        alert('Poll deleted successfully!');
      } else {
        alert('Failed to delete poll. Please try again.');
      }
      
    } catch (err: any) {
      console.error('Failed to delete poll:', err);
      alert('Failed to delete poll. Please try again.');
    } finally {
      setDeletingPoll(null);
    }
  };

  // NEW: Post menu functions
  const togglePostMenu = (postId: string) => {
    setShowPostMenu(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleSavePost = (postId: string) => {
  const action = savedPosts.includes(postId) ? 'unsave' : 'save';
  
  // Update local state
  setSavedPosts(prev => 
    action === 'save' 
      ? [...prev, postId]
      : prev.filter(id => id !== postId)
  );
  
  setShowPostMenu(prev => ({ ...prev, [postId]: false }));
  setPostStatus(`Post ${action}d successfully!`);
  setTimeout(() => setPostStatus(''), 3000);
};

  const startEditingPost = (post: Post) => {
    setEditingPost(post.id);
    setEditPostContent(post.content);
    setShowPostMenu(prev => ({ ...prev, [post.id]: false }));
  };

const handleUpdatePost = async (postId: string) => {
  if (!editPostContent.trim()) {
    alert('Post content cannot be empty');
    return;
  }

  try {
    console.log('Updating post:', postId, 'with content:', editPostContent.trim());
    
    const response = await fetch(`https://monad-social-backend.onrender.com/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: editPostContent.trim(),
        user: getAccountAddress()
      })
    });

    console.log('Update response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Post update result:', result);
      
      // Clear editing state first
      setEditingPost(null);
      setEditPostContent('');
      setPostStatus('Post updated successfully!');
      
      // Force refresh the data to show updated post
      setTimeout(() => {
        refreshData();
      }, 100);
      
    } else {
      const errorData = await response.json();
      console.error('Update failed:', errorData);
      throw new Error(errorData.message || 'Failed to update post');
    }
    
  } catch (err: any) {
    console.error('Failed to update post:', err);
    setPostStatus(`Failed to update post: ${err.message}`);
  }
  
  // Clear status after 3 seconds
  setTimeout(() => setPostStatus(''), 3000);
};


  // Load polls on component mount and when account changes - with real-time refresh
  React.useEffect(() => {
    if (isConnected) {
      loadPolls();
      // Set up polling for real-time updates
      const pollInterval = setInterval(loadPolls, 5000); // Refresh every 5 seconds
      return () => clearInterval(pollInterval);
    }
  }, [isConnected, loadPolls]);

  // FIXED: Load comment profiles - properly typed
  React.useEffect(() => {
    // Type-safe posts processing
    const typedPosts = posts as Post[];
    if (Array.isArray(typedPosts)) {
      typedPosts.forEach((post: Post) => {
        if (post.commentsList && showComments[post.id]) {
          post.commentsList.forEach((comment: CommentItem) => {
            if (!commentProfiles[comment.author]) {
              loadCommentProfile(comment.author);
            }
          });
        }
      });
    }
  }, [posts, showComments, commentProfiles, loadCommentProfile]);

  // Close post menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowPostMenu({});
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [notification, setNotification] = useState<string>('');

// Add this useEffect to clear notifications:
React.useEffect(() => {
  if (notification) {
    const timer = setTimeout(() => setNotification(''), 3000);
    return () => clearTimeout(timer);
  }
}, [notification]);



  // Monad Logo Component
  const MonadLogo = ({ size = 40 }: { size?: number }) => (
    <div className="monad-logo-container">
      <svg width={size} height={size} viewBox="0 0 100 100" className="monad-logo-svg">
        <defs>
          <linearGradient id="monadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#836EF9" />
            <stop offset="100%" stopColor="#FF6B6B" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#monadGradient)" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="3" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="15" fill="white" />
        <text x="50" y="58" textAnchor="middle" fill="#836EF9" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">M</text>
      </svg>
    </div>
  );

  // Handle post creation with rich text
  const handleCreatePost = async (): Promise<void> => {
    if (!postContent.trim()) {
      alert('Please enter some content for your post');
      return;
    }

    if (!isCorrectNetwork) {
      alert(`Please switch to Monad Testnet (Chain ID: ${expectedChainId}) before posting`);
      return;
    }

    setIsPosting(true);
    setPostStatus('Creating post on blockchain...');

    try {
      const result = await createPost(postContent, selectedPhoto);
      if (result && result.success) {
        setPostStatus('Post created successfully!');
        setPostContent('');
        setSelectedPhoto(null);
        setPhotoPreview('');
        setShowEmojiPicker(false);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        setTimeout(() => setPostStatus(''), 3000);
      }
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setPostStatus(`Failed to create post: ${err.message || 'Unknown error'}`);
      setTimeout(() => setPostStatus(''), 5000);
    }

    setIsPosting(false);
  };

  // Rich text editor functions
  const handleEmojiClick = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = postContent.slice(0, start) + emoji + postContent.slice(end);
    
    if (newContent.length <= MAX_CHARACTERS) {
      setPostContent(newContent);
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
  };

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = postContent.slice(start, end);
    
    if (selectedText) {
      let formattedText = selectedText;
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `__${selectedText}__`;
          break;
        case 'code':
          formattedText = `\`${selectedText}\``;
          break;
      }
      
      const newContent = postContent.slice(0, start) + formattedText + postContent.slice(end);
      if (newContent.length <= MAX_CHARACTERS) {
        setPostContent(newContent);
      }
    } else {
      alert('Please select text to format');
    }
  };

  const insertTemplate = (template: string) => {
    const templates: { [key: string]: string } = {
      'bulleted': '• \n• \n• ',
      'numbered': '1. \n2. \n3. ',
      'hashtag': '#MonadSocial #DeFi #Crypto ',
      'mention': '@username ',
      'divider': '\n────────────\n'
    };
    
    const templateText = templates[template];
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newContent = postContent.slice(0, start) + templateText + postContent.slice(start);
    
    if (newContent.length <= MAX_CHARACTERS) {
      setPostContent(newContent);
      setTimeout(() => {
        textarea.setSelectionRange(start + templateText.length, start + templateText.length);
        textarea.focus();
      }, 0);
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file too large (max 5MB)');
        return;
      }

      setSelectedPhoto(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile functions
  const handleProfilePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        alert('Profile photo too large (max 2MB)');
        return;
      }

      setProfileForm(prev => ({ ...prev, profilePhoto: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    if (!isCorrectNetwork) {
      alert('Please switch to Monad Testnet to update your profile');
      return;
    }

    const confirmUpdate = window.confirm(
      'Profile update requires a 0.001 MON blockchain transaction fee. This helps secure your identity on Monad. Continue?'
    );
    
    if (!confirmUpdate) return;

    setIsUpdatingProfile(true);

    try {
      let photoData = null;
      if (profileForm.profilePhoto) {
        const reader = new FileReader();
        photoData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(profileForm.profilePhoto as File);
        });
      }

      const result = await updateUserProfile({
        displayName: profileForm.displayName.trim(),
        profilePhoto: photoData,
        bio: profileForm.bio.trim()
      });

      if (result.success) {
        alert(`Profile updated successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);
        setIsEditingProfile(false);
        setProfileForm({ displayName: '', profilePhoto: null, bio: '' });
        setProfilePhotoPreview('');
      }
      
    } catch (err: any) {
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Other handlers
  const handleDeletePost = async (postId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this post?');
    if (!confirmDelete) return;

    setDeletingPost(postId);
    
    try {
      await deletePost(postId);
      setPostStatus('Post deleted successfully!');
      setTimeout(() => setPostStatus(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      alert(`Failed to delete post: ${err.message || 'Unknown error'}`);
    }
    
    setDeletingPost(null);
    setShowPostMenu(prev => ({ ...prev, [postId]: false }));
  };

  const handleLikePost = async (postId: string) => {
    if (!isConnected) {
      alert('Please connect your wallet to like posts');
      return;
    }

    if (!isCorrectNetwork) {
      alert('Please switch to Monad Testnet to like posts');
      return;
    }

    setLikingPost(postId);
    
    try {
      await likePost(postId);
    } catch (err: any) {
      console.error('Failed to like post:', err);
      alert('Failed to like post. Please try again.');
    }
    
    setLikingPost(null);
  };

  const handleAddComment = async (postId: string) => {
    const commentText = commentTexts[postId]?.trim();
    if (!commentText) {
      alert('Please enter a comment');
      return;
    }

    if (!isConnected || !isCorrectNetwork) {
      alert('Please connect to Monad Testnet to comment');
      return;
    }

    try {
      await addComment(postId, commentText);
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Please try again.');
    }
  };

  // Utility functions
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // FIXED: Properly typed posts
  const typedPosts: Post[] = posts as Post[];

  // Login Screen Component
  const LoginScreen = () => (
    <div className="login-screen">
      <div className="login-hero">
        <div className="monad-logo-official">
          <MonadLogo size={80} />
        </div>
        
        <h1 className="login-title">Welcome to MonadSocial</h1>
        <p className="login-subtitle">
          The fastest decentralized social feed on Monad blockchain. 
          Post, like, and comment with sub-second finality and ultra-low fees.
        </p>
        
        <div className="monad-features">
          <div className="feature-badge">⚡ 1-Second Finality</div>
          <div className="feature-badge">💰 Ultra-Low Fees</div>
          <div className="feature-badge">🔗 EVM Compatible</div>
        </div>
        
        {networkWarning && (
          <div className="network-error">
            <p>⚠️ {networkWarning}</p>
            <button className="switch-network-btn" onClick={switchToMonadTestnet}>
              Switch to Monad Testnet
            </button>
          </div>
        )}
        
        <button 
          className="connect-btn-large" 
          onClick={connectWallet}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet to Join MonadSocial'}
        </button>
        <p className="login-footer">
          Powered by Monad Testnet • Join the fastest blockchain social network
        </p>
      </div>
    </div>
  );

  // Network Warning Component
  const NetworkWarning = () => (
    networkWarning && isConnected ? (
      <div className="network-warning">
        <div className="warning-content">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">{networkWarning}</span>
          <button className="switch-btn" onClick={switchToMonadTestnet}>
            Switch Network
          </button>
        </div>
      </div>
    ) : null
  );

  // Show login screen when not connected
  if (!isConnected) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      {/* Network Warning */}
      <NetworkWarning />

      {/* FIXED: Scrollable Header (removed fixed positioning) */}
      <header className="header scrollable">
        <div className="header-content">
          <div className="header-left">
            <MonadLogo size={32} />
            <h1 className="app-title">MonadSocial</h1>
          </div>
          
          {/* Navigation */}
          <nav className="nav-buttons">
            <button 
              className={`nav-btn ${currentView === 'feed' ? 'active' : ''}`}
              onClick={() => setCurrentView('feed')}
            >
              Feed {totalPosts > 0 && `(${totalPosts})`}
            </button>
            <button 
              className={`nav-btn ${currentView === 'polls' ? 'active' : ''}`}
              onClick={() => setCurrentView('polls')}
            >
              Polls
            </button>
            <button 
              className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentView('profile')}
            >
              Profile
            </button>
          </nav>

          {/* FIXED: Better positioned wallet section with logout */}
          <div className="wallet-section">
          <div className="wallet-info">
            <div className="user-badge">
              <span className="network-indicator">
                {isCorrectNetwork ? '✅' : '⚠️'}
              </span>
              <span className="username">
                {getDisplayName(getAccountAddress(), userProfile)}
              </span>
            </div>
          </div>
          <button 
            className="logout-btn-new"
            onClick={handleLogout}
            title="Disconnect Wallet"
          >
            Logout
          </button>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          
          {/* ENHANCEMENT 2: Profile Stats Card - ONLY show in Profile section */}
          {currentView === 'profile' && (
            <div className="stats-card">
              <h3>Profile Stats</h3>
              <div className="stat-item">
                <span className="stat-label">Your Posts</span>
                <span className="stat-value">{userPostCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Posts</span>
                <span className="stat-value">{totalPosts}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Address</span>
                <span className="stat-value">{formatAddress(getAccountAddress())}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Network Status</span>
                <span className={`stat-value ${isCorrectNetwork ? '' : 'text-red-400'}`}>
                  {isCorrectNetwork ? 'Monad Testnet ✅' : 'Wrong Network ⚠️'}
                </span>
              </div>
            </div>
          )}

          {/* Content based on current view */}
          {currentView === 'feed' && (
            <>
              {/* Rich Text Post Creation Form - FIXED SPACING */}
              <div className={`rich-text-post-creator ${!isCorrectNetwork ? 'opacity-50' : ''}`}>
                <h3 className="post-creator-title">What's happening on Monad? ⚡</h3>
                
                {!isCorrectNetwork && (
                  <div className="form-warning">
                    Switch to Monad Testnet to post
                  </div>
                )}
                
                {/* Formatting Toolbar */}
                <div className="formatting-toolbar">
                  <div className="format-group">
                    <button 
                      type="button"
                      onClick={() => applyFormatting('bold')}
                      className="format-btn"
                      title="Bold (select text first)"
                      disabled={!isCorrectNetwork}
                    >
                      <strong>B</strong>
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyFormatting('italic')}
                      className="format-btn"
                      title="Italic (select text first)"
                      disabled={!isCorrectNetwork}
                    >
                      <em>I</em>
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyFormatting('underline')}
                      className="format-btn"
                      title="Underline (select text first)"
                      disabled={!isCorrectNetwork}
                    >
                      <u>U</u>
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyFormatting('code')}
                      className="format-btn"
                      title="Code (select text first)"
                      disabled={!isCorrectNetwork}
                    >
                      &lt;&gt;
                    </button>
                  </div>
                  
                  <div className="format-group">
                    <button 
                      type="button"
                      onClick={() => insertTemplate('bulleted')}
                      className="format-btn"
                      title="Bullet List"
                      disabled={!isCorrectNetwork}
                    >
                      • List
                    </button>
                    <button 
                      type="button"
                      onClick={() => insertTemplate('numbered')}
                      className="format-btn"
                      title="Numbered List"
                      disabled={!isCorrectNetwork}
                    >
                      1. List
                    </button>
                    <button 
                      type="button"
                      onClick={() => insertTemplate('hashtag')}
                      className="format-btn"
                      title="Add Hashtags"
                      disabled={!isCorrectNetwork}
                    >
                      #Tags
                    </button>
                  </div>
                  
                  <div className="format-group">
                    <button 
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="format-btn emoji-btn"
                      title="Add Emoji"
                      disabled={!isCorrectNetwork}
                    >
                      😀
                    </button>
                  </div>
                </div>

                {/* Quick Emojis */}
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    <div className="emoji-section">
                      <h4>Quick Emojis</h4>
                      <div className="emoji-grid">
                        {quickEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="emoji-item"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="emoji-section">
                      <h4>Special Characters</h4>
                      <div className="emoji-grid">
                        {specialChars.map((char) => (
                          <button
                            key={char}
                            type="button"
                            onClick={() => handleEmojiClick(char)}
                            className="emoji-item special-char"
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Rich Text Area */}
                <div className="rich-textarea-container">
                  <textarea
                    ref={textareaRef}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share your thoughts about Monad's lightning-fast blockchain..."
                    className="rich-post-textarea"
                    maxLength={MAX_CHARACTERS}
                    disabled={!isCorrectNetwork}
                    rows={6}
                  />
                  
                  <div className={`character-counter ${charactersLeft < 100 ? 'warning' : charactersLeft < 50 ? 'danger' : ''}`}>
                    {charactersLeft} characters remaining
                  </div>
                </div>
                
                {/* Photo Upload Section */}
                <div className="photo-upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="photo-input"
                    id="rich-photo-input"
                    disabled={!isCorrectNetwork}
                  />
                  <label htmlFor="rich-photo-input" className="photo-upload-btn">
                    📸 Add Photo/Image
                  </label>
                  
                  {photoPreview && (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Preview" className="preview-image" />
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(null);
                          setPhotoPreview('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="remove-photo-btn"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="post-form-footer">
                  <span className="fee-info">
                    🔗 Blockchain Fee: 0.001 MON | ⚡ Instant Finality
                  </span>
                  <button 
                    className="rich-post-btn"
                    onClick={handleCreatePost}
                    disabled={isPosting || !postContent.trim() || !isCorrectNetwork || charactersLeft < 0}
                  >
                    {isPosting ? '⏳ Posting to Blockchain...' : 
                     !isCorrectNetwork ? 'Wrong Network' :
                     charactersLeft < 0 ? 'Too Many Characters' :
                     '🚀 Post to MonadSocial'}
                  </button>
                </div>
                
                {postStatus && (
                  <div className={`status-message ${postStatus.includes('success') || postStatus.includes('deleted') ? 'success' : 'error'}`}>
                    {postStatus}
                  </div>
                )}
              </div>

              {/* Posts Feed */}
              <div className="feed-card">
                <div className="feed-header">
                  <h3>Recent Posts ({totalPosts} posts)</h3>
                  <button className="refresh-btn" onClick={refreshData} disabled={loading}>
                    {loading ? '🔄' : '↻'} Refresh
                  </button>
                </div>

                {error && !loading && (
                  <div className="error-state">
                    <p>Error loading posts: {error}</p>
                    <button onClick={refreshData} className="retry-btn">Retry</button>
                  </div>
                )}

                <div className="posts-list">
                  {typedPosts.length === 0 && !loading ? (
                    <div className="empty-state">
                      <p>No posts yet. Be the first to post something on Monad!</p>
                    </div>
                  ) : (
                    typedPosts.map((post: Post) => (
                      <div key={post.id} className="post-item">
                        <div className="post-header">
                        <div className="post-author-section">
                          {post.authorProfile?.profilePhoto ? (
                            <img 
                              src={post.authorProfile.profilePhoto} 
                              alt={post.authorProfile.displayName || 'User'} 
                              className="author-profile-photo"
                            />
                          ) : (
                            <div className="author-avatar-placeholder">
                              {post.authorProfile?.displayName?.[0]?.toUpperCase() || post.author.slice(-2).toUpperCase()}
                            </div>
                          )}
                          
                          <div className="author-info">
                            <div className="author-name-row">
                              <span className="author-display-name">
                                {getDisplayName(post.author, post.authorProfile)}
                              </span>
                              
                              {/* "You" badge right after username */}
                              {isAccountValid() && post.author && 
                              post.author.toLowerCase() === getAccountAddress().toLowerCase() && (
                                <span className="own-post-badge-inline">You</span>
                              )}
                              
                              {/* 3-dot menu aligned on same line */}
                              <div className="post-menu-container-inline">
                                <button 
                                  className="post-menu-btn-enhanced"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePostMenu(post.id);
                                  }}
                                  title="Post options"
                                >
                                  ⋯
                                </button>
                                
                                {showPostMenu[post.id] && (
                                  <div className="post-menu-dropdown-enhanced">
                                    {canDeletePost(post) && (
                                      <>
                                        <button 
                                          className="menu-item-enhanced edit-item"
                                          onClick={() => startEditingPost(post)}
                                        >
                                          <span className="menu-icon">✏️</span>
                                          <span className="menu-text">Edit Post</span>
                                        </button>
                                        <button 
                                          className="menu-item-enhanced delete-item"
                                          onClick={() => handleDeletePost(post.id)}
                                          disabled={deletingPost === post.id}
                                        >
                                          <span className="menu-icon">{deletingPost === post.id ? '⏳' : '🗑️'}</span>
                                          <span className="menu-text">Delete</span>
                                        </button>
                                      </>
                                    )}
                                    <button 
                                      className="menu-item-enhanced save-item"
                                      onClick={() => handleSavePost(post.id)}
                                    >
                                      <span className="menu-icon">{savedPosts.includes(post.id) ? '❤️' : '🔖'}</span>
                                      <span className="menu-text">{savedPosts.includes(post.id) ? 'Saved' : 'Save Post'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="author-meta-row">
                              <span className="author-address">{formatAddress(post.author)}</span>
                              <span className="post-time">{formatTime(post.timestamp)}</span>
                              {post.isEdited && post.updatedAt && (
                                <span className="edited-time">
                                  (edited {formatTime(post.updatedAt)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                        
                        {/* Post content - with editing capability */}
                        {editingPost === post.id ? (
                          <div className="edit-post-container">
                            <textarea
                              value={editPostContent}
                              onChange={(e) => setEditPostContent(e.target.value)}
                              className="edit-post-textarea"
                              rows={4}
                              maxLength={MAX_CHARACTERS}
                            />
                            <div className="edit-post-actions">
                              <button 
                                className="save-edit-btn"
                                onClick={() => handleUpdatePost(post.id)}
                              >
                                💾 Save Changes
                              </button>
                              <button 
                                className="cancel-edit-btn"
                                onClick={() => {
                                  setEditingPost(null);
                                  setEditPostContent('');
                                }}
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="post-content">{renderFormattedText(post.content)}</div>
                        )}
                        
                        {post.photo && (
                          <div className="post-photo">
                            <img src={post.photo} alt="Post content" className="post-image" />
                          </div>
                        )}
                        
                        <div className="post-actions">
                          <button 
                            className={`action-btn like-btn ${hasUserLiked(post) ? 'liked' : ''}`}
                            onClick={() => handleLikePost(post.id)}
                            disabled={!isConnected || !isCorrectNetwork || likingPost === post.id}
                          >
                            {likingPost === post.id ? '⏳' : hasUserLiked(post) ? '❤️' : '🤍'} {post.likes}
                          </button>
                          
                          <button 
                            className="action-btn comment-btn"
                            onClick={() => toggleComments(post.id)}
                          >
                            💬 {post.comments}
                          </button>
                          
                          <span className="post-id">#{post.id.slice(-8)}</span>
                        </div>
                        
                        {showComments[post.id] && (
                          <div className="comments-section">
                            {isConnected && isCorrectNetwork && (
                              <div className="add-comment">
                                <input
                                  type="text"
                                  placeholder="Add a comment..."
                                  value={commentTexts[post.id] || ''}
                                  onChange={(e) => setCommentTexts(prev => ({
                                    ...prev,
                                    [post.id]: e.target.value
                                  }))}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                  className="comment-input"
                                />
                                <button 
                                  onClick={() => handleAddComment(post.id)}
                                  className="comment-submit-btn"
                                >
                                  Post
                                </button>
                              </div>
                            )}
                            
                            {/* ENHANCED: Beautiful comment display with proper profiles */}
                            {post.commentsList && post.commentsList.length > 0 && (
                              <div className="comments-list">
                                {post.commentsList.map((comment) => {
                                  const commentProfile = commentProfiles[comment.author];

                                  return (
                                    <div key={comment.id} className="comment-item-enhanced">
                                      <div className="comment-avatar">
                                        {commentProfile?.profilePhoto ? (
                                          <img 
                                            src={commentProfile.profilePhoto} 
                                            alt={commentProfile.displayName || 'User'} 
                                            className="comment-profile-photo"
                                          />
                                        ) : (
                                          <div className="comment-avatar-placeholder">
                                            {commentProfile?.displayName?.[0]?.toUpperCase() || comment.author.slice(-2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="comment-content">
                                        <div className="comment-bubble">
                                          <div className="comment-header">
                                            <span className="comment-author-name">
                                              {getDisplayName(comment.author, commentProfile)}
                                            </span>
                                            <span className="comment-time">{formatTime(comment.timestamp)}</span>
                                          </div>
                                          <div className="comment-text">{comment.text}</div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* ENHANCEMENT 3: Real Polls with Backend Integration and Delete Option */}
          {currentView === 'polls' && (
            <div className="polls-container">
              <div className="polls-header">
                <h3>Community Polls</h3>
                <p>Create and vote on polls that settle instantly on Monad blockchain</p>
              </div>
              
              {/* Create New Poll - WORKING with Backend */}
              <div className="create-poll-card">
                <h4>Create a Poll</h4>
                <input
                  type="text"
                  placeholder="What's your question? (e.g., Which feature should we build next?)"
                  className="poll-question-input"
                  maxLength={200}
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
                
                <div className="poll-options">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="poll-option-input-container">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        className="poll-option-input"
                        maxLength={100}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          className="remove-option-btn"
                          onClick={() => {
                            const newOptions = pollOptions.filter((_, i) => i !== index);
                            setPollOptions(newOptions);
                          }}
                          title="Remove this option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {pollOptions.length < 4 && (
                    <button 
                      className="add-option-btn"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                    >
                      + Add Option
                    </button>
                  )}
                </div>
                
                <div className="poll-duration">
                  <label>Poll Duration:</label>
                  <select 
                    className="poll-duration-select"
                    value={pollDuration}
                    onChange={(e) => setPollDuration(Number(e.target.value))}
                  >
                    <option value="1">1 Hour</option>
                    <option value="24">24 Hours</option>
                    <option value="168">1 Week</option>
                  </select>
                </div>
                
                <button 
                  className="create-poll-btn" 
                  disabled={!isCorrectNetwork || isCreatingPoll || !pollQuestion.trim()}
                  onClick={handleCreatePoll}
                >
                  {isCreatingPoll ? '⏳ Creating Poll...' : '🗳️ Create Poll (0.001 MON)'}
                </button>
              </div>
              
              {/* Real Polls from Backend with REAL-TIME VOTING and DELETE option */}
              <div className="polls-list">
                {pollsLoading ? (
                  <div className="loading-state">
                    <p>Loading polls...</p>
                  </div>
                ) : polls.length === 0 ? (
                  <div className="empty-state">
                    <p>No polls yet. Be the first to create a poll!</p>
                  </div>
                ) : (
                  polls.map((poll) => (
                    <div key={poll.id} className="poll-item">
                      <div className="poll-header-info">
                        <div className="poll-title-section">
                          <h4>{poll.question}</h4>
                          {isAccountValid() && poll.author.toLowerCase() === getAccountAddress().toLowerCase() && (
                            <button 
                              className="delete-poll-btn"
                              onClick={() => handleDeletePoll(poll.id)}
                              disabled={deletingPoll === poll.id}
                              title="Delete this poll"
                            >
                              {deletingPoll === poll.id ? '⏳' : '🗑️'}
                            </button>
                          )}
                        </div>
                        <div className="poll-author">
                          By {getDisplayName(poll.author, poll.authorProfile)}
                        </div>
                      </div>
                      
                      <div className="poll-options-display">
                        {poll.options.map((option) => (
                          <div key={option.id} className="poll-option">
                            <div className="option-header">
                              <span className="option-text">{option.text}</span>
                              {poll.isActive && isAccountValid() && !option.voters.includes(getAccountAddress().toLowerCase()) && (
                                <button 
                                  className="vote-option-btn"
                                  onClick={() => handleVotePoll(poll.id, option.id)}
                                  disabled={!isConnected || !isCorrectNetwork}
                                >
                                  Vote
                                </button>
                              )}
                              {isAccountValid() && option.voters.includes(getAccountAddress().toLowerCase()) && (
                                <span className="user-voted">✅ Your Vote</span>
                              )}
                            </div>
                            <div className="vote-bar">
                              <div 
                                className="vote-fill" 
                                style={{width: `${option.percentage}%`}}
                              ></div>
                            </div>
                            <span className="vote-count">{option.percentage}% ({option.votes} votes)</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="poll-footer">
                        <span className="poll-status">
                          {poll.isActive ? '🟢 Active' : '🔴 Ended'} • {poll.totalVotes} total votes
                        </span>
                        {isAccountValid() && poll.options.some(opt => opt.voters.includes(getAccountAddress().toLowerCase())) && (
                          <span className="voted-indicator">✅ You voted</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Profile View */}
          {currentView === 'profile' && userProfile && (
            <div className="profile-card">
              <h3>Your MonadSocial Profile</h3>
              
              {/* Current Profile Display */}
              {!isEditingProfile && (
                <div className="current-profile">
                  {(userProfile as UserProfile).profilePhoto ? (
                    <img 
                      src={(userProfile as UserProfile).profilePhoto!} 
                      alt={(userProfile as UserProfile).displayName} 
                      className="profile-photo-large"
                    />
                  ) : (
                    <div className="profile-avatar-large">
                      {(userProfile as UserProfile).displayName?.[0]?.toUpperCase() || getAccountAddress().slice(-2).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="profile-info">
                    <h4>{(userProfile as UserProfile).displayName}</h4>
                    <p className="profile-address">{formatAddress(getAccountAddress())}</p>
                    {(userProfile as UserProfile).bio && <p className="profile-bio">"{(userProfile as UserProfile).bio}"</p>}
                    <p className="profile-joined">
                      Joined {new Date((userProfile as UserProfile).joinedDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button 
                    className="edit-profile-btn"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileForm({
                        displayName: (userProfile as UserProfile).displayName || '',
                        profilePhoto: null,
                        bio: (userProfile as UserProfile).bio || ''
                      });
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              {/* NEW: Saved Posts Section */}
              {!isEditingProfile && savedPosts.length > 0 && (
                <div className="saved-posts-section">
                  <h4>Saved Posts ({savedPosts.length})</h4>
                  <div className="saved-posts-grid">
                    {savedPosts.map(postId => {
                      const savedPost = typedPosts.find(p => p.id === postId);
                      if (!savedPost) return null;
                      
                      return (
                        <div key={postId} className="saved-post-card">
                          <div className="saved-post-header">
                            <div className="saved-post-author">
                              {savedPost.authorProfile?.profilePhoto ? (
                                <img 
                                  src={savedPost.authorProfile.profilePhoto} 
                                  alt={savedPost.authorProfile.displayName || 'User'} 
                                  className="saved-author-photo"
                                />
                              ) : (
                                <div className="saved-author-avatar">
                                  {savedPost.authorProfile?.displayName?.[0]?.toUpperCase() || savedPost.author.slice(-2).toUpperCase()}
                                </div>
                              )}
                              <div className="saved-author-info">
                                <span className="saved-author-name">
                                  {getDisplayName(savedPost.author, savedPost.authorProfile)}
                                </span>
                                <span className="saved-post-time">{formatTime(savedPost.timestamp)}</span>
                              </div>
                            </div>
                            <button 
                              className="unsave-btn"
                              onClick={() => handleSavePost(postId)}
                              title="Remove from saved"
                            >
                              ❤️
                            </button>
                          </div>
                          
                          <div className="saved-post-content">
                            {renderFormattedText(savedPost.content.slice(0, 150) + (savedPost.content.length > 150 ? '...' : ''))}
                          </div>
                          
                          {savedPost.photo && (
                            <div className="saved-post-image">
                              <img src={savedPost.photo} alt="Post content" />
                            </div>
                          )}
                          
                          <div className="saved-post-stats">
                            <span className="saved-stat">❤️ {savedPost.likes}</span>
                            <span className="saved-stat">💬 {savedPost.comments}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Profile Setup/Edit Form */}
              {(!userProfile || isEditingProfile) && (
                <div className="profile-edit-form">
                  <h4>{userProfile ? 'Update Profile (Blockchain Transaction Required)' : 'Create Your MonadSocial Identity'}</h4>
                  
                  {/* Blockchain Fee Notice */}
                  <div className="blockchain-fee-notice">
                    <div className="fee-info-card">
                      <div className="fee-icon">⛽</div>
                      <div className="fee-details">
                        <h5>Blockchain Transaction Required</h5>
                        <p>Profile updates cost <strong>0.001 MON</strong> to secure your identity on Monad blockchain</p>
                        <p>This creates permanent, verifiable social identity and increases network activity</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Profile Photo */}
                  <div className="form-group">
                    <label>Profile Photo</label>
                    <div className="profile-photo-upload">
                      {profilePhotoPreview ? (
                        <img 
                          src={profilePhotoPreview} 
                          alt="Preview" 
                          className="profile-photo-preview"
                        />
                      ) : (userProfile as UserProfile)?.profilePhoto ? (
                        <img 
                          src={(userProfile as UserProfile).profilePhoto!}
                          alt="Current" 
                          className="profile-photo-preview"
                        />
                      ) : (
                        <div className="profile-photo-placeholder">
                          {profileForm.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      
                      <div className="upload-controls">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoSelect}
                          className="photo-input"
                          id="profile-photo-input"
                          disabled={isUpdatingProfile}
                        />
                        <label htmlFor="profile-photo-input" className="photo-upload-btn">
                          📸 {profilePhotoPreview || (userProfile as UserProfile)?.profilePhoto ? 'Change' : 'Add'} Photo
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Display Name */}
                  <div className="form-group">
                    <label htmlFor="display-name">Display Name * (Stored on Blockchain)</label>
                    <input
                      id="display-name"
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Your unique MonadSocial username"
                      maxLength={50}
                      className="profile-input"
                      disabled={isUpdatingProfile}
                    />
                    <small className="input-helper">This will be your permanent identity on MonadSocial</small>
                  </div>
                  
                  {/* Bio */}
                  <div className="form-group">
                    <label htmlFor="bio">Bio (optional)</label>
                    <textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell the Monad community about yourself..."
                      maxLength={200}
                      className="profile-textarea"
                      rows={3}
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="profile-form-actions">
                    <button 
                      className="save-profile-btn"
                      onClick={handleUpdateProfile}
                      disabled={!profileForm.displayName.trim() || isUpdatingProfile || !isCorrectNetwork}
                    >
                      {isUpdatingProfile ? '⏳ Creating Blockchain Transaction...' : 
                       !isCorrectNetwork ? 'Switch to Monad Testnet' :
                       userProfile ? '💰 Update Profile (0.001 MON)' : '💰 Create Profile (0.001 MON)'}
                    </button>
                    
                    {isEditingProfile && (
                      <button 
                        className="cancel-edit-btn"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileForm({ displayName: '', profilePhoto: null, bio: '' });
                          setProfilePhotoPreview('');
                        }}
                        disabled={isUpdatingProfile}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  
                  {/* Transaction History */}
                  {(userProfile as UserProfile)?.txHash && (
                    <div className="profile-tx-info">
                      <h5>Blockchain Verification</h5>
                      <p>Profile secured on Monad blockchain</p>
                      <p>Transaction: <code>{(userProfile as UserProfile).txHash?.slice(0, 20)}...</code></p>
                      <p>Block: <code>#{(userProfile as UserProfile).blockNumber}</code></p>
                      <p>Fee Paid: <code>{(userProfile as UserProfile).profileFeesPaid}</code></p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Profile Stats */}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-label">Your Posts</span>
                  <span className="stat-value">{userPostCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Saved Posts</span>
                  <span className="stat-value">{savedPosts.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Network</span>
                  <span className={`stat-value ${isCorrectNetwork ? '' : 'text-red-400'}`}>
                    {isCorrectNetwork ? 'Monad Testnet ✅' : 'Wrong Network ⚠️'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
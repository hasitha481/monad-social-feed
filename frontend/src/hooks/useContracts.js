import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, POST_ABI } from '../contracts/abis';

const SERVER_URL = 'https://monad-social-backend.onrender.com';



export const useContracts = (signer, account) => {
  const [posts, setPosts] = useState([]);
  const [userPostCount, setUserPostCount] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [profileCache, setProfileCache] = useState({});

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('API call failed:', err);
      if (err.message.includes('fetch')) {
        throw new Error('Server unavailable - check Render backend at https://monad-social-backend.onrender.com');
      }
      throw err;
    }
  };

  // Contract instance
  const getPostContract = useCallback(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.POST, POST_ABI, signer);
    } catch (err) {
      console.error('Error creating contract:', err);
      return null;
    }
  }, [signer]);

  // Get user profile
  const getUserProfile = useCallback(async (address) => {
    if (!address) return null;
    
    if (profileCache[address]) {
      return profileCache[address];
    }

    try {
      const profile = await apiCall(`/profiles/${address}`);
      setProfileCache(prev => ({ ...prev, [address]: profile }));
      return profile;
    } catch (err) {
      console.log(`No profile found for ${address}, using defaults`);
      const defaultProfile = {
        address: address,
        displayName: `User ${address.slice(-4)}`,
        profilePhoto: null,
        bio: '',
        joinedDate: new Date().toISOString()
      };
      setProfileCache(prev => ({ ...prev, [address]: defaultProfile }));
      return defaultProfile;
    }
  }, [profileCache]);

  // Load current user's profile
  const loadUserProfile = useCallback(async () => {
    if (!account) return;
    
    try {
      const profile = await getUserProfile(account);
      setUserProfile(profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  }, [account, getUserProfile]);

  // FIXED: Update user profile with simple blockchain transaction (no data)
  const updateUserProfile = async (profileData) => {
    if (!account || !signer) throw new Error('Wallet not connected');

    try {
      setLoading(true);
      setError(null);
      
      console.log('Creating profile update transaction...');
      
      // Simple transaction without data (fixes MetaMask error)
      const tx = await signer.sendTransaction({
        to: account, // Self-transaction
        value: ethers.parseEther('0.001'), // 0.001 MON fee
        // NO DATA FIELD - this was causing the error
      });
      
      console.log('Profile blockchain transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Profile transaction confirmed:', receipt.hash);

      // Save to server with transaction hash
      const updatedProfile = {
        address: account,
        displayName: profileData.displayName || `User ${account.slice(-4)}`,
        profilePhoto: profileData.profilePhoto || null,
        bio: profileData.bio || '',
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        profileFeesPaid: '0.001 MON'
      };

      await apiCall(`/profiles/${account}`, {
        method: 'POST',
        body: JSON.stringify(updatedProfile)
      });

      setUserProfile(updatedProfile);
      setProfileCache(prev => ({ ...prev, [account]: updatedProfile }));
      
      console.log('Profile updated successfully');
      return { 
        success: true, 
        txHash: tx.hash,
        feePaid: '0.001 MON'
      };
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load all posts with enhanced profile data
  const loadAllPosts = useCallback(async () => {
    try {
      console.log('Loading posts from server...');
      setLoading(true);
      
      const serverPosts = await apiCall('/posts');
      console.log('Loaded posts from server:', serverPosts.length);
      
      // Enhance posts with user profile data
      const enhancedPosts = await Promise.all(serverPosts.map(async (post) => {
        const authorProfile = await getUserProfile(post.author);
        
        return {
          ...post,
          authorProfile: authorProfile,
          userHasLiked: account ? 
            (post.likedBy && post.likedBy.includes(account.toLowerCase())) : 
            false,
          timestamp: post.timestamp || Math.floor(Date.now() / 1000)
        };
      }));

      const sortedPosts = enhancedPosts.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(sortedPosts);
      setTotalPosts(sortedPosts.length);
      
      if (account) {
        const userPosts = sortedPosts.filter(
          post => post.author && post.author.toLowerCase() === account.toLowerCase()
        );
        setUserPostCount(userPosts.length);
      } else {
        setUserPostCount(0);
      }
      
      setError(null);
      setLastUpdate(Date.now());
      console.log('Posts loaded with profiles:', sortedPosts.length);
      
    } catch (err) {
      console.error('Error loading posts:', err);
      setError(err.message);
      setPosts([]);
      setTotalPosts(0);
      setUserPostCount(0);
    } finally {
      setLoading(false);
    }
  }, [account, getUserProfile]);

  // Create post with blockchain transaction
  const createPost = async (content, photoFile) => {
    if (!signer || !content.trim()) {
      throw new Error('Missing signer or content');
    }

    try {
      setLoading(true);
      setError(null);
      
      const postContract = getPostContract();
      if (!postContract) {
        throw new Error('Contract not available');
      }

      console.log('Creating post on blockchain...');
      
      let photoData = null;
      if (photoFile) {
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new Error('Image too large (max 5MB)');
        }
        
        const reader = new FileReader();
        photoData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }
      
      const tx = await postContract.createPost(content, {
        value: ethers.parseEther('0.001')
      });
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      const newPost = {
        id: `${account}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        content: content,
        photo: photoData,
        author: account,
        timestamp: Math.floor(Date.now() / 1000),
        likes: 0,
        likedBy: [],
        comments: 0,
        commentsList: [],
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };

      console.log('Saving post to server...');
      await apiCall('/posts', {
        method: 'POST',
        body: JSON.stringify(newPost)
      });
      
      await loadAllPosts();
      
      console.log('Post created and synced successfully');
      return { success: true, txHash: tx.hash };

    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Like post with server sync
  const likePost = useCallback(async (postId) => {
    if (!account) throw new Error('Wallet not connected');

    try {
      console.log('Toggling like for post:', postId);
      
      await apiCall(`/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ user: account.toLowerCase() })
      });

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          const userAddress = account.toLowerCase();
          const currentLikedBy = post.likedBy || [];
          const hasLiked = currentLikedBy.includes(userAddress);
          
          return {
            ...post,
            likes: hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1,
            likedBy: hasLiked 
              ? currentLikedBy.filter(addr => addr !== userAddress)
              : [...currentLikedBy, userAddress],
            userHasLiked: !hasLiked
          };
        }
        return post;
      }));

      console.log('Like toggled successfully');
      return { success: true };

    } catch (err) {
      console.error('Error liking post:', err);
      loadAllPosts();
      throw err;
    }
  }, [account, loadAllPosts]);

  // Add comment with server sync
  const addComment = useCallback(async (postId, commentText) => {
    if (!account || !commentText.trim()) {
      throw new Error('Account or comment text missing');
    }

    try {
      console.log('Adding comment to server...');
      
      const commentData = {
        id: `${postId}_${account}_${Date.now()}`,
        postId: postId,
        author: account,
        text: commentText.trim(),
        timestamp: Math.floor(Date.now() / 1000)
      };

      await apiCall(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(commentData)
      });

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          const updatedComments = [...(post.commentsList || []), commentData];
          return {
            ...post,
            comments: updatedComments.length,
            commentsList: updatedComments
          };
        }
        return post;
      }));

      console.log('Comment added successfully');
      return { success: true };

    } catch (err) {
      console.error('Error adding comment:', err);
      loadAllPosts();
      throw err;
    }
  }, [account, loadAllPosts]);

  // Delete post with server sync
  const deletePost = useCallback(async (postId) => {
    if (!account) throw new Error('Wallet not connected');

    try {
      await apiCall(`/posts/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({ user: account.toLowerCase() })
      });

      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      await loadAllPosts();
      
      console.log('Post deleted successfully');
      return { success: true };

    } catch (err) {
      console.error('Error deleting post:', err);
      throw err;
    }
  }, [account, loadAllPosts]);

  // Utility functions
  const hasUserLiked = useCallback((post) => {
    if (!account || !post || !Array.isArray(post.likedBy)) return false;
    return post.likedBy.includes(account.toLowerCase());
  }, [account]);

  const canDeletePost = useCallback((post) => {
    if (!account || !post || !post.author) return false;
    return post.author.toLowerCase() === account.toLowerCase();
  }, [account]);

  const refreshData = useCallback(() => {
    console.log('Refreshing data from server...');
    loadAllPosts();
    loadUserProfile();
  }, [loadAllPosts, loadUserProfile]);

  const debugStorage = useCallback(() => {
    console.log('=== SERVER CONNECTION DEBUG ===');
    console.log('Server URL:', SERVER_URL);
    console.log('Current account:', account);
    console.log('Current user profile:', userProfile);
    console.log('Total posts loaded:', posts.length);
    console.log('User posts:', userPostCount);
    
    fetch(`${SERVER_URL}/posts`)
      .then(response => {
        console.log('Server response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Server posts:', data.length);
      })
      .catch(err => {
        console.error('Server connection failed:', err.message);
        console.log('Make sure backend server is running: cd backend && node server.js');
      });
  }, [account, userProfile, posts.length, userPostCount]);

  // Auto-refresh and profile loading
  useEffect(() => {
    if (!account) return;

    console.log('Loading user data for account:', account.slice(0, 8));
    loadAllPosts();
    loadUserProfile();
    
    const interval = setInterval(() => {
      loadAllPosts();
    }, 10000);

    return () => clearInterval(interval);
  }, [account, loadAllPosts, loadUserProfile]);

  return {
    posts,
    userPostCount,
    totalPosts,
    loading,
    error,
    lastUpdate,
    userProfile,
    createPost,
    deletePost,
    likePost,
    addComment,
    hasUserLiked,
    canDeletePost,
    refreshData,
    debugStorage,
    updateUserProfile,
    getUserProfile
  };
};